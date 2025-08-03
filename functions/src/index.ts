import {WebClient} from '@slack/web-api';
import {initializeApp} from 'firebase-admin/app';
import {getFunctions} from 'firebase-admin/functions';
import {GoogleAuth} from 'google-auth-library';
import {
	type CollectionReference,
	type DocumentReference,
	getFirestore,
	type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {defineString} from 'firebase-functions/params';
import {info as logInfo, error as logError} from 'firebase-functions/logger';
import {
	type AuthUserRecord,
	beforeUserCreated,
	beforeUserSignedIn,
	HttpsError,
} from 'firebase-functions/identity';
import {user as authUser} from 'firebase-functions/v1/auth';
import type {
	SlackUserInfo,
	Submission,
	Task,
	TaskDatum,
	User,
} from '../../src/lib/schema.d.ts';
import {onDocumentCreated} from 'firebase-functions/firestore';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

const app = initializeApp();
const db = getFirestore(app);

const SLACK_TOKEN = defineString('SLACK_TOKEN');

const slack = new WebClient(SLACK_TOKEN.value());

let auth: GoogleAuth | null = null;
async function getFunctionUrl(name: string, location = 'us-central1') {
	if (!auth) {
		auth = new GoogleAuth({
			scopes: 'https://www.googleapis.com/auth/cloud-platform',
		});
	}
	const projectId = await auth.getProjectId();
	const url =
		'https://cloudfunctions.googleapis.com/v2beta/' +
		`projects/${projectId}/locations/${location}/functions/${name}`;

	const client = await auth.getClient();
	const res = await client.request<{serviceConfig: {uri: string}}>({url});
	const uri = res.data?.serviceConfig?.uri;
	if (!uri) {
		throw new Error(`Unable to retreive uri for function at ${url}`);
	}
	return uri;
}

const checkSlackTeamEligibility = async (user: AuthUserRecord) => {
	logInfo('Checking Slack team eligibility');
	logInfo(user, {structuredData: true});

	const slackUserInfosRef = db.collection(
		'slackUserInfo',
	) as CollectionReference<SlackUserInfo>;

	let isUserFound = false;

	for (const providerData of user.providerData) {
		if (providerData.providerId === 'oidc.slack') {
			const slackId = providerData.uid;
			try {
				const response = await slack.users.info({user: slackId});
				if (response.user) {
					await slackUserInfosRef.doc(user.uid).set(response.user);
					isUserFound = true;
					break;
				}
			} catch (error) {
				logError(error, {structuredData: true});
			}
		}
	}

	if (!isUserFound) {
		throw new HttpsError(
			'permission-denied',
			'The user is not found in valid Slack team.',
		);
	}
};

export const beforeUserCreatedBlockingFunction = beforeUserCreated(
	async (event) => {
		if (!event.data) {
			throw new HttpsError('invalid-argument', 'No data provided.');
		}

		await checkSlackTeamEligibility(event.data);
	},
);

export const beforeUserSignInBlockingFunction = beforeUserSignedIn(
	async (event) => {
		if (!event.data) {
			throw new HttpsError('invalid-argument', 'No data provided.');
		}

		await checkSlackTeamEligibility(event.data);
	},
);

// Firebase Functions v2 does not support onCreate for user creation events yet
export const onUserCreated = authUser().onCreate(async (user) => {
	await db.runTransaction(async (transaction) => {
		const userRef = db
			.collection('users')
			.doc(user.uid) as DocumentReference<User>;
		const userData = await transaction.get(userRef);
		if (userData.exists) {
			return;
		}

		const slackId = user.providerData.find(
			(provider) => provider.providerId === 'oidc.slack',
		)?.uid;

		transaction.set(userRef, {
			displayName: user.displayName ?? '',
			photoURL: user.photoURL ?? '',
			slug: user.uid,
			slackId: slackId ?? '',
			acknowledged: true,
		});
	});
});

interface ExecuteSubmissionData {
	taskId: string;
	submissionId: string;
}

const Tasks = db.collection('tasks') as CollectionReference<Task>;
const TaskData = db.collection('taskData') as CollectionReference<TaskDatum>;

export const onSubmissionCreated = onDocumentCreated(
	'submissions/{submissionId}',
	async (event) => {
		if (!event.data?.exists) {
			return;
		}

		const snapshot = event.data as QueryDocumentSnapshot<Submission>;
		const submission = snapshot.data();
		const taskId = submission?.task;
		const changedSubmissionId = event.params.submissionId;

		if (!taskId) {
			logError(
				`Submission ${changedSubmissionId} does not have a valid task ID.`,
			);
			return;
		}

		const taskDoc = await Tasks.doc(taskId).get();
		const task = taskDoc.data();

		if (!task) {
			logError(`Submission ${changedSubmissionId} does not have a valid task.`);
			return;
		}

		const taskDataDoc = await TaskData.doc(taskId).get();
		const taskData = taskDataDoc.data();

		if (!taskData) {
			logError(
				`Submission ${changedSubmissionId} does not have valid task data.`,
			);
			return;
		}

		logInfo(
			`New submission: id = ${snapshot.id}, user = ${submission.user}, task = ${taskId}, code size = ${submission.size}`,
		);
		const queue =
			getFunctions().taskQueue<ExecuteSubmissionData>('executeSubmission');
		const targetUri = await getFunctionUrl('executeSubmission');

		logInfo(`Target URI for task queue: ${targetUri}`);

		queue.enqueue(
			{
				taskId,
				submissionId: changedSubmissionId,
			},
			{
				scheduleDelaySeconds: 0,
				dispatchDeadlineSeconds: 60 * 5,
				uri: targetUri,
			},
		);

		logInfo(`Enqueued task for submission ${changedSubmissionId}`);
	},
);

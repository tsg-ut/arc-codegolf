import {WebClient} from '@slack/web-api';
import {initializeApp} from 'firebase-admin/app';
import {getFunctions} from 'firebase-admin/functions';
import {GoogleAuth} from 'google-auth-library';
import {
	type CollectionReference,
	type DocumentReference,
	getFirestore,
	type QueryDocumentSnapshot,
	FieldValue,
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
import {
	onDocumentCreated,
	onDocumentUpdated,
} from 'firebase-functions/firestore';
import {countBy} from 'remeda';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

const app = initializeApp();
const db = getFirestore(app);

const Tasks = db.collection('tasks') as CollectionReference<Task>;
const TaskData = db.collection('taskData') as CollectionReference<TaskDatum>;
const Users = db.collection('users') as CollectionReference<User>;

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
			colorIndex: null,
			contributions: 0,
			shortestSubmissions: 0,
		});
	});
});

interface ExecuteSubmissionData {
	taskId: string;
	submissionId: string;
}

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

		// Check if the submitted code is shorter than the current best
		if (task.bytes !== null && submission.size >= task.bytes) {
			logError(
				`Submission ${changedSubmissionId} is not shorter than current best (${submission.size} >= ${task.bytes}). Rejecting submission.`,
			);

			// Update submission status to rejected
			await db
				.collection('submissions')
				.doc(changedSubmissionId)
				.update({
					status: 'rejected',
					executedAt: FieldValue.serverTimestamp(),
					results: [
						{
							testCaseId: 'validation',
							input: '',
							expected: '',
							actual: '',
							status: 'rejected' as const,
							errorMessage: `Code must be shorter than current best solution (${task.bytes} bytes)`,
							contributions: 0,
						},
					],
				});
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

export const onSubmissionStatusChanged = onDocumentUpdated(
	'submissions/{submissionId}',
	async (event) => {
		if (!event.data?.before?.exists || !event.data?.after?.exists) {
			return;
		}

		const beforeData = event.data.before.data() as Submission;
		const afterData = event.data.after.data() as Submission;
		const submissionId = event.params.submissionId;

		// Check if status changed from running to accepted or rejected
		if (beforeData.status === 'running' && afterData.status === 'accepted') {
			logInfo(
				`Submission ${submissionId} status changed from running to accepted`,
			);

			await handleAcceptedSubmission(submissionId, afterData);
		}
	},
);

interface SubmissionUpdateResult {
	updated: boolean;
	contributions: number;
}

async function handleAcceptedSubmission(
	submissionId: string,
	submission: Submission,
) {
	logInfo(`Handling accepted submission: ${submissionId}`);

	try {
		const results = await db.runTransaction<SubmissionUpdateResult>(
			async (transaction) => {
				const taskRef = Tasks.doc(submission.task);
				const taskDoc = await transaction.get(taskRef);

				if (!taskDoc.exists) {
					logError(
						`Task ${submission.task} not found for accepted submission ${submissionId}`,
					);
					return {
						updated: false,
						contributions: 0,
					};
				}

				const task = taskDoc.data() as Task;

				// Update task with new best submission if this is shorter
				if (task.bytes === null || submission.size < task.bytes) {
					logInfo(
						`New best submission for task ${submission.task}: ${submissionId} (${submission.size} bytes)`,
					);

					const previousScore =
						task.bytes === null ? 0 : Math.max(1, 2500 - task.bytes);
					const newScore = Math.max(1, 2500 - submission.size);

					const contributions = newScore - previousScore;

					transaction.update(taskRef, {
						bestSubmission: submissionId,
						bytes: submission.size,
						owner: submission.user,
						ownerLastChangedAt: submission.executedAt,
					});

					return {
						updated: true,
						contributions,
					};
				}

				return {
					updated: false,
					contributions: 0,
				};
			},
		);

		if (results.updated) {
			// Assign user color index
			await db.runTransaction(async (transaction) => {
				const submissionUserRef = Users.doc(submission.user);
				const userDoc = await transaction.get(submissionUserRef);
				const userData = userDoc.data();
				if (userData === undefined) {
					logError(
						`User ${submission.user} not found for accepted submission ${submissionId}`,
					);
					return;
				}

				if (userData.colorIndex !== null) {
					logInfo(`User ${submission.user} already has a color index.`);
					return;
				}

				const users = await Users.get();
				const userColors = users.docs.map((doc) => doc.data().colorIndex);

				// Find the minimum unassigned non-negative integer
				const assignedColors = new Set(userColors.filter((c) => c !== null));
				let colorIndex = 0;
				while (assignedColors.has(colorIndex)) {
					colorIndex++;
				}

				transaction.update(Users.doc(submission.user), {
					colorIndex,
				});
			});

			// Update user's contribution
			await db.runTransaction(async (transaction) => {
				const userRef = Users.doc(submission.user);
				const userDoc = await transaction.get(userRef);
				const userData = userDoc.data();
				if (userData === undefined) {
					logError(
						`User ${submission.user} not found for accepted submission ${submissionId}`,
					);
					return;
				}

				transaction.update(userRef, {
					contributions: userData.contributions + results.contributions,
				});
			});

			// Re-calculate shortest submissions counts
			await db.runTransaction(async (transaction) => {
				const tasks = await Tasks.get();

				const shortestSubmissions = countBy(
					tasks.docs,
					(task) => task.data().owner ?? undefined,
				);

				for (const [userId, count] of Object.entries(shortestSubmissions)) {
					transaction.update(Users.doc(userId), {
						shortestSubmissions: count,
					});
				}
			});
		}
	} catch (error) {
		logError(`Error handling accepted submission ${submissionId}:`, error);
	}
}

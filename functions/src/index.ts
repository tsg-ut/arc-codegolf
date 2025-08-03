import {WebClient} from '@slack/web-api';
import {initializeApp} from 'firebase-admin/app';
import {
	type CollectionReference,
	type DocumentReference,
	getFirestore,
} from 'firebase-admin/firestore';
import {defineString} from 'firebase-functions/params';
import {info as logInfo, error as logError} from 'firebase-functions/logger';
import {type AuthUserRecord, HttpsError} from 'firebase-functions/identity';
import {user as authUser} from 'firebase-functions/v1/auth';
import type {SlackUserInfo, User} from '../../src/lib/schema.d.ts';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

const app = initializeApp();
const db = getFirestore(app);

const SLACK_TOKEN = defineString('SLACK_TOKEN');

const slack = new WebClient(SLACK_TOKEN.value());

const _checkSlackTeamEligibility = async (user: AuthUserRecord) => {
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

/*
export const beforeUserCreatedBlockingFunction = beforeUserCreated(async (event) => {
	if (!event.data) {
		throw new HttpsError('invalid-argument', 'No data provided.');
	}

	await checkSlackTeamEligibility(event.data);
});

export const beforeUserSignInBlockingFunction = beforeUserSignedIn(async (event) => {
	if (!event.data) {
		throw new HttpsError('invalid-argument', 'No data provided.');
	}

	await checkSlackTeamEligibility(event.data);
});
*/

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

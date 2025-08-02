import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';
import type {User as SlackUser} from '@slack/web-api/dist/types/response/UsersInfoResponse.d.ts';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Task extends DocumentData {
	uid: string;
	task: string;
	createdAt: Timestamp;
}

export interface SlackUserInfo extends DocumentData, SlackUser {}

export interface User extends DocumentData {
	displayName: string;
	photoURL: string;
	slug: string;
	slackId: string;
	acknowledged: boolean;
}

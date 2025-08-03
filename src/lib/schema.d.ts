import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';
import type {User as SlackUser} from '@slack/web-api/dist/types/response/UsersInfoResponse.d.ts';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Task extends DocumentData {
	owner: string | null;
	ownerLastChangedAt: Timestamp | null;
	bestSubmission: string | null;
	bytes: number | null;
}

export type SubmissionStatus = 'pending' | 'running' | 'accepted' | 'rejected';

export interface Submission extends DocumentData {
	user: string;
	task: string;
	code: string;
	size: number;
	createdAt: Timestamp;
	executedAt: Timestamp | null;
	status: SubmissionStatus;
}

export interface SlackUserInfo extends DocumentData, SlackUser {}

export interface User extends DocumentData {
	displayName: string;
	photoURL: string;
	slug: string;
	slackId: string;
	acknowledged: boolean;
}

export interface TaskDatum extends DocumentData {
	[subset: string]: {
		input: string;
		output: string;
	}[];
}

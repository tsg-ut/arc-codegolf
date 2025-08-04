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
	arcTaskId: string | null;
}

export type SubmissionStatus = 'pending' | 'running' | 'accepted' | 'rejected';

export type TestcaseStatus = 'accepted' | 'rejected';

export interface SubmissionTestcase {
	testCaseId: string;
	input: string;
	expected: string;
	actual: string;
	status: TestcaseStatus;
	errorMessage: string | null;
	contributions: number;
}

export interface Submission extends DocumentData {
	user: string;
	task: string;
	code: string;
	size: number;
	createdAt: Timestamp;
	executedAt: Timestamp | null;
	status: SubmissionStatus;
	results: SubmissionTestcase[];
}

export interface SlackUserInfo extends DocumentData, SlackUser {}

export interface User extends DocumentData {
	displayName: string;
	photoURL: string;
	slug: string;
	slackId: string;
	acknowledged: boolean;
	colorIndex: number | null;
}

export interface TaskDatum extends DocumentData {
	[subset: string]: {
		input: string;
		output: string;
	}[];
}

export interface ShortestSubmissionsRankingEntry extends DocumentData {
	user: string;
	count: number;
}

export interface ContributionRankingEntry extends DocumentData {
	user: string;
	contributions: number;
}

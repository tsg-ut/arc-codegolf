import {isServer} from 'solid-js/web';
import {initializeApp} from 'firebase/app';
import {
	connectAuthEmulator,
	getAuth,
	OAuthProvider,
	signInWithPopup,
} from 'firebase/auth';
import {connectStorageEmulator, getStorage} from 'firebase/storage';
import {
	getFirestore,
	collection,
	type CollectionReference,
	connectFirestoreEmulator,
} from 'firebase/firestore';
import type {Submission, Task, TaskDatum, User} from './schema.ts';

const firebaseConfigResponse = await fetch('/__/firebase/init.json');
const firebaseConfig = await firebaseConfigResponse.json();

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);

if (import.meta.env.DEV && !isServer) {
	connectFirestoreEmulator(db, 'localhost', 8080);
	connectAuthEmulator(auth, 'http://localhost:9099');
	connectStorageEmulator(storage, 'localhost', 9199);
}

const Tasks = collection(db, 'tasks') as CollectionReference<Task>;
const TaskData = collection(db, 'taskData') as CollectionReference<TaskDatum>;
const Submissions = collection(
	db,
	'submissions',
) as CollectionReference<Submission>;
const Users = collection(db, 'users') as CollectionReference<User>;

const slackProvider = new OAuthProvider('oidc.slack');
const scopes = ['openid', 'profile', 'email'];
for (const scope of scopes) {
	slackProvider.addScope(scope);
}

export const signIn = async () => {
	await signInWithPopup(auth, slackProvider);
};

export const signOut = async () => {
	await auth.signOut();
};

export {app as default, auth, db, storage, Tasks, TaskData, Submissions, Users};

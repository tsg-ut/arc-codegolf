import type {Component} from 'solid-js';
import {auth, signOut, Tasks} from '~/lib/firebase';
import {useAuth, useFirestore} from 'solid-firebase';
import {Container} from 'solid-bootstrap';
import Collection from '~/lib/Collection';

import styles from './index.module.css';

const getTaskNo = (taskId: string) => {
	const match = taskId.match(/task(\d+)/);
	return match ? Number.parseInt(match[1]) : null;
};

const Index: Component = () => {
	const authState = useAuth(auth);
	const tasks = useFirestore(Tasks);

	return (
		<Container>
			<p>Welcome, {authState.data?.displayName}!</p>
			<div class={styles.taskList}>
				<Collection data={tasks}>
					{(task) => <div class={styles.taskCell}>{getTaskNo(task.id)}</div>}
				</Collection>
			</div>
			<button type="button" onClick={signOut}>
				ログアウト
			</button>
		</Container>
	);
};

export default Index;

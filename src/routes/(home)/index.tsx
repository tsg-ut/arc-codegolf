import {createEffect, type Component} from 'solid-js';
import {signOut, Tasks} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import {Container} from 'solid-bootstrap';
import Collection from '~/lib/Collection';

import styles from './index.module.css';
import {A} from '@solidjs/router';

const getTaskNo = (taskId: string) => {
	const match = taskId.match(/task(\d+)/);
	return match ? Number.parseInt(match[1]) : null;
};

const Index: Component = () => {
	const tasks = useFirestore(Tasks);

	createEffect(() => {
		console.log('Tasks updated:', tasks);
	});

	return (
		<Container>
			<p>
				TSG ARC Codegolf へようこそ！ このサイトでは、
				<A
					href="https://arcprize.org/"
					target="_blank"
					rel="noopener noreferrer"
				>
					ARC
				</A>
				で公開されている問題をPythonで解くコードゴルフコンテストに参加することができます。
			</p>
			<p>
				コンテストの開催期間は<strong>2025年10月23日まで</strong>
				です。目指せ、最強のコードゴルファー！
			</p>
			<div class={styles.taskList}>
				<Collection data={tasks}>
					{(task) => (
						<div class={styles.taskCell}>
							<A href={`/tasks/${task.id}`}>{getTaskNo(task.id)}</A>
						</div>
					)}
				</Collection>
			</div>
			<button type="button" onClick={signOut}>
				ログアウト
			</button>
		</Container>
	);
};

export default Index;

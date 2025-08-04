import {createMemo, type Component} from 'solid-js';
import {Tasks, Users} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import {Container} from 'solid-bootstrap';
import Collection from '~/lib/Collection';

import styles from './index.module.css';
import {A} from '@solidjs/router';
import Doc from '~/lib/Doc';
import type {Task, User} from '~/lib/schema';
import {sumBy} from 'remeda';
import ShortestSubmissionsChart from './ShortestSubmissionsChart';

const getTaskNo = (taskId: string) => {
	const match = taskId.match(/task(\d+)/);
	return match ? Number.parseInt(match[1]) : null;
};

const getTotalScore = (tasks: Task[]) => {
	return sumBy(tasks, (task) => {
		if (task.bytes === null) return 0;
		return Math.max(1, 2500 - task.bytes);
	});
};

const TaskCell: Component<{task: Task; users: User[]}> = (props) => {
	const taskNo = getTaskNo(props.task.id);
	const user = createMemo(() =>
		props.users.find((u) => u.id === props.task.owner),
	);

	return (
		<div
			class={[
				styles.taskCell,
				...(user()?.colorIndex !== undefined
					? [styles[`color-${user()?.colorIndex}`]]
					: [styles['color-default']]),
			].join(' ')}
		>
			<A href={`/tasks/${props.task.id}`}>
				<span class={styles.taskNo}>{taskNo}</span>
				{props.task.bytes !== null && (
					<span class={styles.taskBytes}>{props.task.bytes}</span>
				)}
			</A>
		</div>
	);
};

const Index: Component = () => {
	const tasks = useFirestore(Tasks);
	const users = useFirestore(Users);

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
			<Doc data={users}>
				{(usersData) => (
					<div class={styles.taskList}>
						<Collection data={tasks}>
							{(task) => <TaskCell task={task} users={usersData} />}
						</Collection>
					</div>
				)}
			</Doc>
			<Doc data={tasks}>
				{(tasksData) => (
					<div class={styles.totalScore}>
						Total Score: {getTotalScore(tasksData)}
					</div>
				)}
			</Doc>
			<Doc data={users}>
				{(usersData) => <ShortestSubmissionsChart users={usersData} />}
			</Doc>
		</Container>
	);
};

export default Index;

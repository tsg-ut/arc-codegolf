import {type Component, createMemo} from 'solid-js';
import type {User} from '~/lib/schema';
import styles from './ShortestSubmissionsChart.module.css';
import UserInfo from '~/lib/UserInfo';

interface ShortestSubmissionsChartProps {
	users: User[];
}

const ShortestSubmissionsChart: Component<ShortestSubmissionsChartProps> = (
	props,
) => {
	const sortedUsers = createMemo(() => {
		return props.users
			.filter((user) => user.shortestSubmissions > 0)
			.sort((a, b) => b.shortestSubmissions - a.shortestSubmissions);
	});

	const maxCount = createMemo(() => {
		const users = sortedUsers();
		return users.length > 0 ? users[0].shortestSubmissions : 1;
	});

	return (
		<div class={styles.chartContainer}>
			<h3 class={styles.chartTitle}>Shortest Ranking</h3>
			<div class={styles.chart}>
				{sortedUsers().map((user) => {
					const barWidth = (user.shortestSubmissions / maxCount()) * 100;
					const colorClass =
						user.colorIndex !== null
							? `color-${user.colorIndex}`
							: 'color-default';

					return (
						<div class={styles.barRow}>
							<div class={styles.userInfo}>
								<UserInfo userId={user.id} />
								<span class={styles.userCount}>{user.shortestSubmissions}</span>
							</div>
							<div class={styles.barContainer}>
								<div
									class={`${styles.bar} ${styles[colorClass]}`}
									style={{width: `${barWidth}%`}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default ShortestSubmissionsChart;

import type {Component} from 'solid-js';
import {Container, Table} from 'solid-bootstrap';
import {useFirestore} from 'solid-firebase';
import {Users} from '~/lib/firebase';
import Collection from '~/lib/Collection';
import type {User} from '~/lib/schema';
import {orderBy, query} from 'firebase/firestore';
import styles from './contributions.module.css';
import UserInfo from '~/lib/UserInfo';

const UserRankingRow: Component<{user: User; rank: number}> = (props) => {
	return (
		<tr>
			<td class={styles.rankNumber}>{props.rank}</td>
			<td>
				<UserInfo userId={props.user.id} />
			</td>
			<td class={styles.contributionsCount}>{props.user.contributions}</td>
		</tr>
	);
};

const ContributionsRanking: Component = () => {
	const users = useFirestore(query(Users, orderBy('contributions', 'desc')));

	return (
		<Container>
			<div class={styles.pageHeader}>
				<h1>Contributions Ranking</h1>
				<p class={styles.pageDescription}>
					Users ranked by their contributions to the platform.
				</p>
			</div>

			<Table striped hover>
				<thead>
					<tr>
						<th>Rank</th>
						<th>User</th>
						<th>Contributions</th>
					</tr>
				</thead>
				<tbody>
					<Collection data={users}>
						{(user, index) => <UserRankingRow user={user} rank={index() + 1} />}
					</Collection>
				</tbody>
			</Table>
		</Container>
	);
};

export default ContributionsRanking;

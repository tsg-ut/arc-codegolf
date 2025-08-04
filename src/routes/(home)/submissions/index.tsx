import type {Component} from 'solid-js';
import {Submissions} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import Collection from '~/lib/Collection';
import {orderBy, query} from 'firebase/firestore';
import {A} from '@solidjs/router';
import {Container, Table} from 'solid-bootstrap';
import UserInfo from '~/lib/UserInfo';

const SubmissionsPage: Component = () => {
	const submissions = useFirestore(
		query(Submissions, orderBy('createdAt', 'desc')),
	);

	return (
		<Container>
			<h1>Submissions</h1>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>User</th>
						<th>Task</th>
						<th>Size</th>
						<th>Status</th>
						<th>Submitted At</th>
					</tr>
				</thead>
				<tbody>
					<Collection data={submissions}>
						{(submission) => (
							<tr>
								<td>
									<UserInfo userId={submission.user} />
								</td>
								<td>
									<A href={`/tasks/${submission.task}`}>{submission.task}</A>
								</td>
								<td>{submission.size}</td>
								<td>{submission.status}</td>
								<td>
									<A href={`/submissions/${submission.id}`}>
										{submission.createdAt?.toDate().toLocaleString()}
									</A>
								</td>
							</tr>
						)}
					</Collection>
				</tbody>
			</Table>
		</Container>
	);
};

export default SubmissionsPage;

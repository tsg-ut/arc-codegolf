import type {Component} from 'solid-js';
import {Submissions} from '~/lib/firebase';
import {useFirestore} from 'solid-firebase';
import Collection from '~/lib/Collection';
import {orderBy, query} from 'firebase/firestore';
import {A} from '@solidjs/router';
import {Container, Table} from 'solid-bootstrap';

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
						<th>ID</th>
						<th>Task</th>
						<th>User</th>
						<th>Status</th>
						<th>Size</th>
						<th>Submitted At</th>
					</tr>
				</thead>
				<tbody>
					<Collection data={submissions}>
						{(submission) => (
							<tr>
								<td>
									<A href={`/submissions/${submission.id}`}>{submission.id}</A>
								</td>
								<td>
									<A href={`/tasks/${submission.task}`}>{submission.task}</A>
								</td>
								<td>{submission.user}</td>
								<td>{submission.status}</td>
								<td>{submission.size}</td>
								<td>{submission.createdAt?.toDate().toLocaleString()}</td>
							</tr>
						)}
					</Collection>
				</tbody>
			</Table>
		</Container>
	);
};

export default SubmissionsPage;

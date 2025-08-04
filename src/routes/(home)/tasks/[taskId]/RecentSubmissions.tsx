import {query, where, orderBy, limit} from 'firebase/firestore';
import {useFirestore} from 'solid-firebase';
import {A} from '@solidjs/router';
import {Table, Form} from 'solid-bootstrap';
import Collection from '~/lib/Collection';
import {Submissions} from '~/lib/firebase';
import type {Component} from 'solid-js';
import {createSignal, createMemo} from 'solid-js';

interface RecentSubmissionsProps {
	taskId: string;
}

const RecentSubmissions: Component<RecentSubmissionsProps> = (props) => {
	const [showAcceptedOnly, setShowAcceptedOnly] = createSignal(false);

	const submissionsQuery = createMemo(() => {
		const baseQuery = [
			where('task', '==', props.taskId),
			orderBy('createdAt', 'desc'),
			limit(5),
		];

		if (showAcceptedOnly()) {
			baseQuery.splice(1, 0, where('status', '==', 'accepted'));
		}

		return query(Submissions, ...baseQuery);
	});

	const submissions = useFirestore(submissionsQuery);

	return (
		<div>
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
				<h2>Recent submissions to this task</h2>
				<Form.Check
					type="switch"
					id="accepted-only-switch"
					label="Accepted submissions only"
					checked={showAcceptedOnly()}
					onChange={(e) => setShowAcceptedOnly(e.currentTarget.checked)}
				/>
			</div>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>User</th>
						<th>Size</th>
						<th>Status</th>
						<th>Submitted At</th>
					</tr>
				</thead>
				<tbody>
					<Collection
						data={submissions}
						empty={
							<tr>
								<td colSpan={5}>No submissions yet</td>
							</tr>
						}
					>
						{(submission) => (
							<tr>
								<td>{submission.user}</td>
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
		</div>
	);
};

export default RecentSubmissions;

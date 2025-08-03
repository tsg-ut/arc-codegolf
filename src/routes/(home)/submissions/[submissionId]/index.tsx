import {useParams} from '@solidjs/router';
import {doc} from 'firebase/firestore';
import {Container, Badge, Card, Table} from 'solid-bootstrap';
import {useFirestore} from 'solid-firebase';
import Doc from '~/lib/Doc';
import {Submissions} from '~/lib/firebase';
import {A} from '@solidjs/router';
import {Show} from 'solid-js';

import styles from './index.module.css';

const SubmissionDetail = () => {
	const params = useParams();
	const submission = useFirestore(doc(Submissions, params.submissionId));

	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'accepted':
				return 'success';
			case 'rejected':
				return 'danger';
			case 'running':
				return 'warning';
			case 'pending':
				return 'secondary';
			default:
				return 'primary';
		}
	};

	return (
		<Container>
			<Doc data={submission}>
				{(submissionData) => (
					<div>
						<h1 class={styles.title}>Submission by {submissionData.user}</h1>

						<Card class="mb-3">
							<Card.Header>
								<h3>Submission Details</h3>
							</Card.Header>
							<Card.Body>
								<p>
									<strong>Task:</strong>{' '}
									<A href={`/tasks/${submissionData.task}`}>
										{submissionData.task}
									</A>
								</p>
								<p>
									<strong>User:</strong> {submissionData.user}
								</p>
								<p>
									<strong>Status:</strong>{' '}
									<Badge bg={getStatusVariant(submissionData.status)}>
										{submissionData.status}
									</Badge>
								</p>
								<p>
									<strong>Code Size:</strong> {submissionData.size} bytes
								</p>
								<p>
									<strong>Submitted At:</strong>{' '}
									{submissionData.createdAt?.toDate().toLocaleString()}
								</p>
								<Show when={submissionData.executedAt}>
									<p>
										<strong>Executed At:</strong>{' '}
										{submissionData.executedAt?.toDate().toLocaleString()}
									</p>
								</Show>
							</Card.Body>
						</Card>

						<Card class="mb-3">
							<Card.Header>
								<h3>Code</h3>
							</Card.Header>
							<Card.Body>
								<pre style="background-color: #f8f9fa; padding: 1rem; border-radius: 0.375rem;">
									<code>{submissionData.code}</code>
								</pre>
							</Card.Body>
						</Card>

						<Show
							when={submissionData.results && submissionData.results.length > 0}
						>
							<Card>
								<Card.Header>
									<h3>Test Results</h3>
								</Card.Header>
								<Card.Body>
									<Table striped bordered hover>
										<thead>
											<tr>
												<th>Test Case</th>
												<th>Status</th>
												<th>Error Message</th>
											</tr>
										</thead>
										<tbody>
											{submissionData.results.map((result) => (
												<tr>
													<td>{result.testCaseId}</td>
													<td>
														<Badge
															bg={
																result.status === 'accepted'
																	? 'success'
																	: 'danger'
															}
														>
															{result.status}
														</Badge>
													</td>
													<td>{result.errorMessage || '-'}</td>
												</tr>
											))}
										</tbody>
									</Table>
								</Card.Body>
							</Card>
						</Show>
					</div>
				)}
			</Doc>
		</Container>
	);
};

export default SubmissionDetail;

import {useParams} from '@solidjs/router';
import {addDoc, doc, serverTimestamp} from 'firebase/firestore';
import {Accordion, Button, ButtonGroup, Container, Form} from 'solid-bootstrap';
import {useAuth, useFirestore} from 'solid-firebase';
import Doc from '~/lib/Doc';
import {auth, Submissions, TaskData} from '~/lib/firebase';
import Grids from '~/lib/Grids';

import styles from './index.module.css';
import {createSignal} from 'solid-js';

const DEFAULT_CODE = 'def p(g):return g';

const Task = () => {
	const param = useParams();
	const authState = useAuth(auth);
	const taskDatum = useFirestore(doc(TaskData, param.taskId));

	const [code, setCode] = createSignal(DEFAULT_CODE);
	const [isSubmitting, setIsSubmitting] = createSignal(false);

	const handleCodeChange = (event) => {
		setCode(event.target.value);
	};

	const handleClickSubmitCode = async () => {
		console.log('Submitting code:', code());

		if (!authState?.data?.uid) {
			console.error('User is not authenticated');
			return;
		}

		setIsSubmitting(true);

		await addDoc(Submissions, {
			task: param.taskId,
			code: code(),
			user: authState.data.uid,
			size: code().length,
			createdAt: serverTimestamp(),
			executedAt: null,
			status: 'pending',
		});
	};

	return (
		<Container>
			<h1>Task {param.taskId}</h1>
			<Doc data={taskDatum}>
				{(taskDatum) => (
					<div>
						<h2>Test Cases</h2>
						<Accordion defaultActiveKey="train">
							{Object.entries(taskDatum).map(([subset, data]) => (
								<Accordion.Item eventKey={subset}>
									<Accordion.Header>{subset}</Accordion.Header>
									<Accordion.Body>
										<ul class={styles.testcases}>
											{data.map((item) => (
												<li class={styles.testcase}>
													<Grids data={item.input} />
													→
													<Grids data={item.output} />
												</li>
											))}
										</ul>
									</Accordion.Body>
								</Accordion.Item>
							))}
						</Accordion>
					</div>
				)}
			</Doc>
			<h2>Useful Links</h2>
			<Button
				href={`https://github.com/google/ARC-GEN/blob/main/tasks/training/${param.taskId}.py`}
				target="_blank"
				rel="noopener noreferrer"
			>
				ARC-GEN
			</Button>{' '}
			<Button
				href={`https://arcprize.org/play?task=025d127b`}
				target="_blank"
				rel="noopener noreferrer"
			>
				ARC Prize
			</Button>
			<h2>Submit code</h2>
			<Form>
				<Form.Group
					class={`mb-3 ${styles.code}`}
					controlId="exampleForm.ControlTextarea1"
				>
					<Form.Control
						as="textarea"
						rows={5}
						value={code()}
						onChange={handleCodeChange}
						disabled={isSubmitting()}
					/>
				</Form.Group>
			</Form>
			<Button
				variant="primary"
				onClick={handleClickSubmitCode}
				disabled={isSubmitting()}
			>
				Submit
			</Button>
		</Container>
	);
};

export default Task;

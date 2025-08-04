import {useParams} from '@solidjs/router';
import {addDoc, doc, serverTimestamp} from 'firebase/firestore';
import {Accordion, Button, Container, Form} from 'solid-bootstrap';
import {useAuth, useFirestore} from 'solid-firebase';
import Doc from '~/lib/Doc';
import {auth, Submissions, TaskData, Tasks} from '~/lib/firebase';
import Grids from '~/lib/Grids';
import styles from './index.module.css';
import {createSignal, createMemo, type JSX} from 'solid-js';
import RecentSubmissions from './RecentSubmissions';
import UserInfo from '~/lib/UserInfo';
import {Submission, UseFireStoreReturn} from '~/lib/schema';

const DEFAULT_CODE = 'def p(g):return g';

type FormControlElement = HTMLInputElement | HTMLTextAreaElement;

const Task = () => {
	const param = useParams();
	const authState = useAuth(auth);
	const taskDatum = useFirestore(doc(TaskData, param.taskId));
	const taskDoc = useFirestore(doc(Tasks, param.taskId));

	const [code, setCode] = createSignal(DEFAULT_CODE);
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [currentSubmission, setCurrentSubmission] =
		createSignal<UseFireStoreReturn<Submission | null | undefined> | null>(
			null,
		);

	const byteCount = createMemo(() => new TextEncoder().encode(code()).length);

	const handleCodeChange: JSX.ChangeEventHandler<FormControlElement, Event> = (
		event,
	) => {
		setCode(event.currentTarget.value);
	};

	const handleClickSubmitCode = async () => {
		console.log('Submitting code:', code());

		if (!authState?.data?.uid) {
			console.error('User is not authenticated');
			return;
		}

		setIsSubmitting(true);

		const submission = await addDoc(Submissions, {
			task: param.taskId,
			code: code(),
			user: authState.data.uid,
			size: byteCount(),
			createdAt: serverTimestamp(),
			executedAt: null,
			status: 'pending',
			results: [],
		});

		setCurrentSubmission(useFirestore(doc(Submissions, submission.id)));
	};

	const submissionStatus = createMemo(() => {
		return currentSubmission()?.data?.status;
	});

	return (
		<Container class={styles.task}>
			<h1>
				{param.taskId}{' '}
				<Doc data={taskDoc}>
					{(task) =>
						task.owner !== null && (
							<span>
								({task.bytes} bytes, <UserInfo userId={task.owner} />)
							</span>
						)
					}
				</Doc>
			</h1>
			<Doc data={taskDatum}>
				{(taskDatum) => (
					<div>
						<h2>Test Cases</h2>
						<Accordion defaultActiveKey="train">
							{Object.entries(taskDatum).map(([subset, data]) => (
								<Accordion.Item eventKey={subset}>
									<Accordion.Header>
										{subset} ({data.length} cases)
									</Accordion.Header>
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
			<Doc data={taskDoc}>
				{(task) => (
					<Button
						href={`https://arcprize.org/play?task=${task.arcTaskId}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						ARC Prize
					</Button>
				)}
			</Doc>
			<RecentSubmissions taskId={param.taskId} />
			<h2>Submit code</h2>
			<Form>
				<Form.Group
					class={`mb-3 ${styles.code}`}
					controlId="exampleForm.ControlTextarea1"
				>
					<Form.Control
						as="textarea"
						rows={3}
						value={code()}
						onInput={handleCodeChange}
						disabled={isSubmitting()}
					/>
				</Form.Group>
			</Form>
			<div class={styles.submitRow}>
				<Button
					variant="primary"
					onClick={handleClickSubmitCode}
					disabled={isSubmitting()}
				>
					Submit
				</Button>
				<span class={styles.byteCounter}>{byteCount()} bytes</span>
			</div>
		</Container>
	);
};

export default Task;

import {useParams, A} from '@solidjs/router';
import {addDoc, doc, serverTimestamp} from 'firebase/firestore';
import {
	Accordion,
	Alert,
	Button,
	Container,
	Form,
	Spinner,
} from 'solid-bootstrap';
import {useAuth, useFirestore} from 'solid-firebase';
import Doc from '~/lib/Doc';
import {auth, Submissions, TaskData, Tasks} from '~/lib/firebase';
import Grids from '~/lib/Grids';
import styles from './index.module.css';
import {createSignal, createMemo, Show, type JSX} from 'solid-js';
import RecentSubmissions from './RecentSubmissions';
import UserInfo from '~/lib/UserInfo';
import type {Submission, UseFireStoreReturn} from '~/lib/schema';

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

	const canSubmit = createMemo(() => {
		const task = taskDoc.data;
		if (!task) return true; // Allow submission if task data is loading
		if (task.bytes === null) return true; // Allow if no current best submission
		return byteCount() < task.bytes; // Only allow if shorter than current best
	});

	const byteDiff = createMemo(() => {
		const task = taskDoc.data;
		if (!task || task.bytes === null) return null;
		return byteCount() - task.bytes;
	});

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

		if (!canSubmit()) {
			console.error('Code is not shorter than current best');
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
		setIsSubmitting(false);
	};

	const submissionStatus = createMemo(() => {
		return currentSubmission()?.data?.status;
	});

	const isSubmissionPending = createMemo(() => {
		const status = submissionStatus();
		return status === 'pending' || status === 'running';
	});

	const buttonText = createMemo(() => {
		const status = submissionStatus();
		if (status === 'pending') return 'Pending...';
		if (status === 'running') return 'Running...';
		return 'Submit';
	});

	const isSubmissionCompleted = createMemo(() => {
		const status = submissionStatus();
		return status === 'accepted' || status === 'rejected';
	});

	const alertVariant = createMemo(() => {
		const status = submissionStatus();
		return status === 'accepted' ? 'success' : 'danger';
	});

	const alertMessage = createMemo(() => {
		const status = submissionStatus();
		const submission = currentSubmission()?.data;
		const submissionId = submission?.id;

		if (status === 'accepted') {
			return (
				<>
					✅ Submission accepted! Your solution used {submission?.size} bytes.{' '}
					<A href={`/submissions/${submissionId}`}>View details</A>
				</>
			);
		}

		if (status === 'rejected') {
			const failedTests =
				submission?.results?.filter((r) => r.status === 'rejected').length || 0;
			const totalTests = submission?.results?.length || 0;
			return (
				<>
					❌ Submission rejected. Failed {failedTests}/{totalTests} test cases.{' '}
					<A href={`/submissions/${submissionId}`}>View details</A>
				</>
			);
		}

		return null;
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
					disabled={isSubmitting() || isSubmissionPending() || !canSubmit()}
				>
					{isSubmissionPending() && (
						<Spinner
							animation="border"
							size="sm"
							aria-hidden="true"
							class="me-2"
						/>
					)}
					{buttonText()}
				</Button>
				<span class={styles.byteCounter}>
					{byteCount()} bytes
					<Show when={byteDiff()}>
						{(diff) => (
							<span
								style={{
									color: diff() < 0 ? 'green' : 'red',
									'margin-left': '8px',
								}}
							>
								({diff() < 0 ? '' : '+'}
								{diff()})
							</span>
						)}
					</Show>
				</span>
			</div>
			<Show when={isSubmissionCompleted()}>
				<Alert variant={alertVariant()} class="mt-3">
					{alertMessage()}
				</Alert>
			</Show>
		</Container>
	);
};

export default Task;

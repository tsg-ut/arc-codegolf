import {useParams} from '@solidjs/router';
import {doc} from 'firebase/firestore';
import {Accordion, Container} from 'solid-bootstrap';
import {useFirestore} from 'solid-firebase';
import Doc from '~/lib/Doc';
import {TaskData} from '~/lib/firebase';
import Grids from '~/lib/Grids';

import styles from './index.module.css';

const Task = () => {
	const param = useParams();
	const taskDatum = useFirestore(doc(TaskData, param.taskId));

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
		</Container>
	);
};

export default Task;

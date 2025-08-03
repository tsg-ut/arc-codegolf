import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chunk} from 'remeda';
import type {TaskDatum} from '../src/lib/schema';

const getTaskNo = (taskId: string) => {
	const match = taskId.match(/task(\d+)/);
	return match ? Number.parseInt(match[1]) : null;
};

const serviceAccount = JSON.parse(
	await fs.readFile(
		'./arc-codegolf-firebase-adminsdk-fbsvc-045ff34a1c.json',
		'utf8',
	),
);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

/*
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({
	projectId: 'arc-codegolf',
});
*/

interface RawTaskData {
	[subset: string]: {
		input: number[][];
		output: number[][];
	}[];
}

const normalizeData = (data: RawTaskData): TaskDatum => {
	const normalized: TaskDatum = {};

	for (const subset of Object.keys(data)) {
		normalized[subset] = data[subset].map((task) => ({
			input: task.input.map((row) => row.join('')).join('\n'),
			output: task.output.map((row) => row.join('')).join('\n'),
		}));
	}

	return normalized;
};

const db = admin.firestore();

const users = await db.collection('users').get();
console.log(users.docs);

const TaskData = db.collection('taskData');
const Tasks = db.collection('tasks');

const taskFiles = await fs.readdir('./google-code-golf-2025');

const taskIdsJson = await fetch(
	'https://arcprize.org/media/json/v1_public_training_set.json',
);
const taskIds = await taskIdsJson.json();

for (const fileChunk of chunk(taskFiles, 10)) {
	const batch = db.batch();

	for (const file of fileChunk) {
		if (!file.endsWith('.json')) {
			continue;
		}

		const filePath = `./google-code-golf-2025/${file}`;
		const fileContent = await fs.readFile(filePath, 'utf8');
		const basename = path.basename(file, '.json');
		const taskNo = getTaskNo(basename);
		const taskId = taskNo === null ? null : (taskIds[taskNo - 1] ?? null);

		try {
			const taskData = JSON.parse(fileContent);
			batch.set(TaskData.doc(basename), normalizeData(taskData));
			batch.set(Tasks.doc(basename), {
				owner: null,
				ownerLastChangedAt: null,
				bestSubmission: null,
				bytes: null,
				arcTaskId: taskId,
			});
			console.log(`Task data from ${file} added successfully.`);
		} catch (error) {
			console.error(`Error processing ${file}:`, error);
		}
	}

	await batch.commit();
}

import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chunk} from 'remeda';

// var serviceAccount = require("path/to/serviceAccountKey.json");
const serviceAccount = JSON.parse(
	await fs.readFile(
		'./arc-codegolf-firebase-adminsdk-fbsvc-045ff34a1c.json',
		'utf8',
	),
);

interface TaskData {
	[subset: string]: {
		input: number[][];
		output: number[][];
	}[];
}

interface NormalizedTaskData {
	[subset: string]: {
		input: string;
		output: string;
	}[];
}

const normalizeData = (data: TaskData): NormalizedTaskData => {
	const normalized: NormalizedTaskData = {};

	for (const subset of Object.keys(data)) {
		normalized[subset] = data[subset].map((task) => ({
			input: task.input.map((row) => row.join('')).join('\n'),
			output: task.output.map((row) => row.join('')).join('\n'),
		}));
	}

	return normalized;
};

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TaskData = db.collection('taskData');

const taskFiles = await fs.readdir('./google-code-golf-2025');

for (const fileChunk of chunk(taskFiles, 50)) {
	const batch = db.batch();

	for (const file of fileChunk) {
		if (!file.endsWith('.json')) {
			continue;
		}

		const filePath = `./google-code-golf-2025/${file}`;
		const fileContent = await fs.readFile(filePath, 'utf8');
		const basename = path.basename(file, '.json');

		try {
			const taskData = JSON.parse(fileContent);
			batch.set(TaskData.doc(basename), normalizeData(taskData));
			console.log(`Task data from ${file} added successfully.`);
		} catch (error) {
			console.error(`Error processing ${file}:`, error);
		}
	}

	await batch.commit();
}

import {For} from 'solid-js';
import styles from './Grids.module.css';

interface Props {
	data: string;
}

type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface GridItem {
	width: number;
	height: number;
	grids: Cell[][];
}

const parseGridData = (data: string): GridItem => {
	const lines = data.trim().split('\n');
	const grids = lines.map((line) =>
		Array.from(line.trim()).map((char) => Number.parseInt(char) as Cell),
	);

	const height = grids.length;
	const widths = new Set<number>(grids.map((row) => row.length));
	if (widths.size !== 1) {
		throw new Error('Inconsistent row lengths in grid data');
	}
	const width = widths.values().next().value;
	if (width === undefined) {
		throw new Error('No width found in grid data');
	}
	return {
		width,
		height,
		grids,
	};
};

const Grids = (props: Props) => (
	<div class={styles.grids}>
		<For each={parseGridData(props.data).grids}>
			{(row) => (
				<div class={styles.row}>
					<For each={row}>
						{(cell) => (
							<div class={`${styles.cell} ${styles[`cell-${cell}`]}`}>
								{cell}
							</div>
						)}
					</For>
				</div>
			)}
		</For>
	</div>
);

export default Grids;

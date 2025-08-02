import {test, expect} from 'vitest';
import {render} from '@solidjs/testing-library';
import Index from './index.js';

test('renders without crashing', () => {
	const {container} = render(() => <Index />);
	expect(container).toBeInTheDocument();
});

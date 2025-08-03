import {test, expect, vi} from 'vitest';
import {render} from '@solidjs/testing-library';
import Index from './index';

// Mock the router primitives
vi.mock('@solidjs/router', () => ({
	A: (props: any) => <a href={props.href} {...props} />,
}));

test('renders without crashing', () => {
	const {container} = render(() => <Index />);
	expect(container).toBeInTheDocument();
});

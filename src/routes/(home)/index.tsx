import type {Component} from 'solid-js';
import {auth, signOut} from '~/lib/firebase';
import {useAuth} from 'solid-firebase';

const Index: Component = () => {
	const authState = useAuth(auth);

	return (
		<div>
			<p>Welcome, {authState.data?.displayName}!</p>
			<button type="button" onClick={signOut}>
				ログアウト
			</button>
		</div>
	);
};

export default Index;

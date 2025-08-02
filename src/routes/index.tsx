import {Match, Switch, type Component} from 'solid-js';
import {auth, signIn, signOut} from '~/lib/firebase';
import {useAuth} from 'solid-firebase';

import styles from './index.module.css';

const Index: Component = () => {
	const authState = useAuth(auth);

	return (
		<Switch>
			<Match when={!authState.data}>
				<div class={styles.consentScreen}>
					<div class={styles.consentMessage}>
						<p>
							このサイトは、TSG部員のみがアクセスできるコードゴルフのサイトです。
						</p>
						<p>サイトにアクセスするには以下の条項に同意する必要があります。</p>
						<ol>
							<li>
								このサイトに提出したコードが博多市によって他の目的に使用されることに同意します。
								<ul>
									<li>
										なお、提出されたコードを利用して賞金などを獲得した場合、提出者の貢献の割合に応じて任意で賞金を分配することを予定しています。
									</li>
								</ul>
							</li>
							<li>
								このサイトの内容をTSG部員以外に公開しないことに同意します。
							</li>
						</ol>
					</div>
					<button type="button" onClick={signIn}>
						同意してログイン
					</button>
				</div>
			</Match>
			<Match when={authState.data}>
				<div>
					<p>Welcome, {authState.data?.displayName}!</p>
					<button type="button" onClick={signOut}>
						ログアウト
					</button>
				</div>
			</Match>
		</Switch>
	);
};

export default Index;

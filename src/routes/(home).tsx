import {A, type RouteSectionProps} from '@solidjs/router';
import {Match, Switch} from 'solid-js';
import {auth, signIn, signOut} from '~/lib/firebase';
import {useAuth} from 'solid-firebase';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Container, Nav, Navbar} from 'solid-bootstrap';

const HomeLayout = (props: RouteSectionProps) => {
	const authState = useAuth(auth);

	return (
		<Switch>
			<Match when={!authState.data}>
				<div>
					<div>
						<p>
							このサイトは、TSG部員のみがアクセスできるコードゴルフのサイトです。
						</p>
						<p>サイトにアクセスするには以下の条項に同意する必要があります。</p>
						<ol>
							<li>
								このサイトに提出したコードや収集された情報が博多市によって他の目的に使用されることに同意します。
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
					<Navbar bg="dark" variant="dark" expand="lg">
						<Container>
							<Navbar.Brand as={A} href="/">
								<img alt="" src={'logo.svg'} width="30" height="30" />
								{' TSG ARC Codegolf'}
							</Navbar.Brand>
							<Navbar.Toggle aria-controls="responsive-navbar-nav" />
							<Navbar.Collapse id="responsive-navbar-nav">
								<Nav class="me-auto">
									<Nav.Link as={A} href="/">
										Home
									</Nav.Link>
									<Nav.Link as={A} href="/submissions">
										Submissions
									</Nav.Link>
									<Nav.Link as={A} href="/contributions">
										Ranking
									</Nav.Link>
								</Nav>
								<Nav>
									<Nav.Link as={A} href="/preferences">
										Preferences
									</Nav.Link>
									<Nav.Link as="button" onClick={signOut}>
										Sign out
									</Nav.Link>
								</Nav>
							</Navbar.Collapse>
						</Container>
					</Navbar>
					{props.children}
				</div>
			</Match>
		</Switch>
	);
};

export default HomeLayout;

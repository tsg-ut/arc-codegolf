import {doc} from 'firebase/firestore';
import {useFirestore} from 'solid-firebase';
import type {Component} from 'solid-js';
import {Users} from './firebase';
import Doc from './Doc';

import styles from './UserInfo.module.css';

const UserInfo: Component<{userId: string}> = (props) => {
	const userDoc = useFirestore(doc(Users, props.userId));

	return (
		<Doc data={userDoc}>
			{(user) => (
				<div class={styles.userInfo}>
					<img
						src={user.photoURL}
						alt={user.displayName}
						class={styles.userAvatar}
						loading="lazy"
					/>
					<span>{user.displayName}</span>
				</div>
			)}
		</Doc>
	);
};

export default UserInfo;

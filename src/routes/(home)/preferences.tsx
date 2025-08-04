import type {Component} from 'solid-js';
import {createSignal, createEffect, createMemo, Show} from 'solid-js';
import {Container, Card, Form, Button, Alert} from 'solid-bootstrap';
import {useAuth, useFirestore} from 'solid-firebase';
import {auth, storage, Users} from '~/lib/firebase';
import {doc, updateDoc} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import type {User} from '~/lib/schema';
import styles from './preferences.module.css';

const Preferences: Component = () => {
	const authState = useAuth(auth);
	const [displayName, setDisplayName] = createSignal('');
	const [uploading, setUploading] = createSignal(false);
	const [saving, setSaving] = createSignal(false);
	const [message, setMessage] = createSignal<{
		type: 'success' | 'error';
		text: string;
	} | null>(null);
	const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
	const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);

	const currentUser = createMemo(() => authState.data);
	const userId = createMemo(() => currentUser()?.uid);

	const userDoc = createMemo(() => {
		const uid = userId();
		return uid ? useFirestore(doc(Users, uid)) : null;
	});
	const userData = createMemo(() => userDoc()?.data as User | null);

	createEffect(() => {
		const user = userData();
		if (user) {
			setDisplayName(user.displayName || '');
		}
	});

	const handleFileSelect = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				setMessage({type: 'error', text: 'File size must be less than 5MB'});
				return;
			}

			if (!file.type.startsWith('image/')) {
				setMessage({type: 'error', text: 'Please select an image file'});
				return;
			}

			setSelectedFile(file);

			const reader = new FileReader();
			reader.onload = (e) => {
				setPreviewUrl(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const uploadAvatar = async (): Promise<string | null> => {
		const file = selectedFile();
		const uid = userId();

		if (!file || !uid) return null;

		setUploading(true);
		try {
			const avatarRef = ref(storage, `avatars/${uid}`);
			const snapshot = await uploadBytes(avatarRef, file);
			const downloadURL = await getDownloadURL(snapshot.ref);
			return downloadURL;
		} catch (error) {
			console.error('Upload error:', error);
			setMessage({type: 'error', text: 'Failed to upload avatar'});
			return null;
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (event: Event) => {
		event.preventDefault();
		const uid = userId();

		if (!uid) {
			setMessage({type: 'error', text: 'User not authenticated'});
			return;
		}

		setSaving(true);
		setMessage(null);

		try {
			const updates: Partial<User> = {};

			if (displayName().trim() !== userData()?.displayName) {
				updates.displayName = displayName().trim();
			}

			if (selectedFile()) {
				const photoURL = await uploadAvatar();
				if (photoURL) {
					updates.photoURL = photoURL;
				} else {
					setSaving(false);
					return;
				}
			}

			if (Object.keys(updates).length > 0) {
				const userDocRef = doc(Users, uid);
				console.log({updates, uid});

				await updateDoc(userDocRef, updates);
				setMessage({type: 'success', text: 'Profile updated successfully!'});
				setSelectedFile(null);
				setPreviewUrl(null);
			} else {
				setMessage({type: 'error', text: 'No changes to save'});
			}
		} catch (error) {
			console.error('Save error:', error);
			setMessage({type: 'error', text: 'Failed to update profile'});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Container class="py-4">
			<h1>Preferences</h1>
			<Card>
				<Card.Body>
					<Show when={message()}>
						{(msg) => (
							<Alert variant={msg().type === 'success' ? 'success' : 'danger'}>
								{msg().text}
							</Alert>
						)}
					</Show>

					<Form onSubmit={handleSubmit}>
						<div class={styles.avatarSection}>
							<h5>Profile Picture</h5>
							<div class={styles.avatarContainer}>
								<img
									src={
										previewUrl() ||
										userData()?.photoURL ||
										'/default-avatar.png'
									}
									alt="Profile"
									class={styles.avatarPreview}
								/>
								<div class={styles.avatarActions}>
									<Form.Group controlId="avatar">
										<Form.Label>Change Avatar</Form.Label>
										<Form.Control
											type="file"
											accept="image/*"
											onChange={handleFileSelect}
											disabled={uploading() || saving()}
										/>
										<Form.Text class="text-muted">
											Max file size: 5MB. Supported formats: JPG, PNG, GIF
										</Form.Text>
									</Form.Group>
								</div>
							</div>
						</div>

						<Form.Group class="mb-3" controlId="displayName">
							<Form.Label>Display Name</Form.Label>
							<Form.Control
								type="text"
								value={displayName()}
								onInput={(e) => setDisplayName(e.currentTarget.value)}
								placeholder="Enter your display name"
								disabled={saving()}
								required
							/>
						</Form.Group>

						<div class={styles.buttonGroup}>
							<Button
								type="submit"
								variant="primary"
								disabled={uploading() || saving()}
							>
								{saving()
									? 'Saving...'
									: uploading()
										? 'Uploading...'
										: 'Save Changes'}
							</Button>
						</div>
					</Form>
				</Card.Body>
			</Card>
		</Container>
	);
};

export default Preferences;

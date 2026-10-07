import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Icon from '../../../components/icon/Icon';
import Button from '../../../components/bootstrap/Button';
import showNotification from '../../../components/extras/showNotification';
import { User, deleteUserApi } from '../../../api/users.api';

interface IUserDeleteModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	users: User[];
}

const UserDeleteModal: FC<IUserDeleteModalProps> = ({ id, isOpen, setIsOpen, users }) => {
	const queryClient = useQueryClient();
	const item = id ? users.find((u) => u.id.toString() === id.toString()) : null;

	const handleDelete = async () => {
		if (!item) return;

		try {
			await deleteUserApi(item.id);
			await queryClient.invalidateQueries({ queryKey: ['users'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='DeleteForever' size='lg' className='me-1' />
					<span>User Deleted</span>
				</span>,
				`${item.name} has been removed.`,
			);
			setIsOpen(false);
		} catch (error) {
			const axiosError = error as {
				response?: {
					data?: {
						message?: string;
					};
				};
			};

			showNotification(
				'Delete failed',
				axiosError.response?.data?.message || 'Failed to delete user.',
				'danger',
			);
		}
	};

	if (!item) return null;

	const initials = item.name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='sm'
			titleId='user-delete-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='user-delete-modal'>Delete User</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4 text-center'>
				{/* Danger icon ring */}
				<div
					className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3'
					style={{
						width: 72,
						height: 72,
						background: 'rgba(239,68,68,0.12)',
						border: '2px solid rgba(239,68,68,0.3)',
					}}>
					<Icon icon='DeleteForever' size='3x' color='danger' />
				</div>

				{/* User avatar / name */}
				<div
					className='d-flex align-items-center justify-content-center rounded-circle fw-bold text-white fs-5 mx-auto mb-2'
					style={{
						width: 48,
						height: 48,
						background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
					}}>
					{initials}
				</div>
				<h5 className='fw-bold mb-1'>{item.name}</h5>
				<p className='text-muted small mb-0'>{item.email || 'No email'}</p>

				<hr />

				<p className='text-muted'>
					Are you sure you want to{' '}
					<strong className='text-danger'>permanently delete</strong> this user? This
					action <strong>cannot be undone</strong>.
				</p>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2 justify-content-center'>
				<Button color='light' className='flex-fill' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='danger'
					icon='DeleteForever'
					className='flex-fill'
					onClick={handleDelete}>
					Delete
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default UserDeleteModal;

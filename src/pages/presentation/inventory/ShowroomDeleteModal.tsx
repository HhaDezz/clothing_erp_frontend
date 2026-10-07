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
import { deleteShowroomApi, Showroom } from '../../../api/showrooms.api';

interface IShowroomDeleteModalProps {
	id: number | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	showrooms: Showroom[];
}

const ShowroomDeleteModal: FC<IShowroomDeleteModalProps> = ({ id, isOpen, setIsOpen, showrooms }) => {
	const queryClient = useQueryClient();
	const item = id ? showrooms.find((s) => s.id === id) : null;

	const handleDelete = async () => {
		if (!item) return;
		try {
			await deleteShowroomApi(item.id);
			await queryClient.invalidateQueries({ queryKey: ['showrooms'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='DeleteForever' size='lg' className='me-1' />
					<span>Showroom Deleted</span>
				</span>,
				`${item.name} has been removed.`,
			);
			setIsOpen(false);
		} catch (error) {
			const axiosError = error as { response?: { data?: { message?: string } } };
			showNotification(
				'Delete failed',
				axiosError.response?.data?.message || 'Failed to delete showroom.',
				'danger',
			);
		}
	};

	if (!item) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='sm' titleId='showroom-delete-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='showroom-delete-modal'>Delete Showroom</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4 text-center'>
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

				<h5 className='fw-bold mb-1'>{item.name}</h5>

				<hr />

				<p className='text-muted'>
					Are you sure you want to <strong className='text-danger'>permanently delete</strong> this
					showroom? This action <strong>cannot be undone</strong>.
				</p>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2 justify-content-center'>
				<Button color='light' className='flex-fill' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='danger' icon='DeleteForever' className='flex-fill' onClick={handleDelete}>
					Delete
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ShowroomDeleteModal;

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
import { deleteDesignationApi } from '../../../api/designations.api';
import { IDesignation } from './types';

interface IDesignationDeleteModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	designations: IDesignation[];
	setDesignations(designations: IDesignation[] | null): void;
}

const DesignationDeleteModal: FC<IDesignationDeleteModalProps> = ({
	id,
	isOpen,
	setIsOpen,
	designations,
	setDesignations,
}) => {
	const queryClient = useQueryClient();
	const item = id
		? designations.find((designation) => designation.id.toString() === id.toString())
		: null;

	const handleDelete = async () => {
		if (!item) return;

		try {
			await deleteDesignationApi(item.id);
			await queryClient.invalidateQueries({ queryKey: ['designations'] });
			setDesignations(null);
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='DeleteForever' size='lg' className='me-1' />
					<span>Designation Deleted</span>
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
				axiosError.response?.data?.message || 'Failed to delete designation.',
				'danger',
			);
		}
	};

	if (!item) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='sm'
			titleId='designation-delete-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='designation-delete-modal'>Delete Designation</ModalTitle>
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
				<p className='text-muted small mb-0'>{item.code}</p>

				<hr />

				<p className='text-muted'>
					Are you sure you want to{' '}
					<strong className='text-danger'>permanently delete</strong> this designation?
					This action <strong>cannot be undone</strong>.
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

export default DesignationDeleteModal;

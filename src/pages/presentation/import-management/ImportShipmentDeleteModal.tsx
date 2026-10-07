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
import { deleteImportShipmentApi, ImportShipmentResponse } from '../../../api/importShipments.api';

interface IImportShipmentDeleteModalProps {
	shipment: ImportShipmentResponse | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
}

const ImportShipmentDeleteModal: FC<IImportShipmentDeleteModalProps> = ({
	shipment,
	isOpen,
	setIsOpen,
}) => {
	const queryClient = useQueryClient();

	const handleDelete = async () => {
		if (!shipment) return;
		try {
			await deleteImportShipmentApi(shipment.id);
			await queryClient.invalidateQueries({ queryKey: ['importShipments'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='DeleteForever' size='lg' className='me-1' />
					<span>Import Shipment Deleted</span>
				</span>,
				`${shipment.shipmentNo} has been removed.`,
			);
			setIsOpen(false);
		} catch (error) {
			const axiosError = error as { response?: { data?: { message?: string } } };
			showNotification(
				'Delete failed',
				axiosError.response?.data?.message || 'Failed to delete import shipment.',
				'danger',
			);
		}
	};

	if (!shipment) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='sm'
			titleId='import-shipment-delete-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='import-shipment-delete-modal'>Delete Import Shipment</ModalTitle>
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

				<h5 className='fw-bold mb-1'>{shipment.shipmentNo}</h5>
				{shipment.gfReference && <p className='text-muted small mb-0'>{shipment.gfReference}</p>}

				<hr />

				<p className='text-muted'>
					Are you sure you want to{' '}
					<strong className='text-danger'>permanently delete</strong> this import shipment?
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

export default ImportShipmentDeleteModal;

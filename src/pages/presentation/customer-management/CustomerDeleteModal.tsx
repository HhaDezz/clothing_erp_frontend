import React, { FC, useState } from 'react';
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
import { Customer, deleteCustomerApi } from '../../../api/customers.api';

interface ICustomerDeleteModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	customers: Customer[];
}

const getCustomerCode = (customer: Customer) => customer.customer_code ?? customer.customerCode ?? '';
const getCustomerFullName = (customer: Customer) =>
	`${customer.first_name ?? customer.firstName ?? ''} ${customer.last_name ?? customer.lastName ?? ''}`.trim() ||
	'this customer';

/**
 * Confirms and performs a customer delete. This file started life as a copy
 * of the Users page's delete modal and was still calling the USER delete
 * endpoint with the customer's id — it now deletes the customer.
 * <p>
 * The backend delete is a soft delete: the customer drops out of the list,
 * the POS lookup and campaigns, but their past orders, invoices and ledgers
 * are kept, so the wording here says "remove", not "permanently delete".
 */
const CustomerDeleteModal: FC<ICustomerDeleteModalProps> = ({ id, isOpen, setIsOpen, customers }) => {
	const queryClient = useQueryClient();
	const [isDeleting, setIsDeleting] = useState(false);
	const item = id ? customers.find((c) => c.id.toString() === id.toString()) : null;

	const handleDelete = async () => {
		if (!item) return;
		const name = getCustomerFullName(item);

		setIsDeleting(true);
		try {
			await deleteCustomerApi(item.id);
			await queryClient.invalidateQueries({ queryKey: ['customers'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='DeleteForever' size='lg' className='me-1' />
					<span>Customer Deleted</span>
				</span>,
				`${name} has been removed.`,
				'success',
			);
			setIsOpen(false);
		} catch (error) {
			const axiosError = error as { response?: { data?: { message?: string } } };
			showNotification(
				'Delete failed',
				axiosError.response?.data?.message || 'Failed to delete customer.',
				'danger',
			);
		} finally {
			setIsDeleting(false);
		}
	};

	if (!item) return null;

	const fullName = getCustomerFullName(item);
	const initials =
		fullName
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?';
	const visits = item.visitCount ?? 0;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='sm' titleId='customer-delete-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='customer-delete-modal'>Delete Customer</ModalTitle>
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

				<div
					className='d-flex align-items-center justify-content-center rounded-circle fw-bold text-white fs-5 mx-auto mb-2'
					style={{
						width: 48,
						height: 48,
						background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
					}}>
					{initials}
				</div>
				<h5 className='fw-bold mb-1'>{fullName}</h5>
				<p className='text-muted small mb-0'>
					{[getCustomerCode(item), item.phone].filter(Boolean).join(' · ') || 'No contact details'}
				</p>

				<hr />

				<p className='text-muted mb-0'>
					Are you sure you want to <strong className='text-danger'>delete</strong> this customer? They
					will no longer appear in the customer list or at the POS.
				</p>
				{visits > 0 && (
					<p className='text-muted small mt-2 mb-0'>
						Their {visits} past order{visits === 1 ? '' : 's'} and invoices are kept.
					</p>
				)}
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2 justify-content-center'>
				<Button color='light' className='flex-fill' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='danger'
					icon='DeleteForever'
					className='flex-fill'
					isDisable={isDeleting}
					onClick={handleDelete}>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default CustomerDeleteModal;

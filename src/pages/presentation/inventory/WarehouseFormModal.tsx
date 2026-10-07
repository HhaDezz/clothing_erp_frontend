import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import showNotification from '../../../components/extras/showNotification';
import Icon from '../../../components/icon/Icon';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Checks from '../../../components/bootstrap/forms/Checks';
import Button from '../../../components/bootstrap/Button';
import { createWarehouseApi, updateWarehouseApi, Warehouse } from '../../../api/warehouses.api';

export type TWarehouseFormMode = 'add' | 'edit' | 'view';

interface IWarehouseFormModalProps {
	mode: TWarehouseFormMode;
	id: number | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	warehouses: Warehouse[];
	onEdit?(id: number): void;
}

type TFormValues = {
	name: string;
	address: string;
	binLocation: string;
	isDefault: boolean;
};

const WarehouseFormModal: FC<IWarehouseFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	warehouses,
	onEdit,
}) => {
	const queryClient = useQueryClient();
	const isViewing = mode === 'view';
	const isEditing = mode === 'edit';
	const isAdding = mode === 'add';
	const item = isAdding ? null : warehouses.find((w) => w.id === id) || null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: item?.name || '',
			address: item?.address || '',
			binLocation: item?.binLocation || '',
			isDefault: item?.isDefault ?? false,
		},
		validate: (values) => {
			if (isViewing) return {};
			const errors: Partial<Record<keyof TFormValues, string>> = {};
			if (!values.name) errors.name = 'Name is required';
			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (isViewing) return;
			try {
				const payload = {
					name: values.name,
					address: values.address || undefined,
					binLocation: values.binLocation || undefined,
					isDefault: values.isDefault,
				};

				if (isAdding) {
					await createWarehouseApi(payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Warehouse' size='lg' className='me-1' />
							<span>Warehouse Created</span>
						</span>,
						`${values.name} has been added successfully.`,
					);
				} else if (isEditing) {
					if (!id) return;
					await updateWarehouseApi(id, payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Edit' size='lg' className='me-1' />
							<span>Warehouse Updated</span>
						</span>,
						`${values.name} has been updated successfully.`,
					);
				}

				await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
				resetForm();
				setIsOpen(false);
			} catch (error) {
				const axiosError = error as {
					response?: { data?: { message?: string } };
				};
				showNotification(
					'Request failed',
					axiosError.response?.data?.message || 'Failed to save warehouse.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (!isAdding && !item) return null;

	const modalTitle = isAdding
		? 'New Warehouse'
		: isEditing
			? `Edit Warehouse - ${item?.name || ''}`
			: 'Warehouse Details';

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='warehouse-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='warehouse-form-modal'>{modalTitle}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='name' label='Name' className='col-12'>
							<Input
								name='name'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.name}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								placeholder='e.g. Main Warehouse'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='address' label='Address' className='col-12'>
							<Textarea
								name='address'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.address}
								placeholder='Physical address (optional)'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='binLocation' label='Bin Location' className='col-12'>
							<Input
								name='binLocation'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.binLocation}
								placeholder='e.g. Rack A / Shelf 3 (optional)'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='isDefault' className='col-12'>
							<Checks
								type='switch'
								id='isDefault'
								label='Default warehouse (used for automatic stock commitment)'
								name='isDefault'
								checked={formik.values.isDefault}
								onChange={formik.handleChange}
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					{isViewing ? 'Close' : 'Cancel'}
				</Button>
				{isViewing && item && onEdit && (
					<Button
						color='primary'
						icon='Edit'
						onClick={() => {
							setIsOpen(false);
							onEdit(item.id);
						}}>
						Edit
					</Button>
				)}
				{!isViewing && (
					<Button
						color='primary'
						icon={isAdding ? 'Add' : 'Save'}
						isDisable={formik.isSubmitting}
						onClick={() => formik.handleSubmit()}>
						{isAdding ? 'Add' : 'Update'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

export default WarehouseFormModal;

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
import Button from '../../../components/bootstrap/Button';
import { createShowroomApi, updateShowroomApi, Showroom } from '../../../api/showrooms.api';

export type TShowroomFormMode = 'add' | 'edit' | 'view';

interface IShowroomFormModalProps {
	mode: TShowroomFormMode;
	id: number | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	showrooms: Showroom[];
	onEdit?(id: number): void;
}

type TFormValues = {
	name: string;
	address: string;
	contactPerson: string;
};

const ShowroomFormModal: FC<IShowroomFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	showrooms,
	onEdit,
}) => {
	const queryClient = useQueryClient();
	const isViewing = mode === 'view';
	const isEditing = mode === 'edit';
	const isAdding = mode === 'add';
	const item = isAdding ? null : showrooms.find((s) => s.id === id) || null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: item?.name || '',
			address: item?.address || '',
			contactPerson: item?.contactPerson || '',
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
					contactPerson: values.contactPerson || undefined,
				};

				if (isAdding) {
					await createShowroomApi(payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Storefront' size='lg' className='me-1' />
							<span>Showroom Created</span>
						</span>,
						`${values.name} has been added successfully.`,
					);
				} else if (isEditing) {
					if (!id) return;
					await updateShowroomApi(id, payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Edit' size='lg' className='me-1' />
							<span>Showroom Updated</span>
						</span>,
						`${values.name} has been updated successfully.`,
					);
				}

				await queryClient.invalidateQueries({ queryKey: ['showrooms'] });
				resetForm();
				setIsOpen(false);
			} catch (error) {
				const axiosError = error as {
					response?: { data?: { message?: string } };
				};
				showNotification(
					'Request failed',
					axiosError.response?.data?.message || 'Failed to save showroom.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (!isAdding && !item) return null;

	const modalTitle = isAdding
		? 'New Showroom'
		: isEditing
			? `Edit Showroom - ${item?.name || ''}`
			: 'Showroom Details';

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='showroom-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='showroom-form-modal'>{modalTitle}</ModalTitle>
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
								placeholder='e.g. Colombo City Showroom'
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
						<FormGroup id='contactPerson' label='Contact Person' className='col-12'>
							<Input
								name='contactPerson'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.contactPerson}
								placeholder='Showroom manager / contact (optional)'
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

export default ShowroomFormModal;

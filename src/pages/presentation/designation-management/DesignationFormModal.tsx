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
import Button from '../../../components/bootstrap/Button';
import { createDesignationApi, updateDesignationApi } from '../../../api/designations.api';
import { IDesignation } from './types';

export type TDesignationFormMode = 'add' | 'edit' | 'view';

interface IDesignationFormModalProps {
	mode: TDesignationFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	designations: IDesignation[];
	setDesignations(designations: IDesignation[] | null): void;
	onEdit?(id: string): void;
}

type TFormValues = {
	name: string;
	code: string;
	description: string;
};

const getCompanyId = () => localStorage.getItem('company_id') || '';

const DesignationFormModal: FC<IDesignationFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	designations,
	setDesignations,
	onEdit,
}) => {
	const queryClient = useQueryClient();
	const isViewing = mode === 'view';
	const isEditing = mode === 'edit';
	const isAdding = mode === 'add';
	const item = isAdding
		? null
		: designations.find((designation) => designation.id.toString() === id) || null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: item?.name || '',
			code: item?.code || '',
			description: item?.description || '',
		},
		validate: (values) => {
			if (isViewing) return {};

			const errors: Partial<Record<keyof TFormValues, string>> = {};
			if (!values.name) errors.name = 'Name is required';
			if (!values.code) errors.code = 'Code is required';
			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (isViewing) return;

			try {
				const payload = {
					name: values.name,
					code: values.code,
					description: values.description || undefined,
					company_id: getCompanyId() || undefined,
				};

				if (isAdding) {
					await createDesignationApi(payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='AddBusiness' size='lg' className='me-1' />
							<span>Designation Created</span>
						</span>,
						`${values.name} has been added successfully.`,
					);
				} else if (isEditing) {
					if (!id) return;
					await updateDesignationApi(id, payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Edit' size='lg' className='me-1' />
							<span>Designation Updated</span>
						</span>,
						`${values.name} has been updated successfully.`,
					);
				}

				await queryClient.invalidateQueries({ queryKey: ['designations'] });
				resetForm();
				setDesignations(null);
				setIsOpen(false);
			} catch (error) {
				const axiosError = error as {
					response?: {
						status?: number;
						data?: {
							message?: string;
							errors?: Record<string, string[] | string>;
						};
					};
				};

				if (axiosError.response?.status === 422 && axiosError.response.data?.errors) {
					Object.entries(axiosError.response.data.errors).forEach(([field, messages]) => {
						const message = Array.isArray(messages) ? messages[0] : messages;
						formik.setFieldError(field, message);
					});
				} else {
					showNotification(
						'Request failed',
						axiosError.response?.data?.message || 'Failed to save designation.',
						'danger',
					);
				}
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (!isAdding && !item) return null;

	const modalTitle = isAdding
		? 'Create New Designation'
		: isEditing
			? `Edit Designation - ${item?.name || ''}`
			: 'Designation Details';

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='designation-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='designation-form-modal'>{modalTitle}</ModalTitle>
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
								placeholder='Enter name'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='code' label='Code' className='col-12'>
							<Input
								name='code'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.code}
								isValid={formik.isValid}
								isTouched={formik.touched.code}
								invalidFeedback={formik.errors.code}
								placeholder='Enter code'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='description' label='Description' className='col-12'>
							<Input
								name='description'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.description}
								isValid={formik.isValid}
								isTouched={formik.touched.description}
								invalidFeedback={formik.errors.description}
								placeholder='Enter description'
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
							onEdit(item.id.toString());
						}}>
						Edit Designation
					</Button>
				)}
				{!isViewing && (
					<Button
						color='primary'
						icon={isAdding ? 'AddBusiness' : 'Save'}
						isDisable={formik.isSubmitting}
						onClick={() => formik.handleSubmit()}>
						{isAdding ? 'Add' : 'Update'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

export default DesignationFormModal;

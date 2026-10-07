import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import {
	createPermissionApi,
	getPermissionMeta,
	PermissionPayload,
	updatePermissionApi,
} from '../../../api/roles.api';
import { IPermission } from './types';

type TPermissionFormMode = 'add' | 'edit';

interface IPermissionFormModalProps {
	mode: TPermissionFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	permissions: IPermission[];
}

type TFormValues = {
	name: string;
};

const getCompanyId = () => localStorage.getItem('company_id') || '';

const PermissionFormModal: FC<IPermissionFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	permissions,
}) => {
	const queryClient = useQueryClient();
	const isEditing = mode === 'edit';
	const permission = isEditing
		? permissions.find((item) => item.id.toString() === id?.toString()) || null
		: null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: permission?.name || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.name.trim()) errors.name = 'Permission name is required';

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const permissionMeta = getPermissionMeta(values.name.trim());
				const payload: PermissionPayload = {
					name: values.name.trim(),
					label: permissionMeta.label,
					group: permissionMeta.group,
					company_id: getCompanyId() || undefined,
				};

				if (isEditing) {
					if (!id) return;
					await updatePermissionApi(id, payload);
				} else {
					await createPermissionApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon icon={isEditing ? 'Edit' : 'AddTask'} size='lg' className='me-1' />
						<span>{isEditing ? 'Permission Updated' : 'Permission Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['permissions'] });
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
						if (field in formik.initialValues) {
							formik.setFieldError(field as keyof TFormValues, message);
						}
					});
				} else {
					showNotification(
						'Request failed',
						axiosError.response?.data?.message || 'Failed to save permission.',
						'danger',
					);
				}
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !permission) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='permission-form-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='permission-form-modal'>
					{isEditing ? `Edit Permission - ${permission?.name}` : 'Create Permission'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup
							id='name'
							label='Permission Name'
							className='col-12'
							formText='Use hyphens to structure it. Example: admin-user-create'>
							<Input
								name='name'
								placeholder='ex: admin-user-create'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon={isEditing ? 'Save' : 'AddTask'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Permission' : 'Create Permission'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default PermissionFormModal;

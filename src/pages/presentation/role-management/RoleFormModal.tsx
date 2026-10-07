import React, { FC, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import classNames from 'classnames';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Checks from '../../../components/bootstrap/forms/Checks';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import useDarkMode from '../../../hooks/useDarkMode';
import { createRoleApi, updateRoleApi, Role } from '../../../api/roles.api';
import { ALL_PERMISSIONS_ARRAY } from '../../../constants/permissions';

type TRoleFormMode = 'add' | 'edit';

interface IRoleFormModalProps {
	mode: TRoleFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	roles: Role[];
}

type TFormValues = {
	name: string;
	description: string;
	permissions: string[];
};

const getPermissionGroup = (permissionName: string) => {
	const prefix = permissionName.split('-')[0] || '';
	return prefix.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getPermissionLabel = (permissionName: string) => {
	const parts = permissionName.split('-');
	const action = parts.slice(2).join(' ') || parts.join(' ');
	return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const RoleFormModal: FC<IRoleFormModalProps> = ({ mode, id, isOpen, setIsOpen, roles }) => {
	const queryClient = useQueryClient();
	const { darkModeStatus } = useDarkMode();
	const isEditing = mode === 'edit';
	const role = isEditing
		? roles.find((item) => item.id.toString() === id?.toString()) || null
		: null;

	const groupedPermissions = useMemo(() => {
		return ALL_PERMISSIONS_ARRAY.reduce<Record<string, string[]>>((groups, permission) => {
			const group = getPermissionGroup(permission);
			if (!groups[group]) groups[group] = [];
			groups[group].push(permission);
			return groups;
		}, {});
	}, []);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: role?.name || '',
			description: role?.description || '',
			permissions: role?.permissions || [],
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.name.trim()) errors.name = 'Role name is required';
			if (!values.permissions.length) {
				errors.permissions = 'Select at least one permission';
			}

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					name: values.name.trim(),
					roleName: values.name.trim(),
					description: values.description.trim() || undefined,
					permissions: values.permissions,
				};

				if (isEditing) {
					if (!id) return;
					await updateRoleApi(id, payload);
				} else {
					await createRoleApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon
							icon={isEditing ? 'Edit' : 'AdminPanelSettings'}
							size='lg'
							className='me-1'
						/>
						<span>{isEditing ? 'Role Updated' : 'Role Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['roles'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save role.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	const togglePermission = (permission: string) => {
		const nextPermissions = formik.values.permissions.includes(permission)
			? formik.values.permissions.filter((item) => item !== permission)
			: [...formik.values.permissions, permission];

		formik.setFieldValue('permissions', nextPermissions);
	};

	const setGroupPermissions = (groupPermissions: string[], checked: boolean) => {
		const nextPermissionSet = new Set(formik.values.permissions);

		groupPermissions.forEach((permission) => {
			if (checked) nextPermissionSet.add(permission);
			else nextPermissionSet.delete(permission);
		});

		formik.setFieldValue('permissions', Array.from(nextPermissionSet));
	};

	if (isEditing && !role && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='xl'
			titleId='role-form-modal'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='role-form-modal'>
					{isEditing ? `Edit Role - ${role?.name}` : 'Create Role'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='name' label='Role Name' className='col-md-6'>
							<Input
								name='name'
								placeholder='Enter role name'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='description' label='Description' className='col-md-6'>
							<Textarea
								name='description'
								rows={1}
								placeholder='Optional description'
								value={formik.values.description}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.description}
								invalidFeedback={formik.errors.description}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<div className='col-12'>
							<div className='d-flex align-items-center justify-content-between mb-3 gap-2'>
								<div>
									<h5 className='mb-1'>Assign Permissions</h5>
									<p className='text-muted small mb-0'>
										{formik.values.permissions.length} selected
									</p>
								</div>
								<div className='d-flex gap-2'>
									<Button
										color='light'
										size='sm'
										isDisable={formik.isSubmitting}
										onClick={() =>
											formik.setFieldValue(
												'permissions',
												ALL_PERMISSIONS_ARRAY,
											)
										}>
										Select All
									</Button>
									<Button
										color='light'
										size='sm'
										isDisable={
											formik.isSubmitting || !formik.values.permissions.length
										}
										onClick={() => formik.setFieldValue('permissions', [])}>
										Clear
									</Button>
								</div>
							</div>
							<div className='row g-4'>
								{Object.entries(groupedPermissions).map(([groupName, items]) => {
									const selectedCount = items.filter((item) =>
										formik.values.permissions.includes(item),
									).length;
									const isAllSelected =
										items.length > 0 && selectedCount === items.length;

									return (
										<div key={groupName} className='col-12 col-lg-6'>
											<div
												className={classNames(
													'border rounded-3 p-3 h-100',
													{
														'bg-dark text-light': darkModeStatus,
														'bg-l10-dark': !darkModeStatus,
													},
												)}>
												<div className='d-flex align-items-start justify-content-between gap-3 mb-3'>
													<div>
														<h6 className='mb-1'>{groupName}</h6>
														<p
															className={classNames('small mb-0', {
																'text-light': darkModeStatus,
																'text-muted': !darkModeStatus,
															})}>
															{selectedCount}/{items.length} selected
														</p>
													</div>
													<Checks
														id={`group-${groupName}`}
														label='All'
														checked={isAllSelected}
														disabled={formik.isSubmitting}
														onChange={(e: any) =>
															setGroupPermissions(
																items,
																e.target.checked,
															)
														}
													/>
												</div>
												<div className='d-grid gap-2'>
													{items.map((permission) => (
														<Checks
															key={permission}
															id={`permission-${permission}`}
															label={`${permission
																.split('-')[1]
																.replace(/_/g, ' ')
																.replace(/\b\w/g, (c) =>
																	c.toUpperCase(),
																)} ${getPermissionLabel(permission)}`}
															checked={formik.values.permissions.includes(
																permission,
															)}
															disabled={formik.isSubmitting}
															onChange={() =>
																togglePermission(permission)
															}
														/>
													))}
												</div>
											</div>
										</div>
									);
								})}
							</div>
							{formik.errors.permissions && (
								<div className='text-danger small mt-2'>
									{formik.errors.permissions}
								</div>
							)}
						</div>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon={isEditing ? 'Save' : 'AdminPanelSettings'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Role' : 'Create Role'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default RoleFormModal;

import React, { FC, useMemo } from 'react';
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
import { createUserApi, updateUserApi, User } from '../../../api/users.api';
import { Department } from '../../../api/notifications.api';
import { useRoles } from '../../../hooks/useRoles';
import { Role } from '../../../api/roles.api';

export type TUserFormMode = 'add' | 'edit';

interface IUserFormModalProps {
	mode: TUserFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	users: User[];
}

type TFormValues = {
	name: string;
	email: string;
	phone: string;
	address: string;
	password?: string;
	password_confirmation?: string;
	users_has_roles: string[];
	departments: Department[];
};

// Departments drive the Multi-Department Procurement Workflow (SL Operations →
// Procurement → Finance handoffs) and gate who sees the live notification bell.
const DEPARTMENT_OPTIONS: { value: Department; label: string; description: string }[] = [
	{
		value: 'SL_OPERATIONS',
		label: 'SL Operations',
		description: 'Creates purchase inquiries and re-confirms GF Office replies.',
	},
	{
		value: 'PROCUREMENT',
		label: 'Procurement',
		description: 'Bridges the GF Office by email and drives the PR → PO workflow.',
	},
	{
		value: 'FINANCE',
		label: 'Finance',
		description: 'Approves purchase orders and processes payments (TT).',
	},
	{
		value: 'WAREHOUSE',
		label: 'Warehouse',
		description: 'Manages inventory and processes shipments.',
	},
	{
		value: 'SHOWROOM',
		label: 'Showroom',
		description: 'Manages inventory and processes shipments.',
	},
];

const getRoleName = (role: NonNullable<User['users_has_roles']>[number]) => {
	if (typeof role === 'string' || typeof role === 'number') return String(role);
	return (
		role.role?.name ??
		role.role?.roleName ??
		role.role?.role_name ??
		role.name ??
		role.roleName ??
		role.role_name
	);
};

const getUserRoles = (user?: User | null, availableRoles: Role[] = []) => {
	const rawRoles =
		user?.users_has_roles ??
		user?.usersHasRoles ??
		user?.user_roles ??
		user?.userRoles ??
		user?.assignedRoles ??
		user?.roles ??
		[];

	return rawRoles
		.map((role) => {
			if (typeof role === 'string' || typeof role === 'number') return String(role);

			const roleId = role.role_id ?? role.roleId ?? role.role?.id ?? role.id;
			if (roleId) return String(roleId);

			const roleName = getRoleName(role);
			const matchedRole = availableRoles.find(
				(availableRole) =>
					availableRole.name === roleName || availableRole.roleName === roleName,
			);

			return matchedRole ? String(matchedRole.id) : '';
		})
		.filter(Boolean);
};

const UserFormModal: FC<IUserFormModalProps> = ({ mode, id, isOpen, setIsOpen, users }) => {
	const queryClient = useQueryClient();
	const { data: roles = [], isLoading: rolesLoading } = useRoles();
	const isEditing = mode === 'edit';
	const isAdding = mode === 'add';

	const item = useMemo(() => {
		if (isAdding) return null;
		return users.find((u) => u.id.toString() === id?.toString()) || null;
	}, [isAdding, users, id]);

	const initialValues = useMemo<TFormValues>(
		() => ({
			name: item?.name || '',
			email: item?.email || '',
			phone: item?.phone || '',
			address: item?.address || '',
			password: '',
			password_confirmation: '',
			users_has_roles: getUserRoles(item, roles),
			departments: item?.departments ?? [],
		}),
		[item, roles],
	);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues,
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.name.trim()) errors.name = 'Name is required';
			if (!values.email.trim()) errors.email = 'Email is required';
			if (!values.phone.trim()) errors.phone = 'Phone is required';
			if (!values.address.trim()) errors.address = 'Address is required';
			if (!values.users_has_roles.length) {
				errors.users_has_roles = 'Select at least one role';
			}

			if (isAdding && !values.password) errors.password = 'Password is required';
			if (isAdding && !values.password_confirmation) {
				errors.password_confirmation = 'Confirm password is required';
			}
			if (
				values.password &&
				values.password_confirmation &&
				values.password !== values.password_confirmation
			) {
				errors.password_confirmation = 'Passwords do not match';
			}

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					name: values.name.trim(),
					username: values.name.trim(),
					email: values.email.trim(),
					phone: values.phone.trim(),
					address: values.address.trim(),
					password: values.password || undefined,
					users_has_roles: values.users_has_roles.map((roleId) => {
						const numericRoleId = Number(roleId);
						return Number.isFinite(numericRoleId) ? numericRoleId : roleId;
					}),
					departments: values.departments,
				};

				if (isAdding) {
					await createUserApi(payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='PersonAdd' size='lg' className='me-1' />
							<span>User Created</span>
						</span>,
						`${values.name} has been added successfully.`,
					);
				} else if (isEditing) {
					if (!id) return;
					await updateUserApi(id, payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Edit' size='lg' className='me-1' />
							<span>User Updated</span>
						</span>,
						`${values.name} has been updated successfully.`,
					);
				}

				await queryClient.invalidateQueries({ queryKey: ['users'] });
				resetForm();
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save user.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (!isAdding && !item && isOpen) return null;

	const toggleRole = (roleId: string) => {
		const nextRoles = formik.values.users_has_roles.includes(roleId)
			? formik.values.users_has_roles.filter((itemRoleId) => itemRoleId !== roleId)
			: [...formik.values.users_has_roles, roleId];

		formik.setFieldValue('users_has_roles', nextRoles);
	};

	const toggleDepartment = (dept: Department) => {
		const nextDepartments = formik.values.departments.includes(dept)
			? formik.values.departments.filter((d) => d !== dept)
			: [...formik.values.departments, dept];

		formik.setFieldValue('departments', nextDepartments);
	};

	const modalTitle = isAdding ? 'Create New User' : `Edit User - ${item?.name || ''}`;

	const submitLabel = isAdding ? 'Add' : 'Update';

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='user-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='user-form-modal'>{modalTitle}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='name' label='Full Name' className='col-md-6'>
							<Input
								name='name'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.name}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								placeholder='Enter name'
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='email' label='Email' className='col-md-6'>
							<Input
								name='email'
								type='email'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.email}
								isValid={formik.isValid}
								isTouched={formik.touched.email}
								invalidFeedback={formik.errors.email}
								placeholder='Enter email'
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='phone' label='Phone' className='col-md-6'>
							<Input
								name='phone'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.phone}
								isValid={formik.isValid}
								isTouched={formik.touched.phone}
								invalidFeedback={formik.errors.phone}
								placeholder='Enter phone'
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='address' label='Address' className='col-md-6'>
							<Input
								name='address'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.address}
								isValid={formik.isValid}
								isTouched={formik.touched.address}
								invalidFeedback={formik.errors.address}
								placeholder='Enter address'
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						{(isAdding || formik.values.password !== undefined) && (
							<>
								<FormGroup
									id='password'
									label={isAdding ? 'Password' : 'New Password (Optional)'}
									className='col-md-6'>
									<Input
										name='password'
										type='password'
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										value={formik.values.password}
										isValid={formik.isValid}
										isTouched={formik.touched.password}
										invalidFeedback={formik.errors.password}
										placeholder='Enter password'
										disabled={formik.isSubmitting}
									/>
								</FormGroup>
								<FormGroup
									id='password_confirmation'
									label='Confirm Password'
									className='col-md-6'>
									<Input
										name='password_confirmation'
										type='password'
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										value={formik.values.password_confirmation}
										isValid={formik.isValid}
										isTouched={formik.touched.password_confirmation}
										invalidFeedback={formik.errors.password_confirmation}
										placeholder='Confirm password'
										disabled={formik.isSubmitting}
									/>
								</FormGroup>
							</>
						)}
						<div className='col-12'>
							<div className='d-flex align-items-center justify-content-between mb-2'>
								<div className='form-label fw-semibold mb-0'>Roles</div>
								<span className='text-muted small'>
									{formik.values.users_has_roles.length} selected
								</span>
							</div>
							<div className='border rounded-3 p-3'>
								{rolesLoading ? (
									<div className='text-muted small'>Loading roles...</div>
								) : roles.length ? (
									<div className='row g-2'>
										{roles.map((role) => (
											<div key={role.id} className='col-md-6'>
												<label className='d-flex align-items-start gap-2 mb-0'>
													<input
														type='checkbox'
														className='form-check-input mt-1'
														checked={formik.values.users_has_roles.includes(
															String(role.id),
														)}
														disabled={formik.isSubmitting}
														onChange={() => toggleRole(String(role.id))}
													/>
													<span>
														<span className='fw-semibold d-block'>
															{role.name}
														</span>
														{role.description && (
															<span className='text-muted small'>
																{role.description}
															</span>
														)}
													</span>
												</label>
											</div>
										))}
									</div>
								) : (
									<div className='text-muted small'>No roles available.</div>
								)}
							</div>
							{formik.touched.users_has_roles && formik.errors.users_has_roles && (
								<div className='text-danger small mt-1'>
									{formik.errors.users_has_roles}
								</div>
							)}
						</div>
						<div className='col-12'>
							<div className='d-flex align-items-center justify-content-between mb-2'>
								<div className='form-label fw-semibold mb-0'>
									Departments
									<span className='text-muted small fw-normal ms-2'>
										(procurement workflow &amp; notifications)
									</span>
								</div>
								<span className='text-muted small'>
									{formik.values.departments.length} selected
								</span>
							</div>
							<div className='border rounded-3 p-3'>
								<div className='row g-2'>
									{DEPARTMENT_OPTIONS.map((dept) => (
										<div key={dept.value} className='col-md-4'>
											<label className='d-flex align-items-start gap-2 mb-0'>
												<input
													type='checkbox'
													className='form-check-input mt-1'
													checked={formik.values.departments.includes(
														dept.value,
													)}
													disabled={formik.isSubmitting}
													onChange={() => toggleDepartment(dept.value)}
												/>
												<span>
													<span className='fw-semibold d-block'>
														{dept.label}
													</span>
													<span className='text-muted small'>
														{dept.description}
													</span>
												</span>
											</label>
										</div>
									))}
								</div>
							</div>
							{!formik.values.departments.length && (
								<div className='text-muted small mt-1'>
									Without a department this user won&apos;t see procurement
									notifications or department-gated pages.
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
					icon={isAdding ? 'PersonAdd' : 'Save'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{submitLabel}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default UserFormModal;

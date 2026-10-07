import React, { FC } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import { User } from '../../../api/users.api';
import { Department } from '../../../api/notifications.api';

const getUserCreatedAt = (user: User) => user.createdAt ?? user.created_at;
const getUserRoleLabel = (role: NonNullable<User['users_has_roles']>[number]) => {
	if (typeof role === 'string' || typeof role === 'number') return String(role);
	return (
		role.role?.name ??
		role.role?.roleName ??
		role.role?.role_name ??
		role.name ??
		role.roleName ??
		role.role_name ??
		String(role.role_id ?? role.roleId ?? role.role?.id ?? role.id ?? '')
	);
};
const getUserRoles = (user: User) =>
	user.users_has_roles ??
	user.usersHasRoles ??
	user.user_roles ??
	user.userRoles ??
	user.assignedRoles ??
	user.roles ??
	[];

const DEPARTMENT_LABELS: Record<Department, string> = {
	SL_OPERATIONS: 'SL Operations',
	PROCUREMENT: 'Procurement',
	FINANCE: 'Finance',
};

interface IUserViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	users: User[];
	onEdit?(id: string): void;
}

const UserViewModal: FC<IUserViewModalProps> = ({ id, isOpen, setIsOpen, users, onEdit }) => {
	const item = id ? users.find((u) => u.id.toString() === id.toString()) : null;

	if (!item) return null;

	const initials = item.name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
	const userRoles = getUserRoles(item);
	const userDepartments = item.departments ?? [];

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='user-view-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 border-bottom-0'>
				<ModalTitle id='user-view-modal'>User Profile Details</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<div className='row g-4'>
					{/* Left Column: Profile Card */}
					<div className='col-lg-4'>
						<div className='border rounded-3 p-4 h-100 bg-l25-primary shadow-sm'>
							<div className='d-flex flex-column align-items-center text-center'>
								<div className='position-relative mb-3'>
									<div
										className='d-flex align-items-center justify-content-center rounded-circle fw-bold text-white fs-1 shadow-sm border border-3 border-white'
										style={{
											width: 130,
											height: 130,
											background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
										}}>
										{initials}
									</div>
								</div>

								<h4 className='fw-bold mb-1' style={{ color: '#000' }}>
									{item.name}
								</h4>
								<p
									className='mb-3 d-flex align-items-center justify-content-center gap-2'
									style={{ color: '#6793a3' }}>
									<Icon icon='Email' size='sm' /> {item.email || 'No email'}
								</p>
							</div>
						</div>
					</div>

					{/* Right Column: Detailed Info Sections */}
					<div className='col-lg-8'>
						<div className='row g-4'>
							{/* Contact Information */}
							<div className='col-12'>
								<div className='d-flex align-items-center mb-3'>
									<Icon
										icon='ContactPhone'
										color='primary'
										className='me-2'
										size='lg'
									/>
									<h5 className='fw-bold mb-0'>Contact Information</h5>
								</div>
								<div className='row g-3'>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3 bg-body-tertiary'>
											<div className='text-muted small mb-1'>Full Name</div>
											<div className='fw-semibold d-flex align-items-center gap-2'>
												{item.name}
											</div>
										</div>
									</div>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3 bg-body-tertiary'>
											<div className='text-muted small mb-1'>Email</div>
											<div className='fw-semibold d-flex align-items-center gap-2'>
												{item.email || '—'}
											</div>
										</div>
									</div>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3 bg-body-tertiary'>
											<div className='text-muted small mb-1'>Phone</div>
											<div className='fw-semibold d-flex align-items-center gap-2'>
												{item.phone || '—'}
											</div>
										</div>
									</div>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3 bg-body-tertiary'>
											<div className='text-muted small mb-1'>Address</div>
											<div className='fw-semibold d-flex align-items-center gap-2'>
												{item.address || '—'}
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Account Details */}
							<div className='col-12'>
								<div className='d-flex align-items-center mb-3'>
									<Icon
										icon='ManageAccounts'
										color='warning'
										className='me-2'
										size='lg'
									/>
									<h5 className='fw-bold mb-0'>Account Details</h5>
								</div>
								<div className='row g-3'>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3 d-flex justify-content-between align-items-center'>
											<div>
												<div className='text-muted small mb-1'>
													Account Created
												</div>
												<div className='fw-semibold'>
													{getUserCreatedAt(item)
														? new Date(
																getUserCreatedAt(item) as string,
															).toLocaleDateString()
														: '—'}
												</div>
											</div>
											<Icon
												icon='Event'
												color='muted'
												size='2x'
												className='opacity-25'
											/>
										</div>
									</div>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3'>
											<div className='text-muted small mb-1'>Roles</div>
											<div className='fw-semibold d-flex flex-wrap gap-2'>
												{userRoles.length
													? userRoles.map((role, index) => (
															<span
																key={`${getUserRoleLabel(role)}-${index}`}
																className='badge bg-primary'>
																{getUserRoleLabel(role)}
															</span>
														))
													: '—'}
											</div>
										</div>
									</div>
									<div className='col-md-6'>
										<div className='border rounded-3 p-3'>
											<div className='text-muted small mb-1'>Departments</div>
											<div className='fw-semibold d-flex flex-wrap gap-2'>
												{userDepartments.length
													? userDepartments.map((dept) => (
															<span
																key={dept}
																className='badge bg-info'>
																{DEPARTMENT_LABELS[dept] ?? dept}
															</span>
														))
													: '—'}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex justify-content-between'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
				{onEdit && (
					<Button
						color='primary'
						icon='Edit'
						onClick={() => {
							setIsOpen(false);
							onEdit(item.id.toString());
						}}>
						Edit Profile
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

export default UserViewModal;

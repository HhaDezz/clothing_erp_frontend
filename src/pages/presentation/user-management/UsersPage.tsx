import React, { useMemo, useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import { masterDataMenu } from '../../../menu';
import Card, {
	CardBody,
	CardHeader,
	CardLabel,
	CardSubTitle,
	CardTitle,
} from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import useDarkMode from '../../../hooks/useDarkMode';
import { useUsers } from '../../../hooks/useUsers';
import { User } from '../../../api/users.api';
import { Department } from '../../../api/notifications.api';
import UserEditModal from './UserEditModal';
import UserViewModal from './UserViewModal';
import UserDeleteModal from './UserDeleteModal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import { useRoles } from '../../../hooks/useRoles';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
	name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

const getUserCreatedAt = (user: User) => user.createdAt ?? user.created_at;
const getUserRoleId = (role: NonNullable<User['users_has_roles']>[number]) => {
	if (typeof role === 'string' || typeof role === 'number') return String(role);
	return String(role.role_id ?? role.roleId ?? role.role?.id ?? role.id ?? '');
};
const getUserRoleLabel = (
	role: NonNullable<User['users_has_roles']>[number],
	roleNameById: Map<string, string>,
) => {
	if (typeof role === 'object') {
		const embeddedName =
			role.role?.name ??
			role.role?.roleName ??
			role.role?.role_name ??
			role.name ??
			role.roleName ??
			role.role_name;
		if (embeddedName) return embeddedName;
	}

	const roleId = getUserRoleId(role);
	return roleNameById.get(roleId) ?? roleId;
};
const getUserRoles = (user: User) =>
	user.users_has_roles ??
	user.usersHasRoles ??
	user.user_roles ??
	user.userRoles ??
	user.assignedRoles ??
	user.roles ??
	[];
const getDateLabel = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');
const getAvatarIndex = (id: string | number) => {
	const numericId = Number(id);
	return Number.isFinite(numericId) ? numericId : String(id).length;
};

const DEPARTMENT_LABELS: Record<Department, string> = {
	SL_OPERATIONS: 'SL Operations',
	PROCUREMENT: 'Procurement',
	FINANCE: 'Finance',
};
const DEPARTMENT_COLORS: Record<Department, string> = {
	SL_OPERATIONS: 'info',
	PROCUREMENT: 'primary',
	FINANCE: 'success',
};

// ─── Gradient palette by index ────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
	'linear-gradient(135deg,#2563eb,#60a5fa)',
	'linear-gradient(135deg,#0e4521,#127838)',
	'linear-gradient(135deg,#28a745,#34d399)',
	'linear-gradient(135deg,#1b5e20,#4caf50)',
	'linear-gradient(135deg,#0f5132,#198754)',
	'linear-gradient(135deg,#14b8a6,#2dd4bf)',
	'linear-gradient(135deg,#2e7d32,#66bb6a)',
	'linear-gradient(135deg,#33691e,#8bc34a)',
];

// ─── Component ────────────────────────────────────────────────────────────────
const UsersPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();
	const { data: users = [], isLoading, error } = useUsers();
	const { data: roles = [] } = useRoles();
	const [localUsers, setLocalUsers] = useState<User[] | null>(null);

	const [viewId, setViewId] = useState<string | null>(null);
	const [viewOpen, setViewOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const currentUsers = localUsers ?? users;
	const canView = hasPermission(PERMISSIONS.SHOW_USER);
	const canCreate = hasPermission(PERMISSIONS.CREATE_USER);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_USER);
	const canDelete = hasPermission(PERMISSIONS.DELETE_USER);
	const roleNameById = useMemo(
		() => new Map(roles.map((role) => [String(role.id), role.name])),
		[roles],
	);

	const openView = (id: string) => {
		setViewId(id);
		setViewOpen(true);
	};
	const openEdit = (id: string | null) => {
		setEditId(id);
		setEditOpen(true);
	};
	const openDelete = (id: string) => {
		setDeleteId(id);
		setDeleteOpen(true);
	};

	const columns: DataTableColumn<User>[] = [
		{
			key: 'name',
			label: 'User',
			width: '24%',
			render: (user) => (
				<div className='d-flex align-items-center gap-3'>
					<div
						className='d-flex align-items-center justify-content-center rounded-circle fw-bold text-white'
						style={{
							width: 40,
							height: 40,
							fontSize: '0.85rem',
							flexShrink: 0,
							background:
								AVATAR_GRADIENTS[getAvatarIndex(user.id) % AVATAR_GRADIENTS.length],
						}}>
						{getInitials(user.name)}
					</div>
					<div>
						<div className='fw-bold'>{user.name}</div>
						<div className='text-muted small' style={{ fontSize: '0.78rem' }}>
							{user.email || 'No email'}
						</div>
					</div>
				</div>
			),
			exportValue: (user) => `${user.name} <${user.email || ''}>`,
			sortValue: (user) => user.name,
		},
		{
			key: 'phone',
			label: 'Phone',
			width: '12%',
			render: (user) => user.phone || '—',
			exportValue: (user) => user.phone || '',
		},
		{
			key: 'address',
			label: 'Address',
			width: '18%',
			render: (user) => (
				<span className={user.address ? '' : 'text-muted'}>{user.address || '—'}</span>
			),
			exportValue: (user) => user.address || '',
		},
		{
			key: 'users_has_roles',
			label: 'Roles',
			width: '18%',
			render: (user) => {
				const userRoles = getUserRoles(user);
				const labels = userRoles.map((role) => getUserRoleLabel(role, roleNameById));

				return (
					<div className='d-flex flex-wrap gap-2'>
						{labels.length ? (
							labels.slice(0, 2).map((roleName, index) => (
								<Badge key={`${roleName}-${index}`} color='primary' isLight>
									{roleName}
								</Badge>
							))
						) : (
							<span className='text-muted'>—</span>
						)}
						{userRoles.length > 2 && (
							<Badge color='secondary' isLight>
								+{userRoles.length - 2} more
							</Badge>
						)}
					</div>
				);
			},
			exportValue: (user) =>
				getUserRoles(user)
					.map((role) => getUserRoleLabel(role, roleNameById))
					.join(', '),
			sortValue: (user) =>
				getUserRoles(user)
					.map((role) => getUserRoleLabel(role, roleNameById))
					.join(', '),
		},
		{
			key: 'departments',
			label: 'Departments',
			width: '16%',
			render: (user) => {
				const departments = user.departments ?? [];
				return (
					<div className='d-flex flex-wrap gap-2'>
						{departments.length ? (
							departments.map((dept) => (
								<Badge key={dept} color={DEPARTMENT_COLORS[dept] as any} isLight>
									{DEPARTMENT_LABELS[dept] ?? dept}
								</Badge>
							))
						) : (
							<span className='text-muted'>—</span>
						)}
					</div>
				);
			},
			exportValue: (user) =>
				(user.departments ?? []).map((dept) => DEPARTMENT_LABELS[dept] ?? dept).join(', '),
			sortValue: (user) =>
				(user.departments ?? []).map((dept) => DEPARTMENT_LABELS[dept] ?? dept).join(', '),
		},
		{
			key: 'created_at',
			label: 'Created',
			align: 'center',
			width: '12%',
			render: (user) => (
				<div className='d-flex align-items-center justify-content-center gap-1'>
					<Icon
						icon='CalendarToday'
						size='sm'
						className={`text-${darkModeStatus ? 'light' : 'muted'}`}
					/>
					{getDateLabel(getUserCreatedAt(user))}
				</div>
			),
			exportValue: (user) => getDateLabel(getUserCreatedAt(user)),
			sortValue: (user) =>
				getUserCreatedAt(user) ? new Date(getUserCreatedAt(user) as string) : null,
		},
	];

	return (
		<PageWrapper title={masterDataMenu.users.text} requiredPermission={PERMISSIONS.SHOW_USER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='People' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Users</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-user'
								icon='PersonAdd'
								color='primary'
								isLight
								onClick={() => openEdit(null)}>
								New User
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='People' iconColor='primary'>
									<CardTitle>User Management</CardTitle>
									<CardSubTitle>
										Manage user contact details, roles, and department
										assignment (drives procurement workflow access and
										notifications).
									</CardSubTitle>
								</CardLabel>
							</CardHeader>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={[
										...columns,
										{
											key: 'actions',
											label: '',
											align: 'right',
											sortable: false,
											searchable: false,
											render: (user) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () =>
																			openView(
																				user.id.toString(),
																			),
																	},
																]
															: []),
														...(canUpdate
															? [
																	{
																		key: 'edit',
																		label: 'Edit',
																		icon: 'ti ti-edit',
																		className: 'text-primary',
																		onClick: () =>
																			openEdit(
																				user.id.toString(),
																			),
																	},
																]
															: []),
														...(canDelete
															? [
																	{
																		key: 'delete',
																		label: 'Delete',
																		icon: 'ti ti-trash',
																		className: 'text-danger',
																		onClick: () =>
																			openDelete(
																				user.id.toString(),
																			),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={currentUsers}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='users'
									emptyText='No users found.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<UserViewModal
				id={viewId}
				isOpen={viewOpen}
				setIsOpen={setViewOpen}
				users={currentUsers}
				onEdit={canUpdate ? (id) => openEdit(id) : undefined}
			/>
			<UserEditModal
				id={editId}
				isOpen={editOpen}
				setIsOpen={setEditOpen}
				users={currentUsers}
				setUsers={setLocalUsers}
			/>
			<UserDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				users={currentUsers}
				setUsers={setLocalUsers}
			/>
		</PageWrapper>
	);
};

export default UsersPage;

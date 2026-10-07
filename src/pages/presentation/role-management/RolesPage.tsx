import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
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
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import useDarkMode from '../../../hooks/useDarkMode';
import { useRoles } from '../../../hooks/useRoles';
import RoleFormModal from './RoleFormModal';
import { Role } from '../../../api/roles.api';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';

const RolesPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();

	const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
	const canShowRoles = hasPermission(PERMISSIONS.SHOW_ROLE);
	const canCreateRole = hasPermission(PERMISSIONS.CREATE_ROLE);
	const canUpdateRole = hasPermission(PERMISSIONS.UPDATE_ROLE);

	const [roleEditId, setRoleEditId] = useState<string | null>(null);
	const [roleModalMode, setRoleModalMode] = useState<'add' | 'edit'>('add');
	const [roleModalOpen, setRoleModalOpen] = useState(false);

	const openCreateRole = () => {
		setRoleEditId(null);
		setRoleModalMode('add');
		setRoleModalOpen(true);
	};

	const openEditRole = (id: string) => {
		setRoleEditId(id);
		setRoleModalMode('edit');
		setRoleModalOpen(true);
	};

	const roleColumns: DataTableColumn<Role>[] = [
		{
			key: 'name',
			label: 'Role',
			render: (role) => <span className='fw-bold'>{role.name}</span>,
		},
		{
			key: 'description',
			label: 'Description',
			render: (role) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
					{role.description || '—'}
				</span>
			),
			exportValue: (role) => role.description || '',
		},
		{
			key: 'permission_count',
			label: 'Permissions',
			align: 'center',
			render: (role) => (
				<Badge color='primary' isLight>
					{role.permissions?.length || 0}
				</Badge>
			),
			exportValue: (role) => role.permissions?.length || 0,
		},
		{
			key: 'permission_preview',
			label: 'Assigned Permissions',
			render: (role) => (
				<div className='d-flex flex-wrap gap-2'>
					{role.permissions?.slice(0, 3).map((permission) => (
						<Badge key={permission} color='secondary' isLight>
							{permission}
						</Badge>
					))}
					{(role.permissions?.length || 0) > 3 && (
						<Badge color='secondary' isLight>
							+{(role.permissions?.length || 0) - 3} more
						</Badge>
					)}
				</div>
			),
			exportValue: (role) => (role.permissions || []).join(', '),
		},
	];

	return (
		<PageWrapper title={masterDataMenu.roles.text} requiredPermission={[PERMISSIONS.SHOW_ROLE]}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='AdminPanelSettings' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Roles & Permissions</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreateRole && <SubheaderSeparator />}
					{canCreateRole && (
						<Button color='primary' icon='AdminPanelSettings' onClick={openCreateRole}>
							New Role
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row g-4'>
					{canShowRoles && (
						<div className='col-12'>
							<Card stretch>
								<CardHeader>
									<CardLabel icon='Shield' iconColor='primary'>
										<CardTitle>Role Management</CardTitle>
										<CardSubTitle>
											Create roles and assign permissions through a modal.
										</CardSubTitle>
									</CardLabel>
								</CardHeader>
								<CardBody style={{ overflow: 'visible' }}>
									<DataTable
										columns={[
											...roleColumns,
											{
												key: 'actions',
												label: '',
												align: 'right',
												sortable: false,
												searchable: false,
												render: (role) => (
													<DataTableActionMenu
														actions={
															canUpdateRole
																? [
																		{
																			key: 'edit',
																			label: 'Edit Permissions',
																			icon: 'ti ti-edit',
																			className:
																				'text-primary',
																			onClick: () =>
																				openEditRole(
																					role.id.toString(),
																				),
																		},
																	]
																: []
														}
													/>
												),
											},
										]}
										data={roles}
										rowKey='id'
										loading={rolesLoading}
										error={rolesError}
										fileName='roles'
										showActions={false}
									/>
								</CardBody>
							</Card>
						</div>
					)}
				</div>
			</Page>

			{canShowRoles && (
				<RoleFormModal
					mode={roleModalMode}
					id={roleEditId}
					isOpen={roleModalOpen}
					setIsOpen={setRoleModalOpen}
					roles={roles}
				/>
			)}
		</PageWrapper>
	);
};

export default RolesPage;

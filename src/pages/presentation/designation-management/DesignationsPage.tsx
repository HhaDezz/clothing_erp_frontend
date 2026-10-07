import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import { userManagementMenu } from '../../../menu';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import useDarkMode from '../../../hooks/useDarkMode';
import { useDesignations } from '../../../hooks/useDesignations';
import { Designation } from '../../../api/designations.api';
import DesignationFormModal from './DesignationFormModal';
import DesignationDeleteModal from './DesignationDeleteModal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';

const DesignationsPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();
	const { data: designations = [], isLoading, error } = useDesignations();
	const [localDesignations, setLocalDesignations] = useState<Designation[] | null>(null);

	const [viewId, setViewId] = useState<string | null>(null);
	const [viewOpen, setViewOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const currentDesignations = localDesignations ?? designations;
	const canView = hasPermission(PERMISSIONS.SHOW_DESIGNATION);
	const canCreate = hasPermission(PERMISSIONS.CREATE_DESIGNATION);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_DESIGNATION);
	const canDelete = hasPermission(PERMISSIONS.DELETE_DESIGNATION);

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

	const columns: DataTableColumn<Designation>[] = [
		{
			key: 'name',
			label: 'Name',
			render: (designation) => <span className={`text-${darkModeStatus ? 'light' : 'muted'}`}> {designation.name}</span>,
			exportValue: (designation) => designation.name,
		},
		{
			key: 'code',
			label: 'Code',
			align: 'center',
			render: (designation) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
					{designation.code}
				</span>
			),
			exportValue: (designation) => designation.code,
		},
		{
			key: 'description',
			label: 'Description',
			render: (designation) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
					{designation.description || '—'}
				</span>
			),
			exportValue: (designation) => designation.description || '',
		},
		// {
		// 	key: 'created_at',
		// 	label: 'Created',
		// 	align: 'center',
		// 	render: (designation) => (
		// 		<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
		// 			{designation.created_at
		// 				? new Date(designation.created_at).toLocaleDateString()
		// 				: '—'}
		// 		</span>
		// 	),
		// 	exportValue: (designation) =>
		// 		designation.created_at ? new Date(designation.created_at).toLocaleDateString() : '',
		// 	sortValue: (designation) =>
		// 		designation.created_at ? new Date(designation.created_at) : null,
		// },
	];

	return (
		<PageWrapper
			title={userManagementMenu.designations.text}
			requiredPermission={PERMISSIONS.SHOW_DESIGNATION}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Badge' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Designations</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-designation'
								icon='AddBusiness'
								color='primary'
								isLight
								onClick={() => openEdit(null)}>
								New Designation
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
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
											render: (designation) => (
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
																				designation.id.toString(),
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
																				designation.id.toString(),
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
																				designation.id.toString(),
																			),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={currentDesignations}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='designations'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<DesignationFormModal
				mode='view'
				id={viewId}
				isOpen={viewOpen}
				setIsOpen={setViewOpen}
				designations={currentDesignations}
				setDesignations={setLocalDesignations}
				onEdit={canUpdate ? (designationId) => openEdit(designationId) : undefined}
			/>
			<DesignationFormModal
				mode={editId === null ? 'add' : 'edit'}
				id={editId}
				isOpen={editOpen}
				setIsOpen={setEditOpen}
				designations={currentDesignations}
				setDesignations={setLocalDesignations}
			/>
			<DesignationDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				designations={currentDesignations}
				setDesignations={setLocalDesignations}
			/>
		</PageWrapper>
	);
};

export default DesignationsPage;

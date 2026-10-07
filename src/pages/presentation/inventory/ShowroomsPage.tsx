import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import { masterDataMenu } from '../../../menu';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import useDarkMode from '../../../hooks/useDarkMode';
import { getShowroomsApi } from '../../../api/showrooms.api';
import ShowroomFormModal from './ShowroomFormModal';
import ShowroomDeleteModal from './ShowroomDeleteModal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import type { Showroom } from '../../../api/showrooms.api';

/**
 * "Need Showroom CRUD" — a Showroom is the same underlying Warehouse table
 * as the Warehouses page, just filtered to type = SHOWROOM on the backend
 * and given its own permissions/page, so its own stock ledger, warehouse
 * access assignment, and (later) POS selling all reuse existing warehouse
 * infrastructure automatically. See ShowroomController/ShowroomService.
 */
const ShowroomsPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();
	const {
		data: showrooms = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const [viewId, setViewId] = useState<number | null>(null);
	const [viewOpen, setViewOpen] = useState(false);
	const [editId, setEditId] = useState<number | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const canView = hasPermission(PERMISSIONS.SHOW_SHOWROOM);
	const canCreate = hasPermission(PERMISSIONS.CREATE_SHOWROOM);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_SHOWROOM);
	const canDelete = hasPermission(PERMISSIONS.DELETE_SHOWROOM);

	const openView = (id: number) => {
		setViewId(id);
		setViewOpen(true);
	};
	const openEdit = (id: number | null) => {
		setEditId(id);
		setEditOpen(true);
	};
	const openDelete = (id: number) => {
		setDeleteId(id);
		setDeleteOpen(true);
	};

	const columns: DataTableColumn<Showroom>[] = [
		{
			key: 'name',
			label: 'Name',
			render: (s) => (
				<span className={`fw-bold text-${darkModeStatus ? 'light' : 'dark'}`}>{s.name}</span>
			),
			exportValue: (s) => s.name,
		},
		{
			key: 'address',
			label: 'Address',
			render: (s) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
					{s.address || <span className='fst-italic'>—</span>}
				</span>
			),
			exportValue: (s) => s.address ?? '',
		},
		{
			key: 'contactPerson',
			label: 'Contact Person',
			render: (s) => s.contactPerson || <span className='text-muted fst-italic'>—</span>,
			exportValue: (s) => s.contactPerson ?? '',
		},
	];

	return (
		<PageWrapper title={masterDataMenu.showrooms.text} requiredPermission={PERMISSIONS.SHOW_SHOWROOM}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Storefront' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Showrooms</span>
					<span className='text-muted small ms-2 d-none d-md-inline'>
						Sales outlets that receive stock issued from your warehouses
					</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-showroom'
								icon='Add'
								color='primary'
								isLight
								onClick={() => openEdit(null)}>
								New Showroom
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
											render: (s) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () => openView(s.id),
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
																		onClick: () => openEdit(s.id),
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
																		onClick: () => openDelete(s.id),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={showrooms}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='showrooms'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ShowroomFormModal
				mode='view'
				id={viewId}
				isOpen={viewOpen}
				setIsOpen={setViewOpen}
				showrooms={showrooms}
				onEdit={canUpdate ? (id) => openEdit(id) : undefined}
			/>
			<ShowroomFormModal
				mode={editId === null ? 'add' : 'edit'}
				id={editId}
				isOpen={editOpen}
				setIsOpen={setEditOpen}
				showrooms={showrooms}
			/>
			<ShowroomDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				showrooms={showrooms}
			/>
		</PageWrapper>
	);
};

export default ShowroomsPage;

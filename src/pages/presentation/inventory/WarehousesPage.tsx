import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import { inventoryMenu } from '../../../menu';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import useDarkMode from '../../../hooks/useDarkMode';
import { getWarehousesApi } from '../../../api/warehouses.api';
import WarehouseFormModal from './WarehouseFormModal';
import WarehouseDeleteModal from './WarehouseDeleteModal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import type { Warehouse } from '../../../api/warehouses.api';

const WarehousesPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();
	const {
		data: warehouses = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ['warehouses'], queryFn: getWarehousesApi });

	const [viewId, setViewId] = useState<number | null>(null);
	const [viewOpen, setViewOpen] = useState(false);
	const [editId, setEditId] = useState<number | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const canView = hasPermission(PERMISSIONS.SHOW_WAREHOUSE);
	const canCreate = hasPermission(PERMISSIONS.CREATE_WAREHOUSE);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_WAREHOUSE);
	const canDelete = hasPermission(PERMISSIONS.DELETE_WAREHOUSE);

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

	const columns: DataTableColumn<Warehouse>[] = [
		{
			key: 'name',
			label: 'Name',
			render: (w) => (
				<span className={`fw-bold text-${darkModeStatus ? 'light' : 'dark'}`}>{w.name}</span>
			),
			exportValue: (w) => w.name,
		},
		{
			key: 'address',
			label: 'Address',
			render: (w) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>
					{w.address || <span className='fst-italic'>—</span>}
				</span>
			),
			exportValue: (w) => w.address ?? '',
		},
		{
			key: 'binLocation',
			label: 'Bin Location',
			render: (w) => w.binLocation || <span className='text-muted fst-italic'>—</span>,
			exportValue: (w) => w.binLocation ?? '',
		},
		{
			key: 'isDefault',
			label: 'Default',
			align: 'center',
			render: (w) =>
				w.isDefault ? (
					<Badge color='success' isLight className='px-3 py-2'>
						Default
					</Badge>
				) : (
					<span className='text-muted'>—</span>
				),
			exportValue: (w) => (w.isDefault ? 'Yes' : 'No'),
		},
	];

	return (
		<PageWrapper title={inventoryMenu.warehouses.text} requiredPermission={PERMISSIONS.SHOW_WAREHOUSE}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Warehouse' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Warehouses</span>
					<span className='text-muted small ms-2 d-none d-md-inline'>
						Physical stock locations used across inventory, imports and POS
					</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-warehouse'
								icon='Add'
								color='primary'
								isLight
								onClick={() => openEdit(null)}>
								New Warehouse
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
											render: (w) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () => openView(w.id),
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
																		onClick: () => openEdit(w.id),
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
																		onClick: () => openDelete(w.id),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={warehouses}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='warehouses'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<WarehouseFormModal
				mode='view'
				id={viewId}
				isOpen={viewOpen}
				setIsOpen={setViewOpen}
				warehouses={warehouses}
				onEdit={canUpdate ? (id) => openEdit(id) : undefined}
			/>
			<WarehouseFormModal
				mode={editId === null ? 'add' : 'edit'}
				id={editId}
				isOpen={editOpen}
				setIsOpen={setEditOpen}
				warehouses={warehouses}
			/>
			<WarehouseDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				warehouses={warehouses}
			/>
		</PageWrapper>
	);
};

export default WarehousesPage;

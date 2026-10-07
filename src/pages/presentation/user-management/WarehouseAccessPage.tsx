import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getWarehousesApi } from '../../../api/warehouses.api';
import {
	getUserWarehouseAccessListApi,
	updateUserWarehouseAccessApi,
	UserWarehouseAccess,
} from '../../../api/warehouseAccess.api';
import WarehouseAccessFormModal from './WarehouseAccessFormModal';

/**
 * Dedicated master-data page for assigning warehouse(s) to a user — "need
 * new master data for assign Warehouses for users (that warehouse enable
 * users)". Kept separate from UserFormModal/Departments per that decision.
 *
 * Warehouses only — showrooms now have their own separate "Showroom Access"
 * page/permission pair ("need separate showroom allocation (users)"), so
 * this list no longer merges the two. Saving here only ever replaces this
 * user's warehouse-type assignments; their showroom assignments (edited
 * from the other page) are preserved untouched — see
 * UserService#updateWarehouseAccess.
 */
const WarehouseAccessPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canEdit = hasPermission(PERMISSIONS.EDIT_WAREHOUSE_ACCESS);

	const [editTarget, setEditTarget] = useState<UserWarehouseAccess | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		data: accessList = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ['user-warehouse-access'], queryFn: getUserWarehouseAccessListApi });

	const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
		queryKey: ['warehouses'],
		queryFn: getWarehousesApi,
	});

	const assignableLocations = warehouses.map((w) => ({ id: w.id, name: w.name }));

	// A user's warehouses and showrooms are stored in the same relationship
	// (a showroom is a location of type SHOWROOM), and the access list comes
	// back with both — so any user who had also been given a showroom showed
	// that showroom here as an "assigned warehouse". GET /warehouses returns
	// real warehouses only, so it is the filter: anything not in it belongs
	// on the Showroom Access page, not this one.
	const warehouseAccessList = useMemo(() => {
		const warehouseIds = new Set(warehouses.map((w) => Number(w.id)));
		return accessList.map((access) => {
			const kept = access.warehouseIds
				.map((id, index) => ({ id, name: access.warehouseNames[index] }))
				.filter((entry) => warehouseIds.has(Number(entry.id)));
			return {
				...access,
				warehouseIds: kept.map((entry) => entry.id),
				warehouseNames: kept.map((entry) => entry.name),
			};
		});
	}, [accessList, warehouses]);

	const updateMutation = useMutation({
		mutationFn: ({ userId, warehouseIds }: { userId: number; warehouseIds: number[] }) =>
			updateUserWarehouseAccessApi(userId, { warehouseIds }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-warehouse-access'] });
			setIsModalOpen(false);
			setEditTarget(null);
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='Store' size='lg' className='me-1' />
					<span>Warehouse Access Updated</span>
				</span>,
				'',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to update warehouse access'), 'danger'),
	});

	const columns: DataTableColumn<UserWarehouseAccess>[] = [
		{
			key: 'userName',
			label: 'User',
			render: (row) => (
				<div>
					<span className='fw-bold'>{row.userName}</span>
					<div className='small text-muted'>{row.userEmail}</div>
				</div>
			),
		},
		{
			key: 'warehouseNames',
			label: 'Assigned Warehouse(s)',
			render: (row) =>
				row.warehouseNames.length > 0 ? (
					<div className='d-flex flex-wrap gap-1'>
						{row.warehouseNames.map((name) => (
							<Badge key={name} color='primary' isLight>
								{name}
							</Badge>
						))}
					</div>
				) : (
					<span className='text-muted small fst-italic'>None — sees every shipment</span>
				),
		},
		{
			key: 'actions',
			label: '',
			align: 'right',
			sortable: false,
			searchable: false,
			render: (row) => (
				<DataTableActionMenu
					actions={
						canEdit
							? [
									{
										key: 'edit',
										label: 'Assign Warehouses',
										icon: 'ti ti-edit',
										className: 'text-primary',
										onClick: () => {
											setEditTarget(row);
											setIsModalOpen(true);
										},
									},
								]
							: []
					}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Warehouse Access' requiredPermission={PERMISSIONS.SHOW_WAREHOUSE_ACCESS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Store' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Warehouse Access</span>
					<span className='text-muted small ms-2 d-none d-md-inline'>
						Controls which incoming import shipments each user can see
					</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={warehouseAccessList}
									rowKey='userId'
									loading={isLoading || warehousesLoading}
									error={error}
									fileName='warehouse-access'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<WarehouseAccessFormModal
				isOpen={isModalOpen}
				setIsOpen={(v) => {
					setIsModalOpen(v);
					if (!v) setEditTarget(null);
				}}
				access={editTarget}
				warehouses={assignableLocations}
				isLoading={updateMutation.isPending}
				onSubmit={(warehouseIds) => {
					if (editTarget) updateMutation.mutate({ userId: editTarget.userId, warehouseIds });
				}}
			/>
		</PageWrapper>
	);
};

export default WarehouseAccessPage;

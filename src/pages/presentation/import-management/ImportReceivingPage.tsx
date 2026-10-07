import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Button from '../../../components/bootstrap/Button';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import {
	getImportShipmentsApi,
	receiveImportLegBay1Api,
	updateImportWarehouseAllocationsApi,
	ImportShipmentResponse,
	ImportLegReceivingPayload,
	ImportWarehouseAllocationPayload,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
	IMPORT_SHIPMENT_STATUS_ORDER,
} from '../../../api/importShipments.api';
import ImportReceivingModal from './ImportReceivingModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';
import ImportWarehouseAllocationModal from './ImportWarehouseAllocationModal';

// Storekeeper dashboard visibility unlocks at PROCUREMENT_APPROVED (step 4) —
// this queue is that plus what's already moved on to Bay 1, so the page
// doesn't imply a shipment vanished the moment ONE of its warehouses is
// received. A shipment can sit at RECEIVING_BAY1 for a while with other
// warehouses still awaiting their own receiving — see ImportReceivingModal.
const RELEVANT_STATUSES = new Set(['PROCUREMENT_APPROVED', 'RECEIVING_BAY1']);

// A shipment whose status has moved past every status above belongs in the
// History tab — it's already been through this page's step.
const MAX_RELEVANT_INDEX = Math.max(
	...Array.from(RELEVANT_STATUSES).map((s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s as any)),
);

const ImportReceivingPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [tab, setTab] = useState<'pending' | 'history'>('pending');
	const [receiveTarget, setReceiveTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [allocationTarget, setAllocationTarget] = useState<ImportShipmentResponse | null>(null);

	const canReceive = hasPermission(PERMISSIONS.RECEIVE_IMPORT_BAY1);
	const canEditWarehouseAllocation = hasPermission(PERMISSIONS.EDIT_IMPORT_WAREHOUSE_ALLOCATION);

	const { data: allShipments = [], isLoading, error } = useQuery({
		queryKey: ['importShipments'],
		queryFn: getImportShipmentsApi,
	});

	const shipments = allShipments.filter((s) => RELEVANT_STATUSES.has(s.status));
	const historyShipments = allShipments.filter(
		(s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s.status) > MAX_RELEVANT_INDEX,
	);
	const visibleShipments = tab === 'pending' ? shipments : historyShipments;

	const invalidate = (shipmentId?: number) => {
		queryClient.invalidateQueries({ queryKey: ['importShipments'] });
		if (shipmentId) {
			queryClient.invalidateQueries({ queryKey: ['importShipmentWarehouseLegs', shipmentId] });
		}
	};

	const receiveMutation = useMutation({
		mutationFn: ({ id, warehouseId, payload }: { id: number; warehouseId: number; payload: ImportLegReceivingPayload }) =>
			receiveImportLegBay1Api(id, warehouseId, payload),
		onSuccess: (_, variables) => {
			invalidate(variables.id);
			setReceiveTarget(null);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Received at Bay 1</>,
				'That warehouse is now ready for QA — Bay 2.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to record receiving'), 'danger'),
	});

	const allocationMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportWarehouseAllocationPayload }) =>
			updateImportWarehouseAllocationsApi(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['importShipmentWarehouseAllocations', variables.id] });
			invalidate(variables.id);
			setAllocationTarget(null);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Warehouse Allocation Saved</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save warehouse allocation'), 'danger'),
	});

	const getRowActions = (row: ImportShipmentResponse) => {
		const actions: any[] = [
			{
				key: 'view',
				label: 'View Details',
				icon: 'ti ti-eye',
				className: 'text-info',
				onClick: () => { setSelectedShipment(row); setIsDetailOpen(true); },
			},
		];

		// Opens a picker when more than one warehouse is still awaiting
		// receiving — see ImportReceivingModal.
		if (canReceive && (row.status === 'PROCUREMENT_APPROVED' || row.status === 'RECEIVING_BAY1')) {
			actions.push({
				key: 'receive',
				label: 'Receive at Bay 1',
				icon: 'ti ti-package-import',
				className: 'text-success',
				onClick: () => setReceiveTarget(row),
			});
		}
		// Editable any time before Bay 1 receiving starts for a given item —
		// still offered here through QA_BAY2's own start, since a slower
		// warehouse's items may still be unlocked even once another warehouse
		// has moved the shipment's overall status on; the server enforces the
		// real per-item lock regardless.
		if (canEditWarehouseAllocation && (row.status === 'PROCUREMENT_APPROVED' || row.status === 'RECEIVING_BAY1')) {
			actions.push({
				key: 'warehouseAllocation',
				label: 'Warehouse Allocation',
				icon: 'ti ti-building-warehouse',
				className: 'text-primary',
				onClick: () => setAllocationTarget(row),
			});
		}

		return actions;
	};

	const columns: DataTableColumn<ImportShipmentResponse>[] = [
		{
			key: 'shipmentNo',
			label: 'Shipment No',
			render: (row) => <span className='fw-bold text-primary'>{row.shipmentNo}</span>,
		},
		{
			key: 'gfReference',
			label: 'GF Reference',
			render: (row) => row.gfReference || <span className='text-muted fst-italic'>—</span>,
		},
		{
			key: 'createdByName',
			label: 'Created By',
		},
		{
			key: 'totalSellingValue',
			label: 'Selling Value',
			align: 'right',
			render: (row) => <span className='fw-bold'>{formatCurrency(row.totalSellingValue)}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={IMPORT_SHIPMENT_STATUS_COLORS[row.status] as any} isLight>
					{IMPORT_SHIPMENT_STATUS_LABELS[row.status]}
				</Badge>
			),
		},
		{
			key: 'actions',
			label: '',
			align: 'right' as any,
			sortable: false,
			searchable: false,
			render: (row) => <DataTableActionMenu actions={getRowActions(row)} />,
		},
	];

	return (
		<PageWrapper title='Incoming Shipments' requiredPermission={PERMISSIONS.RECEIVE_IMPORT_BAY1}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Inventory' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Incoming Shipments — Bay 1 Receiving</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<div className='btn-group mb-3' role='group' aria-label='View'>
									<Button
										size='sm'
										color={tab === 'pending' ? 'primary' : 'light'}
										isLight={tab !== 'pending'}
										onClick={() => setTab('pending')}>
										Pending ({shipments.length})
									</Button>
									<Button
										size='sm'
										color={tab === 'history' ? 'primary' : 'light'}
										isLight={tab !== 'history'}
										onClick={() => setTab('history')}>
										History ({historyShipments.length})
									</Button>
								</div>
								<DataTable
									columns={columns}
									data={visibleShipments}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName={tab === 'pending' ? 'incoming-shipments' : 'incoming-shipments-history'}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportReceivingModal
				isOpen={!!receiveTarget}
				setIsOpen={(v) => { if (!v) setReceiveTarget(null); }}
				shipment={receiveTarget}
				isLoading={receiveMutation.isPending}
				onSubmit={(warehouseId, payload) => {
					if (receiveTarget) receiveMutation.mutate({ id: receiveTarget.id, warehouseId, payload });
				}}
			/>

			<ImportShipmentDetailDrawer
				isOpen={isDetailOpen}
				setIsOpen={setIsDetailOpen}
				shipment={selectedShipment}
				canUploadDocument={false}
				isUploading={false}
				onUploadDocument={() => {}}
				canEditWarehouseAllocation={canEditWarehouseAllocation}
				onEditWarehouseAllocation={() => {
					if (selectedShipment) setAllocationTarget(selectedShipment);
				}}
			/>

			<ImportWarehouseAllocationModal
				isOpen={!!allocationTarget}
				setIsOpen={(v) => { if (!v) setAllocationTarget(null); }}
				shipment={allocationTarget}
				isLoading={allocationMutation.isPending}
				onSubmit={(payload) => {
					if (allocationTarget) allocationMutation.mutate({ id: allocationTarget.id, payload });
				}}
			/>
		</PageWrapper>
	);
};

export default ImportReceivingPage;

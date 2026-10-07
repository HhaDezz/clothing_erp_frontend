import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import {
	getImportShipmentsApi,
	createImportShipmentApi,
	updateImportShipmentItemsApi,
	submitImportCostingApi,
	uploadImportShipmentDocumentApi,
	updateImportWarehouseAllocationsApi,
	ImportShipmentResponse,
	ImportShipmentPayload,
	ImportCostingPayload,
	ImportWarehouseAllocationPayload,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
} from '../../../api/importShipments.api';
import ImportShipmentModal from './ImportShipmentModal';
import ImportCostingModal from './ImportCostingModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';
import ImportShipmentDeleteModal from './ImportShipmentDeleteModal';
import ImportWarehouseAllocationModal from './ImportWarehouseAllocationModal';

const ImportShipmentsPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [searchParams, setSearchParams] = useSearchParams();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ImportShipmentResponse | null>(null);
	const [costingTarget, setCostingTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<ImportShipmentResponse | null>(null);
	const [allocationTarget, setAllocationTarget] = useState<ImportShipmentResponse | null>(null);

	const canCreate = hasPermission(PERMISSIONS.CREATE_IMPORT_SHIPMENT_NEW);
	const canEdit = hasPermission(PERMISSIONS.UPDATE_IMPORT_SHIPMENT);
	const canSubmitCosting = hasPermission(PERMISSIONS.SUBMIT_IMPORT_COSTING);
	const canDelete = hasPermission(PERMISSIONS.DELETE_IMPORT_SHIPMENT);
	const canEditWarehouseAllocation = hasPermission(PERMISSIONS.EDIT_IMPORT_WAREHOUSE_ALLOCATION);

	const { data: shipments = [], isLoading, error } = useQuery({
		queryKey: ['importShipments'],
		queryFn: getImportShipmentsApi,
	});

	// Deep-link support for "go to view" notifications: NotificationBell
	// routes here with ?open=<shipmentId>, so once the list has loaded, find
	// that row and open its detail drawer, then strip the param so a
	// back/refresh doesn't re-trigger it.
	useEffect(() => {
		const openId = searchParams.get('open');
		if (!openId || shipments.length === 0) return;
		const row = shipments.find((s) => s.id === Number(openId));
		if (row) {
			setSelectedShipment(row);
			setIsDetailOpen(true);
		}
		setSearchParams(
			(prev) => {
				prev.delete('open');
				return prev;
			},
			{ replace: true },
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, shipments]);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['importShipments'] });

	// Keep the drawer's data fresh after a mutation touches the shipment it's showing
	const syncSelected = (updated: ImportShipmentResponse) => {
		setSelectedShipment((prev) => (prev && prev.id === updated.id ? updated : prev));
	};

	const createMutation = useMutation({
		mutationFn: createImportShipmentApi,
		onSuccess: () => {
			invalidate();
			setIsModalOpen(false);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Import Shipment Created</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to create shipment'), 'danger'),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportShipmentPayload }) =>
			updateImportShipmentItemsApi(id, payload),
		onSuccess: (updated) => {
			invalidate();
			setIsModalOpen(false);
			setEditTarget(null);
			syncSelected(updated);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Shipment Updated</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to update'), 'danger'),
	});

	const costingMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportCostingPayload }) =>
			submitImportCostingApi(id, payload),
		onSuccess: (updated) => {
			invalidate();
			setCostingTarget(null);
			syncSelected(updated);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Costing Submitted — Sent to Procurement</>,
				'',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to submit costing'), 'danger'),
	});

	const uploadDocMutation = useMutation({
		mutationFn: ({ id, file }: { id: number; file: File }) => uploadImportShipmentDocumentApi(id, file),
		onSuccess: (updated) => {
			invalidate();
			syncSelected(updated);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Document Uploaded</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Document upload failed'), 'danger'),
	});

	const allocationMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportWarehouseAllocationPayload }) =>
			updateImportWarehouseAllocationsApi(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['importShipmentWarehouseAllocations', variables.id] });
			invalidate();
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

		if (canEdit && row.status === 'DRAFT_INTAKE') {
			actions.push({
				key: 'edit',
				label: 'Edit Items',
				icon: 'ti ti-edit',
				onClick: () => { setEditTarget(row); setIsModalOpen(true); },
			});
			actions.push({
				key: 'uploadDoc',
				label: 'Upload Packing List',
				icon: 'ti ti-file-upload',
				onClick: () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = 'application/pdf,image/*';
					input.onchange = () => {
						if (input.files?.[0]) uploadDocMutation.mutate({ id: row.id, file: input.files[0] });
					};
					input.click();
				},
			});
		}
		if (canSubmitCosting && row.status === 'DRAFT_INTAKE') {
			actions.push({
				key: 'costing',
				label: 'Enter Costing & Submit',
				icon: 'ti ti-currency-dollar',
				className: 'text-success',
				onClick: () => setCostingTarget(row),
			});
		}
		if (canDelete && row.status === 'DRAFT_INTAKE') {
			actions.push({
				key: 'delete',
				label: 'Delete',
				icon: 'ti ti-trash',
				className: 'text-danger',
				onClick: () => setDeleteTarget(row),
			});
		}
		// Editable any time before the GRN is generated AND before the
		// shipment reaches higher-approval stage — at PENDING_HIGHER_APPROVAL
		// the Director/Admin is reviewing the final figures, so mutating the
		// warehouse split would silently invalidate the pending approval.
		// STOCK_COMMITTED is terminal anyway (approval already granted).
		const postApproval =
			row.status === 'PENDING_HIGHER_APPROVAL' || row.status === 'STOCK_COMMITTED';
		if (canEditWarehouseAllocation && !row.grn && !postApproval) {
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
			key: 'packingRefNo',
			label: 'Packing Ref',
			render: (row) => row.packingRefNo || <span className='text-muted fst-italic'>—</span>,
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
			key: 'totalCostingValue',
			label: 'Costing Value',
			align: 'right',
			render: (row) => <span className='fw-bold'>{formatCurrency(row.totalCostingValue)}</span>,
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
			key: 'createdAt',
			label: 'Created',
			render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span>,
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
		<PageWrapper title='Import Shipments' requiredPermission={PERMISSIONS.SHOW_IMPORT_SHIPMENT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='LocalShipping' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Import Shipments — Intake &amp; Costing</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-new-import-shipment'
								icon='Add'
								color='primary'
								isLight
								onClick={() => { setEditTarget(null); setIsModalOpen(true); }}>
								New Shipment
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
									columns={columns}
									data={shipments}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='import-shipments'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportShipmentModal
				isOpen={isModalOpen}
				setIsOpen={(v) => { setIsModalOpen(v); if (!v) setEditTarget(null); }}
				editData={editTarget}
				isLoading={editTarget ? updateMutation.isPending : createMutation.isPending}
				onSubmit={(payload) => {
					if (editTarget) {
						updateMutation.mutate({ id: editTarget.id, payload });
					} else {
						createMutation.mutate(payload);
					}
				}}
			/>

			<ImportCostingModal
				isOpen={!!costingTarget}
				setIsOpen={(v) => { if (!v) setCostingTarget(null); }}
				shipment={costingTarget}
				isLoading={costingMutation.isPending}
				onSubmit={(payload) => {
					if (costingTarget) costingMutation.mutate({ id: costingTarget.id, payload });
				}}
			/>

			<ImportShipmentDetailDrawer
				isOpen={isDetailOpen}
				setIsOpen={setIsDetailOpen}
				shipment={selectedShipment}
				canUploadDocument={canEdit}
				isUploading={uploadDocMutation.isPending}
				onUploadDocument={(file) => {
					if (selectedShipment) uploadDocMutation.mutate({ id: selectedShipment.id, file });
				}}
				canEditWarehouseAllocation={canEditWarehouseAllocation}
				onEditWarehouseAllocation={() => {
					if (selectedShipment) setAllocationTarget(selectedShipment);
				}}
			/>

			<ImportShipmentDeleteModal
				shipment={deleteTarget}
				isOpen={!!deleteTarget}
				setIsOpen={(v: boolean) => { if (!v) setDeleteTarget(null); }}
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

export default ImportShipmentsPage;

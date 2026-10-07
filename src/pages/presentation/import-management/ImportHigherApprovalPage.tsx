import React, { useState } from 'react';
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
import { formatCurrency } from '../../../helpers/currency';
import {
	getImportShipmentsApi,
	higherApproveImportApi,
	ImportShipmentResponse,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
} from '../../../api/importShipments.api';
import ImportHigherApprovalModal from './ImportHigherApprovalModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';
import { ShipmentGrnCell, useShipmentGrnNumbers } from './ShipmentGrnNumbers';

// Queue for this page: shipments awaiting final sign-off, plus already
// stock-committed ones kept visible for reference.
const RELEVANT_STATUSES = new Set(['PENDING_HIGHER_APPROVAL', 'STOCK_COMMITTED']);

const ImportHigherApprovalPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [approveTarget, setApproveTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const canApprove = hasPermission(PERMISSIONS.HIGHER_APPROVE_IMPORT);

	const { data: allShipments = [], isLoading, error } = useQuery({
		queryKey: ['importShipments'],
		queryFn: getImportShipmentsApi,
	});

	const shipments = allShipments.filter((s) => RELEVANT_STATUSES.has(s.status));

	// One GRN per warehouse leg, so a shipment can have several — see
	// ShipmentGrnNumbers.
	const grnLookup = useShipmentGrnNumbers(shipments);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['importShipments'] });

	const syncSelected = (updated: ImportShipmentResponse) => {
		setSelectedShipment((prev) => (prev && prev.id === updated.id ? updated : prev));
	};

	const approveMutation = useMutation({
		mutationFn: (id: number) => higherApproveImportApi(id),
		onSuccess: (updated) => {
			invalidate();
			setApproveTarget(null);
			syncSelected(updated);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Shipment Approved</>,
				`${updated.shipmentNo} has been approved — stock is now live.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to approve shipment'), 'danger'),
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

		if (canApprove && row.status === 'PENDING_HIGHER_APPROVAL') {
			actions.push({
				key: 'approve',
				label: 'Approve',
				icon: 'ti ti-check',
				className: 'text-success',
				onClick: () => setApproveTarget(row),
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
			key: 'grnNo',
			label: 'GRN No',
			accessor: (row) => grnLookup.grnTextFor(row),
			exportValue: (row) => grnLookup.grnTextFor(row),
			render: (row) => (
				<ShipmentGrnCell grns={grnLookup.grnsFor(row)} isLoading={grnLookup.isLoadingFor(row)} />
			),
		},
		{
			key: 'vatAmount',
			label: 'VAT Amount',
			align: 'right' as any,
			render: (row) => (row.vatAmount != null ? formatCurrency(row.vatAmount) : <span className='text-muted'>—</span>),
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
		<PageWrapper title='Higher Approval' requiredPermission={PERMISSIONS.HIGHER_APPROVE_IMPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='VerifiedUser' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Higher Approval</span>
				</SubHeaderLeft>
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
									fileName='import-higher-approval'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportHigherApprovalModal
				isOpen={!!approveTarget}
				setIsOpen={(v) => { if (!v) setApproveTarget(null); }}
				shipment={approveTarget}
				isLoading={approveMutation.isPending}
				onApprove={() => {
					if (approveTarget) approveMutation.mutate(approveTarget.id);
				}}
			/>

			<ImportShipmentDetailDrawer
				isOpen={isDetailOpen}
				setIsOpen={setIsDetailOpen}
				shipment={selectedShipment}
				canUploadDocument={false}
				isUploading={false}
				onUploadDocument={() => {}}
			/>
		</PageWrapper>
	);
};

export default ImportHigherApprovalPage;

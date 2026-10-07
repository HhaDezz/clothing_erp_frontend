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
	applyImportVatApi,
	ImportShipmentResponse,
	ImportVatPayload,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
} from '../../../api/importShipments.api';
import ImportVatModal from './ImportVatModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';
import { ShipmentGrnCell, useShipmentGrnNumbers } from './ShipmentGrnNumbers';

// Queue for this page: shipments with a GRN ready for VAT/final pricing,
// plus already-processed ones kept visible for reference.
const RELEVANT_STATUSES = new Set(['GRN_GENERATED', 'PENDING_HIGHER_APPROVAL', 'STOCK_COMMITTED']);

const ImportVatPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [vatTarget, setVatTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const canApplyVat = hasPermission(PERMISSIONS.FINANCE_VAT_IMPORT);

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

	const vatMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportVatPayload }) => applyImportVatApi(id, payload),
		onSuccess: (updated) => {
			invalidate();
			setVatTarget(null);
			syncSelected(updated);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />VAT and Final Pricing Applied</>,
				'Sent to Director/Admin for Higher Approval.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to apply VAT'), 'danger'),
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

		if (canApplyVat && row.status === 'GRN_GENERATED') {
			actions.push({
				key: 'vat',
				label: 'Apply VAT / Final Pricing',
				icon: 'ti ti-receipt',
				className: 'text-success',
				onClick: () => setVatTarget(row),
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
		<PageWrapper title='VAT and Final Pricing' requiredPermission={PERMISSIONS.FINANCE_VAT_IMPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Receipt' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>VAT and Final Pricing</span>
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
									fileName='import-vat'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportVatModal
				isOpen={!!vatTarget}
				setIsOpen={(v) => { if (!v) setVatTarget(null); }}
				shipment={vatTarget}
				isLoading={vatMutation.isPending}
				onSubmit={(payload) => {
					if (vatTarget) vatMutation.mutate({ id: vatTarget.id, payload });
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

export default ImportVatPage;

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
import {
	getImportShipmentsApi,
	generateImportLegGrnApi,
	ImportShipmentResponse,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
	IMPORT_SHIPMENT_STATUS_ORDER,
} from '../../../api/importShipments.api';
import ImportGrnModal from './ImportGrnModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';

// Queue for this page: shipments with at least one warehouse that's cleared
// QA and is waiting on its own GRN, plus already-generated ones kept visible
// so the Storekeeper can re-open the shipment's detail view later. See
// ImportShipmentDetailDrawer's "Warehouse Legs" section for each warehouse's
// own GRN — "need multiple grn if allocated multiple warehouses".
const RELEVANT_STATUSES = new Set(['QA_BAY2', 'GRN_GENERATED']);

// A shipment whose status has moved past every status above belongs in the
// History tab — it's already been through this page's step.
const MAX_RELEVANT_INDEX = Math.max(
	...Array.from(RELEVANT_STATUSES).map((s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s as any)),
);

const ImportGrnPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [tab, setTab] = useState<'pending' | 'history'>('pending');
	const [grnTarget, setGrnTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const canGenerate = hasPermission(PERMISSIONS.GENERATE_IMPORT_GRN);

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

	const generateMutation = useMutation({
		mutationFn: ({ id, warehouseId }: { id: number; warehouseId: number }) => generateImportLegGrnApi(id, warehouseId),
		onSuccess: (leg, variables) => {
			invalidate(variables.id);
			setGrnTarget(null);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />GRN Generated</>,
				`${leg.grnNo ?? 'GRN'} is ready for ${leg.warehouseName ?? 'this warehouse'}.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to generate GRN'), 'danger'),
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

		if (canGenerate && row.status === 'QA_BAY2') {
			actions.push({
				key: 'generate',
				label: 'Generate GRN',
				icon: 'ti ti-file-text',
				className: 'text-success',
				onClick: () => setGrnTarget(row),
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
		<PageWrapper title='GRN Generation' requiredPermission={PERMISSIONS.GENERATE_IMPORT_GRN}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Description' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>GRN Generation</span>
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
									fileName={tab === 'pending' ? 'import-grn' : 'import-grn-history'}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportGrnModal
				isOpen={!!grnTarget}
				setIsOpen={(v) => { if (!v) setGrnTarget(null); }}
				shipment={grnTarget}
				isLoading={generateMutation.isPending}
				onGenerate={(warehouseId) => {
					if (grnTarget) generateMutation.mutate({ id: grnTarget.id, warehouseId });
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

export default ImportGrnPage;

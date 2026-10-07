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
	submitImportLegQaApi,
	ImportShipmentResponse,
	ImportLegQaPayload,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
	IMPORT_SHIPMENT_STATUS_ORDER,
} from '../../../api/importShipments.api';
import ImportQaModal from './ImportQaModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';

// Queue for this page: shipments with at least one warehouse received at
// Bay 1 and awaiting QA, plus what's already passed through QA — kept
// visible here until every warehouse's GRN is generated so the Storekeeper
// can still see what they just inspected.
const RELEVANT_STATUSES = new Set(['RECEIVING_BAY1', 'QA_BAY2']);

// A shipment whose status has moved past every status above belongs in the
// History tab — it's already been through this page's step.
const MAX_RELEVANT_INDEX = Math.max(
	...Array.from(RELEVANT_STATUSES).map((s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s as any)),
);

const ImportQaPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [tab, setTab] = useState<'pending' | 'history'>('pending');
	const [qaTarget, setQaTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const canQa = hasPermission(PERMISSIONS.QA_IMPORT_BAY2);

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

	const qaMutation = useMutation({
		mutationFn: ({ id, warehouseId, payload }: { id: number; warehouseId: number; payload: ImportLegQaPayload }) =>
			submitImportLegQaApi(id, warehouseId, payload),
		onSuccess: (_, variables) => {
			invalidate(variables.id);
			setQaTarget(null);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />QA Submitted</>,
				'That warehouse is now ready for GRN generation.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to submit QA'), 'danger'),
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

		if (canQa && (row.status === 'RECEIVING_BAY1' || row.status === 'QA_BAY2')) {
			actions.push({
				key: 'qa',
				label: 'QA — Bay 2',
				icon: 'ti ti-checkbox',
				className: 'text-success',
				onClick: () => setQaTarget(row),
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
		<PageWrapper title='QA — Bay 2' requiredPermission={PERMISSIONS.QA_IMPORT_BAY2}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Verified' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Quality Assurance — Bay 2</span>
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
									fileName={tab === 'pending' ? 'import-qa' : 'import-qa-history'}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportQaModal
				isOpen={!!qaTarget}
				setIsOpen={(v) => { if (!v) setQaTarget(null); }}
				shipment={qaTarget}
				isLoading={qaMutation.isPending}
				onSubmit={(warehouseId, payload) => {
					if (qaTarget) qaMutation.mutate({ id: qaTarget.id, warehouseId, payload });
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

export default ImportQaPage;

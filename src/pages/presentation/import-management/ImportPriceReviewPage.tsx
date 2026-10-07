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
	startImportPriceReviewApi,
	submitImportPriceReviewApi,
	financeApproveImportPriceApi,
	ImportShipmentResponse,
	ImportPriceReviewPayload,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
	IMPORT_SHIPMENT_STATUS_ORDER,
} from '../../../api/importShipments.api';
import ImportPriceReviewModal from './ImportPriceReviewModal';
import ImportShipmentDetailDrawer from './ImportShipmentDetailDrawer';

// Shipments relevant to this page: awaiting/under Procurement review, or
// sitting with Finance for a price-change approval. Earlier (DRAFT_INTAKE)
// and later (post-approval) statuses belong to other pages/phases.
const RELEVANT_STATUSES = new Set(['COSTING_SUBMITTED', 'PROCUREMENT_REVIEW', 'PENDING_FINANCE_APPROVAL']);

// A shipment whose status has moved past every status above belongs in the
// History tab — it's already been through this page's step.
const MAX_RELEVANT_INDEX = Math.max(
	...Array.from(RELEVANT_STATUSES).map((s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s as any)),
);

const ImportPriceReviewPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();

	const [tab, setTab] = useState<'pending' | 'history'>('pending');
	const [reviewTarget, setReviewTarget] = useState<ImportShipmentResponse | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ImportShipmentResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	// Start Review and Review Prices & Submit are gated separately (see V59)
	// so either step can be granted to a role on its own.
	const canStartReview = hasPermission(PERMISSIONS.START_REVIEW_IMPORT_PRICE);
	const canReview = hasPermission(PERMISSIONS.REVIEW_IMPORT_PRICE);
	const canFinanceApprove = hasPermission(PERMISSIONS.FINANCE_APPROVE_IMPORT_PRICE);

	const { data: allShipments = [], isLoading, error } = useQuery({
		queryKey: ['importShipments'],
		queryFn: getImportShipmentsApi,
	});

	const shipments = allShipments.filter((s) => RELEVANT_STATUSES.has(s.status));
	const historyShipments = allShipments.filter(
		(s) => IMPORT_SHIPMENT_STATUS_ORDER.indexOf(s.status) > MAX_RELEVANT_INDEX,
	);
	const visibleShipments = tab === 'pending' ? shipments : historyShipments;

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['importShipments'] });

	const syncSelected = (updated: ImportShipmentResponse) => {
		setSelectedShipment((prev) => (prev && prev.id === updated.id ? updated : prev));
	};

	const startReviewMutation = useMutation({
		mutationFn: startImportPriceReviewApi,
		onSuccess: (updated) => {
			invalidate();
			syncSelected(updated);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Review Started</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to start review'), 'danger'),
	});

	const submitReviewMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: ImportPriceReviewPayload }) =>
			submitImportPriceReviewApi(id, payload),
		onSuccess: (updated) => {
			invalidate();
			setReviewTarget(null);
			syncSelected(updated);
			const message =
				updated.status === 'PENDING_FINANCE_APPROVAL'
					? 'Submitted — pending Finance approval'
					: 'Price review submitted — shipment approved';
			showNotification(<><Icon icon='CheckCircle' className='me-2' />{message}</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to submit price review'), 'danger'),
	});

	const financeApproveMutation = useMutation({
		mutationFn: financeApproveImportPriceApi,
		onSuccess: (updated) => {
			invalidate();
			syncSelected(updated);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Price Change Approved</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to approve price change'), 'danger'),
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

		if (canStartReview && row.status === 'COSTING_SUBMITTED') {
			actions.push({
				key: 'startReview',
				label: 'Start Review',
				icon: 'ti ti-player-play',
				className: 'text-primary',
				onClick: () => startReviewMutation.mutate(row.id),
			});
		}
		if (canReview && row.status === 'PROCUREMENT_REVIEW') {
			actions.push({
				key: 'submitReview',
				label: 'Review Prices & Submit',
				icon: 'ti ti-currency-dollar',
				className: 'text-success',
				onClick: () => setReviewTarget(row),
			});
		}
		if (canFinanceApprove && row.status === 'PENDING_FINANCE_APPROVAL') {
			actions.push({
				key: 'financeApprove',
				label: 'Approve Price Change',
				icon: 'ti ti-thumb-up',
				className: 'text-success',
				onClick: () => financeApproveMutation.mutate(row.id),
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
			label: 'Costed By',
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
		<PageWrapper
			title='Import Price Review'
			requiredPermission={[
				PERMISSIONS.START_REVIEW_IMPORT_PRICE,
				PERMISSIONS.REVIEW_IMPORT_PRICE,
				PERMISSIONS.FINANCE_APPROVE_IMPORT_PRICE,
			]}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='RateReview' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Import Price Review</span>
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
									fileName={tab === 'pending' ? 'import-price-review' : 'import-price-review-history'}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ImportPriceReviewModal
				isOpen={!!reviewTarget}
				setIsOpen={(v) => { if (!v) setReviewTarget(null); }}
				shipment={reviewTarget}
				isLoading={submitReviewMutation.isPending}
				onSubmit={(payload) => {
					if (reviewTarget) submitReviewMutation.mutate({ id: reviewTarget.id, payload });
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

export default ImportPriceReviewPage;

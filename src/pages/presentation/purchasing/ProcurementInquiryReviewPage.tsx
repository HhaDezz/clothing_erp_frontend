import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
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
import {
	getInquiriesApi,
	updateInquiryApi,
	sendToGfApi,
	PurchaseInquiryResponse,
	PurchaseInquiryPayload,
} from '../../../api/inquiry.api';
import CreateInquiryModal from './CreateInquiryModal';
import InquiryDetailDrawer from './InquiryDetailDrawer';
import { formatCurrency } from '../../../helpers/currency';

// How many days an inquiry has been sitting untouched before we flag it.
const STALE_AFTER_DAYS = 2;

const daysWaiting = (createdAt: string) =>
	Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

/**
 * Procurement's review queue — step 2 of the PR → PO workflow.
 *
 * SL Operations raises an inquiry (DRAFT_INQUIRY) → Procurement lands here,
 * reviews it, edits/adds line items if the request needs it, then sends it
 * to the GF Office. Once sent, the inquiry moves to PENDING_GF_CONFIRM and
 * drops out of this queue on its own (it's filtered by status, not by a
 * separate "handled" flag).
 */
const ProcurementInquiryReviewPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [reviewTarget, setReviewTarget] = useState<PurchaseInquiryResponse | null>(null);
	const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
	const [selectedInquiry, setSelectedInquiry] = useState<PurchaseInquiryResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const canReview = hasPermission(PERMISSIONS.UPDATE_INQUIRY);
	// This page's one job is the "Send to GF Office" step — gated on its own
	// dedicated permission (see V58) rather than the old shared "submit".
	const canSend = hasPermission(PERMISSIONS.SEND_INQUIRY_TO_GF);

	const { data: pendingReview = [], isLoading, error } = useQuery({
		queryKey: ['purchaseInquiries'],
		queryFn: getInquiriesApi,
		select: (all) => all.filter((i) => i.status === 'DRAFT_INQUIRY'),
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchaseInquiries'] });

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: PurchaseInquiryPayload }) =>
			updateInquiryApi(id, payload),
		onSuccess: () => {
			invalidate();
			setIsReviewModalOpen(false);
			setReviewTarget(null);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Inquiry Updated</>,
				'',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to update inquiry'), 'danger'),
	});

	const sendToGfMutation = useMutation({
		mutationFn: sendToGfApi,
		onSuccess: (updated) => {
			invalidate();
			showNotification(
				<><Icon icon='Send' className='me-2' />Sent to GF Office</>,
				`${updated.inquiryNo} has been emailed to the GF Office and is now awaiting their confirmation.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to send to GF Office'), 'danger'),
	});

	const getRowActions = (row: PurchaseInquiryResponse) => {
		const actions: any[] = [
			{
				key: 'view',
				label: 'View Details',
				icon: 'ti ti-eye',
				className: 'text-info',
				onClick: () => { setSelectedInquiry(row); setIsDetailOpen(true); },
			},
		];

		if (canReview) {
			actions.push({
				key: 'review',
				label: 'Review & Edit Items',
				icon: 'ti ti-edit',
				onClick: () => { setReviewTarget(row); setIsReviewModalOpen(true); },
			});
		}

		if (canSend) {
			actions.push({
				key: 'sendGf',
				label: 'Send to GF Office',
				icon: 'ti ti-send',
				className: 'text-success',
				onClick: () => sendToGfMutation.mutate(row.id),
			});
		}

		return actions;
	};

	const columns: DataTableColumn<PurchaseInquiryResponse>[] = [
		{
			key: 'inquiryNo',
			label: 'Inquiry No',
			render: (row) => <span className='fw-bold text-primary'>{row.inquiryNo}</span>,
		},
		{
			key: 'title',
			label: 'Title',
			render: (row) => <span>{row.title || <span className='text-muted fst-italic'>No title</span>}</span>,
		},
		{
			key: 'createdByName',
			label: 'Raised By',
		},
		{
			key: 'items',
			label: 'Items',
			align: 'center',
			render: (row) => <Badge color='secondary' isLight>{row.items.length}</Badge>,
			sortValue: (row) => row.items.length,
		},
		{
			key: 'totalAmount',
			label: 'Total',
			align: 'center',
			render: (row) => <span className='fw-bold'>{formatCurrency(row.totalAmount)}</span>,
		},
		{
			key: 'createdAt',
			label: 'Waiting',
			render: (row) => {
				const days = daysWaiting(row.createdAt);
				return (
					<Badge color={days >= STALE_AFTER_DAYS ? 'warning' : 'success'} isLight={days < STALE_AFTER_DAYS}>
						{days <= 0 ? 'Today' : `${days}d`}
					</Badge>
				);
			},
			sortValue: (row) => daysWaiting(row.createdAt),
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
		<PageWrapper title='Inquiry Review' requiredPermission={PERMISSIONS.SEND_INQUIRY_TO_GF}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='RateReview' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Inquiry Review</span>
					<SubheaderSeparator />
					<span className='text-muted'>
						{isLoading ? 'Loading…' : `${pendingReview.length} awaiting your review`}
					</span>
				</SubHeaderLeft>
				<SubHeaderRight />
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={pendingReview}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='inquiry-review-queue'
									emptyText='All caught up — no inquiries waiting for review.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateInquiryModal
				isOpen={isReviewModalOpen}
				setIsOpen={(v) => { setIsReviewModalOpen(v); if (!v) setReviewTarget(null); }}
				editData={reviewTarget}
				isLoading={updateMutation.isPending}
				onSubmit={(payload) => {
					if (reviewTarget) updateMutation.mutate({ id: reviewTarget.id, payload });
				}}
			/>

			<InquiryDetailDrawer
				isOpen={isDetailOpen}
				setIsOpen={setIsDetailOpen}
				inquiry={selectedInquiry}
			/>
		</PageWrapper>
	);
};

export default ProcurementInquiryReviewPage;

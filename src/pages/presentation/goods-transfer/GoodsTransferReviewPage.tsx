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
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Button from '../../../components/bootstrap/Button';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getShowroomsApi } from '../../../api/showrooms.api';
import {
	getGoodsTransfersApi,
	approveGoodsTransferApi,
	rejectGoodsTransferApi,
	GoodsTransferRequest,
	GoodsTransferApprovalPayload,
} from '../../../api/goodsTransfer.api';
import GoodsTransferApprovalModal from './GoodsTransferApprovalModal';
import GoodsTransferDetailDrawer from './GoodsTransferDetailDrawer';
import GoodsTransferStatusBadge from './goodsTransferStatus';
import LocationTabs from './LocationTabs';

/**
 * Step 2 of the Goods-to-Showroom workflow — "SL Operations can see
 * notification and they do modifications if need and approve". Mirrors
 * ProcurementInquiryReviewPage's review-queue pattern: a filtered list of
 * REQUESTED transfers, with a modal that lets Ops split each line across
 * warehouse(s) before approving, or reject with a reason. Showroom tabs let
 * Ops narrow the queue down to one showroom at a time (SL Operations is
 * typically unrestricted, so every tab is usually switchable for them).
 * <p>
 * A Pending/History button-group (mirrors ImportReceivingPage /
 * ImportGrnPage) separates the live REQUESTED queue from everything already
 * acted on — approved, rejected, or further along the workflow — so past
 * decisions stay visible without cluttering the queue.
 */
const GoodsTransferReviewPage = () => {
	const queryClient = useQueryClient();
	const [searchParams, setSearchParams] = useSearchParams();
	const [reviewTarget, setReviewTarget] = useState<GoodsTransferRequest | null>(null);
	const [isReviewOpen, setIsReviewOpen] = useState(false);
	const [selectedShowroom, setSelectedShowroom] = useState<number | 'ALL'>('ALL');
	const [viewTarget, setViewTarget] = useState<GoodsTransferRequest | null>(null);
	const [isViewOpen, setIsViewOpen] = useState(false);
	const [tab, setTab] = useState<'pending' | 'history'>('pending');
	// Direct "Reject" from the row menu. Rejecting was already possible, but
	// only from the bottom of the long Review & Approve dialog, behind a
	// button that stays disabled until a reason is typed — easy to miss.
	const [rejectTarget, setRejectTarget] = useState<GoodsTransferRequest | null>(null);
	const [rejectReason, setRejectReason] = useState('');

	const { data: showrooms = [] } = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const { data: allRequests = [], isLoading, error } = useQuery({
		queryKey: ['goodsTransfers'],
		queryFn: getGoodsTransfersApi,
	});

	// Deep-link support for "go to view" notifications: NotificationBell
	// routes here with ?open=<requestId>, so once the list has loaded, find
	// that row (regardless of which Pending/History tab it currently falls
	// under) and open its detail drawer, then strip the param so a
	// back/refresh doesn't re-trigger it.
	useEffect(() => {
		const openId = searchParams.get('open');
		if (!openId || allRequests.length === 0) return;
		const row = allRequests.find((r) => r.id === Number(openId));
		if (row) {
			setViewTarget(row);
			setIsViewOpen(true);
		}
		setSearchParams(
			(prev) => {
				prev.delete('open');
				return prev;
			},
			{ replace: true },
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, allRequests]);

	const allPending = allRequests.filter((r) => r.status === 'REQUESTED');
	const allHistory = allRequests.filter((r) => r.status !== 'REQUESTED');

	const pending =
		selectedShowroom === 'ALL' ? allPending : allPending.filter((r) => r.showroomId === selectedShowroom);
	const history =
		selectedShowroom === 'ALL' ? allHistory : allHistory.filter((r) => r.showroomId === selectedShowroom);

	const visible = tab === 'pending' ? pending : history;

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goodsTransfers'] });

	const approveMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: GoodsTransferApprovalPayload }) =>
			approveGoodsTransferApi(id, payload),
		onSuccess: (updated) => {
			invalidate();
			setIsReviewOpen(false);
			setReviewTarget(null);
			showNotification(
				<>
					<Icon icon='CheckCircle' className='me-2' />
					Request Approved
				</>,
				`${updated.requestNo} has been approved and sent to the warehouse.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to approve request'), 'danger'),
	});

	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectGoodsTransferApi(id, reason),
		onSuccess: (updated) => {
			invalidate();
			setIsReviewOpen(false);
			setReviewTarget(null);
			setRejectTarget(null);
			setRejectReason('');
			showNotification(
				<>
					<Icon icon='Cancel' className='me-2' />
					Request Rejected
				</>,
				`${updated.requestNo} has been rejected.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to reject request'), 'danger'),
	});

	const columns: DataTableColumn<GoodsTransferRequest>[] = [
		{
			key: 'requestNo',
			label: 'Request No',
			render: (row) => <span className='fw-bold text-primary'>{row.requestNo}</span>,
		},
		{ key: 'showroomName', label: 'Showroom' },
		{ key: 'requestedByName', label: 'Requested By' },
		{
			key: 'items',
			label: 'Items',
			align: 'center',
			render: (row) => <Badge color='secondary' isLight>{row.items.length}</Badge>,
			sortValue: (row) => row.items.length,
		},
		{
			key: 'status',
			label: 'Status',
			render: (row) => <GoodsTransferStatusBadge status={row.status} />,
		},
		{
			key: 'requestedAt',
			label: 'Requested At',
			render: (row) => (row.requestedAt ? new Date(row.requestedAt).toLocaleString() : '—'),
			sortValue: (row) => (row.requestedAt ? new Date(row.requestedAt).getTime() : 0),
		},
		{
			key: 'actions',
			label: '',
			align: 'right' as any,
			sortable: false,
			searchable: false,
			render: (row) => (
				<DataTableActionMenu
					actions={[
						{
							key: 'view',
							label: 'View Details',
							icon: 'ti ti-eye',
							className: 'text-info',
							onClick: () => {
								setViewTarget(row);
								setIsViewOpen(true);
							},
						},
						...(row.status === 'REQUESTED'
							? [
									{
										key: 'review',
										label: 'Review & Approve',
										icon: 'ti ti-edit',
										onClick: () => {
											setReviewTarget(row);
											setIsReviewOpen(true);
										},
									},
									{
										key: 'reject',
										label: 'Reject Request',
										icon: 'ti ti-x',
										className: 'text-danger',
										onClick: () => {
											setRejectReason('');
											setRejectTarget(row);
										},
									},
								]
							: []),
					]}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Approve Requests' requiredPermission={PERMISSIONS.APPROVE_GOODS_TRANSFER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='RateReview' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Showroom Item Requests</span>
					<SubheaderSeparator />
					<span className='text-muted'>
						{isLoading
							? 'Loading…'
							: tab === 'pending'
								? `${pending.length} awaiting your review`
								: `${history.length} in history`}
					</span>
				</SubHeaderLeft>
				<SubHeaderRight />
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<LocationTabs
							locations={showrooms}
							selectedId={selectedShowroom}
							onSelect={setSelectedShowroom}
						/>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<div className='btn-group mb-3' role='group' aria-label='View'>
									<Button
										size='sm'
										color={tab === 'pending' ? 'primary' : 'light'}
										isLight={tab !== 'pending'}
										onClick={() => setTab('pending')}>
										Pending ({pending.length})
									</Button>
									<Button
										size='sm'
										color={tab === 'history' ? 'primary' : 'light'}
										isLight={tab !== 'history'}
										onClick={() => setTab('history')}>
										History ({history.length})
									</Button>
								</div>
								<DataTable
									columns={columns}
									data={visible}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName={tab === 'pending' ? 'goods-transfer-review-queue' : 'goods-transfer-review-history'}
									emptyText={
										tab === 'pending'
											? 'All caught up — no showroom requests waiting for review.'
											: 'Nothing in history yet.'
									}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<GoodsTransferApprovalModal
				isOpen={isReviewOpen}
				setIsOpen={(v) => {
					setIsReviewOpen(v);
					if (!v) setReviewTarget(null);
				}}
				request={reviewTarget}
				isLoading={approveMutation.isPending || rejectMutation.isPending}
				onApprove={(id, payload) => approveMutation.mutate({ id, payload })}
				onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
			/>

			<Modal
				isOpen={!!rejectTarget}
				setIsOpen={(v: boolean) => {
					if (!v) setRejectTarget(null);
				}}
				size='md'
				titleId='goods-transfer-reject-modal'
				isCentered>
				<ModalHeader
					setIsOpen={(v: boolean) => {
						if (!v) setRejectTarget(null);
					}}>
					<ModalTitle id='goods-transfer-reject-modal'>
						Reject Request — {rejectTarget?.requestNo}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<p className='text-muted'>
						{rejectTarget?.showroomName} requested {rejectTarget?.items.length} item
						{rejectTarget?.items.length === 1 ? '' : 's'}. Rejecting closes the request and
						notifies the showroom with your reason. It cannot be reopened — the showroom
						would need to raise a new request.
					</p>
					<FormGroup id='rejectReason' label='Reason (required)'>
						<Textarea
							name='rejectReason'
							rows={3}
							placeholder='Why is this request being rejected?'
							value={rejectReason}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
						/>
					</FormGroup>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setRejectTarget(null)}>
						Cancel
					</Button>
					<Button
						color='danger'
						icon='Cancel'
						isDisable={!rejectReason.trim() || rejectMutation.isPending}
						onClick={() => {
							if (rejectTarget) {
								rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
							}
						}}>
						{rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
					</Button>
				</ModalFooter>
			</Modal>

			<GoodsTransferDetailDrawer isOpen={isViewOpen} setIsOpen={setIsViewOpen} request={viewTarget} />
		</PageWrapper>
	);
};

export default GoodsTransferReviewPage;

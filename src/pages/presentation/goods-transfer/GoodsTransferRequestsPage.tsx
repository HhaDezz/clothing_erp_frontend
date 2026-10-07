import React, { useEffect, useMemo, useState } from 'react';
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
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getShowroomsApi } from '../../../api/showrooms.api';
import {
	getGoodsTransfersApi,
	createGoodsTransferApi,
	receiveGoodsTransferApi,
	GoodsTransferRequest,
	GoodsTransferCreatePayload,
} from '../../../api/goodsTransfer.api';
import CreateGoodsTransferModal from './CreateGoodsTransferModal';
import GoodsTransferDetailDrawer from './GoodsTransferDetailDrawer';
import GoodsTransferStatusBadge from './goodsTransferStatus';
import LocationTabs from './LocationTabs';

/**
 * Step 1 + step 5 for the showroom side — "Showroom User creates item
 * request" and, after issue, the showroom's own "Received" confirmation
 * (the user explicitly asked for this closing step beyond the original
 * 4-step description). Requests are scoped to the showroom(s) the current
 * user is assigned to via the existing warehouse-access mechanism, unless
 * they're unrestricted (SUPER_ADMIN or no showroom assignment at all) —
 * tabs (mirroring the Bay-1 receiving pattern) let a user assigned to more
 * than one showroom switch between them, plus an "All" tab.
 */
const GoodsTransferRequestsPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission, canActOnWarehouse, isSuperAdmin, warehouseIds } = usePermission();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedShowroom, setSelectedShowroom] = useState<number | 'ALL'>('ALL');
	const [viewTarget, setViewTarget] = useState<GoodsTransferRequest | null>(null);
	const [isViewOpen, setIsViewOpen] = useState(false);

	const canCreate = hasPermission(PERMISSIONS.CREATE_GOODS_TRANSFER);
	const canReceive = hasPermission(PERMISSIONS.RECEIVE_GOODS_TRANSFER);
	const isRestricted = !isSuperAdmin && warehouseIds.length > 0;

	const { data: showrooms = [] } = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const { data: all = [], isLoading, error } = useQuery({
		queryKey: ['goodsTransfers'],
		queryFn: getGoodsTransfersApi,
	});

	// Base visibility: restricted to the user's own assigned showroom(s)
	// unless unrestricted (matches "only assigned showroom users can see
	// requests, super admin can see everything").
	const visibleRequests = useMemo(
		() => (isRestricted ? all.filter((r) => canActOnWarehouse(r.showroomId)) : all),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[all, isRestricted],
	);

	// Deep-link support for "go to view" notifications: NotificationBell
	// routes here with ?open=<requestId>, so once the list has loaded, find
	// that row (within what this user is allowed to see) and open its
	// detail drawer, then strip the param so a back/refresh doesn't
	// re-trigger it.
	useEffect(() => {
		const openId = searchParams.get('open');
		if (!openId || visibleRequests.length === 0) return;
		const row = visibleRequests.find((r) => r.id === Number(openId));
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
	}, [searchParams, visibleRequests]);

	const myRequests =
		selectedShowroom === 'ALL'
			? visibleRequests
			: visibleRequests.filter((r) => r.showroomId === selectedShowroom);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goodsTransfers'] });

	const createMutation = useMutation({
		mutationFn: createGoodsTransferApi,
		onSuccess: (created) => {
			invalidate();
			setIsCreateOpen(false);
			showNotification(
				<>
					<Icon icon='AddShoppingCart' className='me-2' />
					Request Submitted
				</>,
				`${created.requestNo} has been sent to SL Operations for approval.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to submit request'), 'danger'),
	});

	const receiveMutation = useMutation({
		mutationFn: ({ id }: { id: number }) => receiveGoodsTransferApi(id),
		onSuccess: (updated) => {
			invalidate();
			showNotification(
				<>
					<Icon icon='CheckCircle' className='me-2' />
					Receipt Confirmed
				</>,
				`${updated.requestNo} has been received and added to the showroom's stock.`,
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to confirm receipt'), 'danger'),
	});

	const columns: DataTableColumn<GoodsTransferRequest>[] = [
		{
			key: 'requestNo',
			label: 'Request No',
			render: (row) => <span className='fw-bold text-primary'>{row.requestNo}</span>,
		},
		{ key: 'showroomName', label: 'Showroom' },
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
			key: 'rejectionReason',
			label: 'Note',
			render: (row) =>
				row.status === 'REJECTED' ? (
					<span className='text-danger small'>{row.rejectionReason || '—'}</span>
				) : (
					<span className='text-muted small'>{row.notes || '—'}</span>
				),
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
						...(canReceive && row.status === 'ISSUED'
							? [
									{
										key: 'receive',
										label: 'Confirm Received',
										icon: 'ti ti-check',
										className: 'text-success',
										onClick: () => receiveMutation.mutate({ id: row.id }),
									},
								]
							: []),
					]}
				/>
			),
		},
	];

	return (
		<PageWrapper
			title='Showroom Requests'
			requiredPermission={[
				PERMISSIONS.CREATE_GOODS_TRANSFER,
				PERMISSIONS.SHOW_GOODS_TRANSFER,
				PERMISSIONS.RECEIVE_GOODS_TRANSFER,
			]}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='AddShoppingCart' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Requests to Warehouse</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button icon='Add' color='primary' isLight onClick={() => setIsCreateOpen(true)}>
								New Request
							</Button>
						</>
					)}
				</SubHeaderRight>
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
								<DataTable
									columns={columns}
									data={myRequests}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='showroom-requests'
									emptyText='No requests yet.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateGoodsTransferModal
				isOpen={isCreateOpen}
				setIsOpen={setIsCreateOpen}
				isLoading={createMutation.isPending}
				onSubmit={(payload: GoodsTransferCreatePayload) => createMutation.mutate(payload)}
			/>

			<GoodsTransferDetailDrawer isOpen={isViewOpen} setIsOpen={setIsViewOpen} request={viewTarget} />
		</PageWrapper>
	);
};

export default GoodsTransferRequestsPage;

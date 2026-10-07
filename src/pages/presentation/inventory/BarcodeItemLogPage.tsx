import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Alert from '../../../components/bootstrap/Alert';
import Icon from '../../../components/icon/Icon';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import { getShowroomsApi } from '../../../api/showrooms.api';
import { BarcodeUnitLogRow, BarcodeUnitStatus, getBarcodeUnitLogApi } from '../../../api/barcodeUnits.api';
import { getSalesOrderByIdApi } from '../../../api/salesOrders.api';
import SalesOrderViewModal from '../../../components/sales/SalesOrderViewModal';

type StatusFilter = 'ALL' | BarcodeUnitStatus;

const STATUS_LABEL: Record<BarcodeUnitStatus, string> = {
	IN_STOCK: 'In stock',
	SOLD: 'Sold',
	AWAITING_ISSUE: 'Awaiting issue',
	IN_TRANSIT: 'In transit',
};

const STATUS_COLOR: Record<BarcodeUnitStatus, 'success' | 'primary' | 'warning' | 'info'> = {
	IN_STOCK: 'success',
	SOLD: 'primary',
	AWAITING_ISSUE: 'warning',
	IN_TRANSIT: 'info',
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

const variantLabel = (row: BarcodeUnitLogRow) => [row.size, row.color].filter(Boolean).join(' / ');

/**
 * Barcode Item Log — one row per physical garment's own barcode tag at a
 * showroom (see Goods Transfer → Barcode & Issue), showing whether that exact
 * item is still awaiting issue from the warehouse, in stock at the showroom,
 * or sold — and on which sales order. The per-tag companion to the Showroom
 * Item Log, which shows the same stock as per-variant totals.
 */
const BarcodeItemLogPage = () => {
	const [showroomId, setShowroomId] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

	// "Sales Order" column — opens the same View Details modal the Sales
	// Orders page uses, right here, without leaving this page. Fetches just
	// that one order by id (needs sales-sales_order-view; a viewer without
	// it sees the error alert below instead of the modal).
	const [viewOrderId, setViewOrderId] = useState<number | null>(null);
	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
	const {
		data: viewOrder,
		isFetching: isOrderLoading,
		isError: isOrderError,
	} = useQuery({
		queryKey: ['salesOrder', viewOrderId],
		queryFn: () => getSalesOrderByIdApi(viewOrderId as number),
		enabled: viewOrderId !== null,
	});
	useEffect(() => {
		if (viewOrder) setIsOrderModalOpen(true);
	}, [viewOrder]);
	const openSalesOrder = (orderId: number) => setViewOrderId(orderId);

	const { data: showrooms = [], isLoading: showroomsLoading } = useQuery({
		queryKey: ['showrooms'],
		queryFn: getShowroomsApi,
	});

	const effectiveShowroomId = showroomId || (showrooms[0]?.id ? String(showrooms[0].id) : '');

	const {
		data: rows = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['barcodeUnitLog', effectiveShowroomId],
		queryFn: () => getBarcodeUnitLogApi(Number(effectiveShowroomId)),
		enabled: Boolean(effectiveShowroomId),
	});

	const counts = useMemo(
		() =>
			rows.reduce(
				(acc, row) => {
					acc[row.status] += 1;
					return acc;
				},
				{ IN_STOCK: 0, SOLD: 0, AWAITING_ISSUE: 0, IN_TRANSIT: 0 } as Record<BarcodeUnitStatus, number>,
			),
		[rows],
	);

	const visibleRows = statusFilter === 'ALL' ? rows : rows.filter((row) => row.status === statusFilter);

	const columns: DataTableColumn<BarcodeUnitLogRow>[] = [
		{
			key: 'barcode',
			label: 'Barcode',
			render: (row) => <span className='font-monospace fw-semibold'>{row.barcode}</span>,
		},
		{
			key: 'productName',
			label: 'Item',
			accessor: (row) => `${row.productName ?? ''} ${variantLabel(row)} ${row.sku}`,
			exportValue: (row) => [row.productName, variantLabel(row)].filter(Boolean).join(' — '),
			sortValue: (row) => row.productName ?? row.sku,
			render: (row) => (
				<div>
					<div className='fw-semibold'>{row.productName || row.sku}</div>
					<div className='small text-muted'>
						{[row.sku, variantLabel(row)].filter(Boolean).join(' · ')}
					</div>
				</div>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			accessor: (row) => STATUS_LABEL[row.status],
			render: (row) => (
				<Badge color={STATUS_COLOR[row.status]} isLight>
					{STATUS_LABEL[row.status]}
				</Badge>
			),
		},
		{
			key: 'requestNo',
			label: 'Transfer',
			accessor: (row) => `${row.requestNo} ${row.warehouseName}`,
			exportValue: (row) => `${row.requestNo} (from ${row.warehouseName}, unit ${row.unitNo})`,
			render: (row) => (
				<div>
					<div>{row.requestNo}</div>
					<div className='small text-muted'>
						from {row.warehouseName} · unit {row.unitNo}
					</div>
				</div>
			),
		},
		{
			key: 'issuedAt',
			label: 'Received',
			searchable: false,
			sortValue: (row) => (row.issuedAt ? new Date(row.issuedAt) : null),
			exportValue: (row) => formatDateTime(row.issuedAt),
			render: (row) => <span className='small'>{formatDateTime(row.issuedAt)}</span>,
		},
		{
			key: 'soldAt',
			label: 'Sold',
			searchable: false,
			sortValue: (row) => (row.soldAt ? new Date(row.soldAt) : null),
			exportValue: (row) => formatDateTime(row.soldAt),
			render: (row) => <span className='small'>{formatDateTime(row.soldAt)}</span>,
		},
		{
			key: 'soldOrderNo',
			label: 'Sales Order',
			render: (row) =>
				row.soldOrderNo && row.soldSalesOrderId ? (
					<button
						type='button'
						className='btn btn-link p-0 fw-semibold text-decoration-none'
						disabled={isOrderLoading && viewOrderId === row.soldSalesOrderId}
						onClick={(event) => {
							event.stopPropagation();
							openSalesOrder(row.soldSalesOrderId as number);
						}}>
						{row.soldOrderNo}
						{isOrderLoading && viewOrderId === row.soldSalesOrderId && (
							<span
								className='spinner-border spinner-border-sm ms-2'
								role='status'
								aria-hidden='true'
							/>
						)}
					</button>
				) : (
					'—'
				),
		},
	];

	const filterButtons: { key: StatusFilter; label: string; count: number }[] = [
		{ key: 'ALL', label: 'All', count: rows.length },
		{ key: 'IN_STOCK', label: STATUS_LABEL.IN_STOCK, count: counts.IN_STOCK },
		{ key: 'SOLD', label: STATUS_LABEL.SOLD, count: counts.SOLD },
		{ key: 'IN_TRANSIT', label: STATUS_LABEL.IN_TRANSIT, count: counts.IN_TRANSIT },
		{ key: 'AWAITING_ISSUE', label: STATUS_LABEL.AWAITING_ISSUE, count: counts.AWAITING_ISSUE },
	];

	return (
		<PageWrapper title='Barcode Item Log' requiredPermission={PERMISSIONS.SHOW_INVENTORY_TRANSACTION}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='QrCode' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Barcode Item Log</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						{isOrderError && (
							<Alert color='danger' isLight className='mb-3' icon='ReportProblem'>
								Couldn&apos;t load that sales order — you may not have permission to view it.
							</Alert>
						)}
						<div className='mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3'>
							<div style={{ minWidth: '260px' }}>
								<label className='form-label small fw-semibold mb-1' htmlFor='barcodeLogShowroom'>
									Showroom
								</label>
								<select
									id='barcodeLogShowroom'
									className='form-select'
									value={effectiveShowroomId}
									onChange={(event) => setShowroomId(event.target.value)}
									disabled={showroomsLoading || showrooms.length === 0}>
									{showrooms.length === 0 && <option value=''>No showroom available</option>}
									{showrooms.map((showroom) => (
										<option value={showroom.id} key={showroom.id}>
											{showroom.name}
										</option>
									))}
								</select>
							</div>
							<div className='d-flex gap-4 text-end'>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>In Stock</div>
									<div className='fs-4 fw-bold text-success'>{counts.IN_STOCK}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Sold</div>
									<div className='fs-4 fw-bold text-primary'>{counts.SOLD}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>In Transit</div>
									<div className='fs-4 fw-bold text-info'>{counts.IN_TRANSIT}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Awaiting Issue</div>
									<div className='fs-4 fw-bold text-warning'>{counts.AWAITING_ISSUE}</div>
								</div>
							</div>
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<div className='btn-group mb-3' role='group' aria-label='Filter by status'>
									{filterButtons.map((button) => (
										<Button
											key={button.key}
											size='sm'
											color={statusFilter === button.key ? 'primary' : 'light'}
											isLight={statusFilter !== button.key}
											onClick={() => setStatusFilter(button.key)}>
											{button.label} ({button.count})
										</Button>
									))}
								</div>
								<DataTable
									columns={columns}
									data={visibleRows}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='barcode-item-log'
									emptyText='No barcode tags for this showroom yet — tags are created in Goods Transfer → Barcode & Issue.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<SalesOrderViewModal
				order={viewOrder ?? null}
				isOpen={isOrderModalOpen}
				setIsOpen={setIsOrderModalOpen}
			/>
		</PageWrapper>
	);
};

export default BarcodeItemLogPage;

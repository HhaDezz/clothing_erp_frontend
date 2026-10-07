import React, { useMemo, useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Button from '../../../components/bootstrap/Button';
import Nav, { NavItem } from '../../../components/bootstrap/Nav';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../../../helpers/currency';
import {
	SalesOrder,
	getSalesOrdersApi,
	getSalesOrderPaidAmount,
	getSalesOrderTenders,
} from '../../../api/salesOrders.api';
import { printSalesOrderReceipt } from '../../../helpers/generateSalesOrderReceipt';
import showNotification from '../../../components/extras/showNotification';
import { getShowroomsApi } from '../../../api/showrooms.api';
import { usePermission } from '../../../hooks/usePermission';
import SalesOrderViewModal, {
	statusColor,
	paymentColor,
	getCustomerLabel,
	getShowroomLabel,
} from '../../../components/sales/SalesOrderViewModal';

// ─── Period filter helpers ──────────────────────────────────────────────────
// Everything is compared in the browser's LOCAL time: "today's sales" has to
// mean the shop's day, not a UTC day that rolls over mid-afternoon.
type PeriodMode = 'day' | 'month' | 'all';

const pad = (n: number) => String(n).padStart(2, '0');
const toDayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMonthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const ALL_SHOWROOMS = 'ALL';

const SalesOrdersPage = () => {
	const { isSuperAdmin, warehouseIds } = usePermission();

	// "since sales are made in showrooms": one tab per showroom. A user only
	// gets tabs for the showroom(s) they are assigned to; SUPER_ADMIN gets
	// every showroom plus an "All" tab.
	const [showroomTab, setShowroomTab] = useState<string>('');
	const [periodMode, setPeriodMode] = useState<PeriodMode>('day');
	const [dayValue, setDayValue] = useState(() => toDayKey(new Date()));
	const [monthValue, setMonthValue] = useState(() => toMonthKey(new Date()));

	const { data: allShowrooms = [], isLoading: showroomsLoading } = useQuery({
		queryKey: ['showrooms'],
		queryFn: getShowroomsApi,
	});
	const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);

	// DataTableActionMenu's actions are plain onClick handlers with no
	// built-in busy/spinner state, so the row action just fires this and
	// surfaces a notification on failure — the PDF's own download prompt is
	// the success feedback, same as every other one-off action on this page.
	const handlePrintReceipt = (order: SalesOrder) => {
		printSalesOrderReceipt(order).catch(() =>
			showNotification('Error', 'Could not generate the receipt PDF.', 'danger'),
		);
	};

	const {
		data: orders = [],
		isLoading,
		error,
	} = useQuery<SalesOrder[]>({
		queryKey: ['salesOrders'],
		queryFn: getSalesOrdersApi,
	});

	const showroomTabs = useMemo(
		() =>
			isSuperAdmin
				? allShowrooms
				: allShowrooms.filter((showroom) => warehouseIds.map(Number).includes(Number(showroom.id))),
		[allShowrooms, isSuperAdmin, warehouseIds],
	);

	// Nothing picked yet → SUPER_ADMIN starts on "All", everyone else on
	// their first assigned showroom.
	const activeTab =
		showroomTab || (isSuperAdmin ? ALL_SHOWROOMS : showroomTabs[0] ? String(showroomTabs[0].id) : '');

	// Showroom first, then period. A non-admin with no showroom assigned has
	// no tab, so sees no orders at all rather than everyone's.
	const visibleOrders = useMemo(() => {
		if (!activeTab) return [];
		return orders.filter((order) => {
			if (activeTab !== ALL_SHOWROOMS && String(order.showroomId ?? '') !== activeTab) return false;
			if (periodMode === 'all') return true;
			if (!order.createdAt) return false;
			const created = new Date(order.createdAt);
			return periodMode === 'day' ? toDayKey(created) === dayValue : toMonthKey(created) === monthValue;
		});
	}, [orders, activeTab, periodMode, dayValue, monthValue]);

	// Income for exactly what the table is showing. Cancelled orders are
	// listed but are not income.
	const totals = useMemo(
		() =>
			visibleOrders
				.filter((order) => order.status !== 'CANCELLED')
				.reduce(
					(acc, order) => {
						const paid = getSalesOrderPaidAmount(order);
						acc.count += 1;
						acc.net += order.netAmount || 0;
						acc.discount += order.totalDiscount || 0;
						acc.collected += paid;
						acc.otherTenders += Math.max(0, (order.netAmount || 0) - paid);
						return acc;
					},
					{ count: 0, net: 0, discount: 0, collected: 0, otherTenders: 0 },
				),
		[visibleOrders],
	);

	const periodLabel =
		periodMode === 'all'
			? 'All time'
			: periodMode === 'day'
				? dayValue === toDayKey(new Date())
					? 'Today'
					: new Date(`${dayValue}T00:00:00`).toLocaleDateString()
				: new Date(`${monthValue}-01T00:00:00`).toLocaleDateString(undefined, {
						month: 'long',
						year: 'numeric',
					});

	const incomeCards: { label: string; value: string; hint: string; className?: string }[] = [
		{ label: 'Orders', value: String(totals.count), hint: periodLabel },
		{ label: 'Net Sales', value: formatCurrency(totals.net), hint: 'value of goods sold' },
		{
			label: 'Collected',
			value: formatCurrency(totals.collected),
			hint: 'cash / card / cheque / transfer',
			className: 'text-success',
		},
		{
			label: 'Points, Credit & Gift Cards',
			value: formatCurrency(totals.otherTenders),
			hint: 'settled without cash',
			className: 'text-danger',
		},
		{ label: 'Discounts Given', value: formatCurrency(totals.discount), hint: periodLabel },
	];

	const columns: DataTableColumn<SalesOrder>[] = [
		{
			key: 'orderNo',
			label: 'Order No',
			render: (row) => (
				<>
					<span className='fw-bold text-primary'>{row.orderNo}</span>
					{/* "should show customer used 100 points likewise" — a small
					    sub-line per non-cash tender, same fields as SalesOrderViewModal. */}
					{getSalesOrderTenders(row).map((tender) => (
						<div className='text-muted small' key={tender.key}>
							{tender.key === 'points' && <Icon icon='Stars' size='sm' className='me-1' />}
							{tender.label}: -{formatCurrency(tender.amount)}
						</div>
					))}
				</>
			),
		},
		{
			key: 'customerName',
			label: 'Customer',
			render: (row) => <span>{getCustomerLabel(row)}</span>,
		},
		{
			key: 'showroomName',
			label: 'Showroom',
			render: (row) => (
				<span className='text-muted'>
					{row.showroomName ? (
						<>
							<Icon icon='Storefront' size='sm' className='me-1' />
							{row.showroomName}
						</>
					) : (
						'—'
					)}
				</span>
			),
		},
		{
			key: 'orderType',
			label: 'Type',
			align: 'center',
			render: (row) => (
				<Badge color='info' isLight>
					{row.orderType}
				</Badge>
			),
		},
		{
			key: 'netAmount',
			label: 'Net Amount',
			align: 'right',
			render: (row) => (
				<span className='fw-bold'>{formatCurrency(row.netAmount || 0)}</span>
			),
		},
		{
			// Net Amount less loyalty points redeemed — what was actually
			// collected for the order.
			key: 'paidAmount',
			label: 'Paid Amount',
			align: 'right',
			render: (row) => (
				<span className='fw-bold text-success'>
					{formatCurrency(getSalesOrderPaidAmount(row))}
				</span>
			),
		},
		{
			key: 'paymentStatus',
			label: 'Payment',
			align: 'center',
			render: (row) => (
				<Badge color={paymentColor(row.paymentStatus)} isLight>
					{row.paymentStatus}
				</Badge>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={statusColor(row.status)} isLight>
					{row.status}
				</Badge>
			),
		},
		{
			key: 'createdAt',
			label: 'Date',
			render: (row) => (
				<span className='text-muted small'>
					{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
				</span>
			),
		},
	];

	return (
		<PageWrapper title='Sales Orders' requiredPermission={PERMISSIONS.SHOW_SALES_ORDER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Receipt' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Sales Orders</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						{/* Showroom tabs */}
						{showroomsLoading ? null : showroomTabs.length === 0 && !isSuperAdmin ? (
							<div className='alert alert-warning'>
								<Icon icon='Storefront' className='me-2' />
								You are not assigned to any showroom, so there are no sales to show. Ask an
								administrator to assign you one under Showroom Access.
							</div>
						) : (
							<Nav pills className='mb-3'>
								{isSuperAdmin && (
									<NavItem isActive={activeTab === ALL_SHOWROOMS}>
										<span
											onClick={() => setShowroomTab(ALL_SHOWROOMS)}
											className='cursor-pointer fw-bold px-4 py-2'>
											All Showrooms
										</span>
									</NavItem>
								)}
								{showroomTabs.map((showroom) => (
									<NavItem isActive={activeTab === String(showroom.id)} key={showroom.id}>
										<span
											onClick={() => setShowroomTab(String(showroom.id))}
											className='cursor-pointer fw-bold px-4 py-2'>
											<Icon icon='Storefront' size='sm' className='me-1' />
											{showroom.name}
										</span>
									</NavItem>
								))}
							</Nav>
						)}

						{/* Period filter */}
						<div className='d-flex flex-wrap align-items-center gap-2 mb-3'>
							<div className='btn-group' role='group' aria-label='Filter by period'>
								<Button
									size='sm'
									color={periodMode === 'day' ? 'primary' : 'light'}
									isLight={periodMode !== 'day'}
									onClick={() => setPeriodMode('day')}>
									Daily
								</Button>
								<Button
									size='sm'
									color={periodMode === 'month' ? 'primary' : 'light'}
									isLight={periodMode !== 'month'}
									onClick={() => setPeriodMode('month')}>
									Monthly
								</Button>
								<Button
									size='sm'
									color={periodMode === 'all' ? 'primary' : 'light'}
									isLight={periodMode !== 'all'}
									onClick={() => setPeriodMode('all')}>
									All time
								</Button>
							</div>
							{periodMode === 'day' && (
								<>
									<input
										type='date'
										aria-label='Day'
										className='form-control form-control-sm'
										style={{ width: 170 }}
										value={dayValue}
										onChange={(e) => e.target.value && setDayValue(e.target.value)}
									/>
									<Button
										size='sm'
										color='light'
										onClick={() => setDayValue(toDayKey(new Date()))}>
										Today
									</Button>
								</>
							)}
							{periodMode === 'month' && (
								<>
									<input
										type='month'
										aria-label='Month'
										className='form-control form-control-sm'
										style={{ width: 170 }}
										value={monthValue}
										onChange={(e) => e.target.value && setMonthValue(e.target.value)}
									/>
									<Button
										size='sm'
										color='light'
										onClick={() => setMonthValue(toMonthKey(new Date()))}>
										This month
									</Button>
								</>
							)}
						</div>

						{/* Income cards — always for the showroom tab + period above */}
						<div className='row g-3 mb-3'>
							{incomeCards.map((card) => (
								<div className='col-6 col-lg' key={card.label}>
									<div className='bg-light rounded-3 p-3 h-100'>
										<div className='text-muted small text-uppercase fw-semibold mb-1'>
											{card.label}
										</div>
										<div className={`fs-4 fw-bold ${card.className ?? ''}`}>{card.value}</div>
										<div className='text-muted small'>{card.hint}</div>
									</div>
								</div>
							))}
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={[
										...columns,
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
																setViewOrder(row);
																setIsViewModalOpen(true);
															},
														},
														{
															key: 'printReceipt',
															label: 'Print Receipt',
															icon: 'ti ti-printer',
															className: 'text-primary',
															onClick: () => handlePrintReceipt(row),
														},
													]}
												/>
											),
										},
									]}
									data={visibleOrders}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='sales-orders'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<SalesOrderViewModal
				order={viewOrder}
				isOpen={isViewModalOpen}
				setIsOpen={setIsViewModalOpen}
			/>
		</PageWrapper>
	);
};

export default SalesOrdersPage;

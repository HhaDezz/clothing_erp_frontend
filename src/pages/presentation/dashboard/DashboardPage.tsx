import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactApexChart from 'react-apexcharts';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody, CardHeader, CardTitle } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Spinner from '../../../components/bootstrap/Spinner';
import useDarkMode from '../../../hooks/useDarkMode';
import { getClothingDashboardApi } from '../../../api/dashboard.api';
import { OperationalReportRow } from '../../../api/report.api';
import {
	inventoryMenu,
	productionMenu,
	purchasingMenu,
	reportsMenu,
	salesMenu,
} from '../../../menu';

type TPeriod = 7 | 30 | 90;
type TColor = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';

const getPathValue = (row: OperationalReportRow, path: string): unknown =>
	path.split('.').reduce<unknown>((current, key) => {
		if (!current || typeof current !== 'object') return undefined;
		return (current as Record<string, unknown>)[key];
	}, row);

const firstValue = (row: OperationalReportRow, keys: string[]): unknown => {
	for (const key of keys) {
		const value = getPathValue(row, key);
		if (value !== undefined && value !== null && value !== '') return value;
	}
	return undefined;
};

const textValue = (row: OperationalReportRow, keys: string[], fallback = '—') => {
	const value = firstValue(row, keys);
	return value === undefined ? fallback : String(value);
};

const numberValue = (row: OperationalReportRow, keys: string[]) => {
	const value = Number(firstValue(row, keys) ?? 0);
	return Number.isFinite(value) ? value : 0;
};

const rowDate = (row: OperationalReportRow, keys: string[]) => {
	const value = firstValue(row, keys);
	if (!value) return null;
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
};

const localDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const formatCurrency = (value: number) =>
	`Rs. ${value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const statusColor = (status: string): TColor => {
	const value = status.toUpperCase();
	if (['COMPLETED', 'PAID', 'PASS', 'DELIVERED', 'REALIZED'].includes(value)) return 'success';
	if (['PENDING', 'PARTIAL', 'OPEN', 'RECEIVED', 'IN_PROGRESS'].includes(value)) {
		return 'warning';
	}
	if (['FAILED', 'REJECT', 'REJECTED', 'CANCELLED', 'BOUNCED'].includes(value)) {
		return 'danger';
	}
	return 'info';
};

interface IKpiCardProps {
	label: string;
	value: string | number;
	detail: string;
	icon: string;
	color: TColor;
	to: string;
}

const KpiCard: FC<IKpiCardProps> = ({ label, value, detail, icon, color, to }) => (
	<Link to={to} className='text-decoration-none text-reset d-block h-100'>
		<Card className='shadow-sm border-0 h-100'>
			<CardBody className='p-4'>
				<div className='d-flex align-items-start justify-content-between gap-3'>
					<div>
						<div className='text-muted small fw-semibold text-uppercase mb-2'>
							{label}
						</div>
						<div className='fs-3 fw-bolder mb-1'>{value}</div>
						<div className='small text-muted'>{detail}</div>
					</div>
					<div className={`rounded-circle bg-${color} bg-opacity-10 p-3 flex-shrink-0`}>
						<Icon icon={icon as any} color={color} size='2x' />
					</div>
				</div>
			</CardBody>
		</Card>
	</Link>
);

interface IActionItemProps {
	label: string;
	detail: string;
	count: number;
	icon: string;
	color: TColor;
	to: string;
}

const ActionItem: FC<IActionItemProps> = ({ label, detail, count, icon, color, to }) => (
	<Link
		to={to}
		className='d-flex align-items-center gap-3 p-3 border-bottom text-decoration-none text-reset'>
		<div className={`rounded-circle bg-${color} bg-opacity-10 p-2 flex-shrink-0`}>
			<Icon icon={icon as any} color={color} />
		</div>
		<div className='flex-grow-1 overflow-hidden'>
			<div className='fw-semibold'>{label}</div>
			<div className='small text-muted text-truncate'>{detail}</div>
		</div>
		<Badge color={count > 0 ? color : 'secondary'} isLight>
			{count}
		</Badge>
	</Link>
);

const EmptyChart = ({ message }: { message: string }) => (
	<div className='d-flex flex-column align-items-center justify-content-center text-muted py-5'>
		<Icon icon='InsertChart' size='3x' className='opacity-25 mb-2' />
		<span>{message}</span>
	</div>
);

const DashboardPage = () => {
	const [period, setPeriod] = useState<TPeriod>(30);
	const { darkModeStatus } = useDarkMode();

	const dateFrom = (() => {
		const date = new Date();
		date.setDate(date.getDate() - period + 1);
		return localDateKey(date);
	})();
	const dateTo = localDateKey(new Date());

	const { data, isLoading, isFetching, refetch } = useQuery({
		queryKey: ['clothing-dashboard', period],
		queryFn: () =>
			getClothingDashboardApi({
				date_from: dateFrom,
				date_to: dateTo,
			}),
	});

	const salesOrders = data?.salesOrders ?? [];
	const payments = data?.payments ?? [];
	const inventory = data?.inventory ?? [];
	const purchaseOrders = data?.purchaseOrders ?? [];
	const workOrders = data?.workOrders ?? [];
	const qualityChecks = data?.qualityChecks ?? [];
	const deliveries = data?.deliveries ?? [];
	const metrics = data?.metrics;

	const salesValue = salesOrders.reduce(
		(total, order) =>
			total + numberValue(order, ['netAmount', 'net_amount', 'totalAmount', 'total']),
		0,
	);
	const periodSales = salesOrders.length > 0 ? salesValue : Number(metrics?.totalSales || 0);
	const orderCount =
		salesOrders.length ||
		Object.values(metrics?.recentOrdersCount ?? {}).reduce((total, count) => total + count, 0);
	const pendingCustomOrders = salesOrders.filter((order) => {
		const type = textValue(order, ['orderType', 'order_type'], '').toUpperCase();
		const status = textValue(order, ['status'], '').toUpperCase();
		return (
			(type.includes('SEW') || type.includes('CUSTOM')) &&
			!['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(status)
		);
	}).length;
	const activeWorkOrders = workOrders.filter(
		(order) =>
			!['COMPLETED', 'CANCELLED'].includes(textValue(order, ['status'], '').toUpperCase()),
	).length;
	const lowStockItems = inventory.filter((stock) => {
		const explicit = firstValue(stock, ['is_low_stock', 'isLowStock']);
		if (explicit !== undefined) return Boolean(explicit);
		return (
			numberValue(stock, ['quantity_available', 'quantityAvailable']) <=
			numberValue(stock, ['reorder_level', 'reorderLevel'])
		);
	}).length;
	const lowStockCount =
		inventory.length > 0 ? lowStockItems : Number(metrics?.lowStockItems || 0);
	const pendingPurchaseOrders = purchaseOrders.filter(
		(order) =>
			!['COMPLETED', 'CANCELLED'].includes(textValue(order, ['status'], '').toUpperCase()),
	).length;
	const qcAttention = qualityChecks.filter(
		(check) => textValue(check, ['decision'], '').toUpperCase() !== 'PASS',
	).length;
	const pendingDeliveries = deliveries.filter(
		(delivery) =>
			!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(
				textValue(delivery, ['status'], '').toUpperCase(),
			),
	).length;
	const pendingCheques = payments.filter((payment) => {
		const method = textValue(payment, ['method', 'paymentMethod'], '').toUpperCase();
		const status = textValue(payment, ['status', 'paymentStatus'], '').toUpperCase();
		return method === 'CHEQUE' && !['REALIZED', 'CANCELLED'].includes(status);
	}).length;

	const trend = (() => {
		const chartDays = Math.min(period, 14);
		const days = Array.from({ length: chartDays }, (_, index) => {
			const date = new Date();
			date.setDate(date.getDate() - chartDays + index + 1);
			return date;
		});
		const totals = Object.fromEntries(days.map((date) => [localDateKey(date), 0]));

		salesOrders.forEach((order) => {
			const date = rowDate(order, ['createdAt', 'created_at', 'orderDate']);
			if (!date) return;
			const key = localDateKey(date);
			if (key in totals) totals[key] += 1;
		});

		if (salesOrders.length === 0 && metrics?.recentOrdersCount) {
			Object.entries(metrics.recentOrdersCount).forEach(([key, count]) => {
				if (key in totals) totals[key] = count;
			});
		}

		return {
			categories: days.map((date) =>
				date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
			),
			values: days.map((date) => totals[localDateKey(date)]),
		};
	})();

	const paymentBreakdown = (() => {
		const values: Record<'CASH' | 'CHEQUE' | 'OTHER', number> = {
			CASH: 0,
			CHEQUE: 0,
			OTHER: 0,
		};
		payments.forEach((payment) => {
			const method = textValue(payment, ['method', 'paymentMethod'], 'OTHER').toUpperCase();
			const key = method === 'CASH' || method === 'CHEQUE' ? method : 'OTHER';
			values[key] += numberValue(payment, ['amount', 'netTotal', 'net_total']);
		});
		return values;
	})();

	const productionBreakdown = (() => {
		const values = new Map<string, number>();
		workOrders.forEach((order) => {
			const status = textValue(order, ['status'], 'UNASSIGNED').replaceAll('_', ' ');
			values.set(status, (values.get(status) || 0) + 1);
		});
		return values;
	})();

	const chartTextColor = darkModeStatus ? '#adb5bd' : '#6c757d';
	const orderChartOptions: ApexCharts.ApexOptions = {
		chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
		colors: ['#0d6efd'],
		dataLabels: { enabled: false },
		stroke: { curve: 'smooth', width: 3 },
		fill: {
			type: 'gradient',
			gradient: { opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 95, 100] },
		},
		xaxis: {
			categories: trend.categories,
			labels: { style: { colors: chartTextColor } },
			axisBorder: { show: false },
			axisTicks: { show: false },
		},
		yaxis: {
			min: 0,
			forceNiceScale: true,
			labels: {
				style: { colors: chartTextColor },
				formatter: (value) => Math.round(value).toString(),
			},
		},
		grid: { borderColor: darkModeStatus ? '#343a40' : '#e9ecef', strokeDashArray: 4 },
		tooltip: { theme: darkModeStatus ? 'dark' : 'light' },
	};

	const donutOptions = (labels: string[], colors: string[]): ApexCharts.ApexOptions => ({
		chart: { type: 'donut', fontFamily: 'inherit' },
		labels,
		colors,
		legend: { position: 'bottom', labels: { colors: chartTextColor } },
		dataLabels: { enabled: false },
		stroke: { width: 2, colors: [darkModeStatus ? '#212529' : '#ffffff'] },
		plotOptions: { pie: { donut: { size: '68%' } } },
		tooltip: { theme: darkModeStatus ? 'dark' : 'light' },
	});

	const recentOrders = [...salesOrders]
		.sort(
			(a, b) =>
				(rowDate(b, ['createdAt', 'created_at'])?.getTime() || 0) -
				(rowDate(a, ['createdAt', 'created_at'])?.getTime() || 0),
		)
		.slice(0, 6);

	const actionItems: IActionItemProps[] = [
		{
			label: 'Custom orders waiting',
			detail: 'Sew-and-sell orders requiring production attention',
			count: pendingCustomOrders || Number(metrics?.pendingOrders || 0),
			icon: 'DryCleaning',
			color: 'warning',
			to: productionMenu.sewAndSell.path,
		},
		{
			label: 'Low-stock items',
			detail: 'Materials or finished goods below reorder level',
			count: lowStockCount,
			icon: 'Warning',
			color: 'danger',
			to: inventoryMenu.stockLedger.path,
		},
		{
			label: 'Purchase orders open',
			detail: 'Pending, issued or partially received purchases',
			count: pendingPurchaseOrders,
			icon: 'LocalMall',
			color: 'info',
			to: purchasingMenu.purchaseOrders.path,
		},
		{
			label: 'QC needs attention',
			detail: 'Rejected or rework inspection decisions',
			count: qcAttention,
			icon: 'Verified',
			color: 'danger',
			to: productionMenu.qualityChecks.path,
		},
		{
			label: 'Deliveries pending',
			detail: 'Completed garments waiting for dispatch or delivery',
			count: pendingDeliveries,
			icon: 'LocalShipping',
			color: 'primary',
			to: productionMenu.deliveries.path,
		},
		{
			label: 'Cheques pending',
			detail: 'Received cheques not yet realized or cancelled',
			count: pendingCheques,
			icon: 'RequestQuote',
			color: 'warning',
			to: reportsMenu.payments.path,
		},
	];

	return (
		<PageWrapper title='Clothing ERP Dashboard'>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Dashboard' size='2x' color='primary' />
					<div className='ms-2'>
						<div className='fs-5 fw-bold'>Clothing ERP Dashboard</div>
						<div className='small text-muted'>
							Sales, stock and production control center
						</div>
					</div>
				</SubHeaderLeft>
				<SubHeaderRight>
					<div className='btn-group me-2' role='group' aria-label='Dashboard period'>
						{([7, 30, 90] as TPeriod[]).map((days) => (
							<Button
								key={days}
								color={period === days ? 'primary' : 'light'}
								onClick={() => setPeriod(days)}>
								{days} days
							</Button>
						))}
					</div>
					<Button
						icon='Refresh'
						color='light'
						onClick={() => refetch()}
						isDisable={isFetching}>
						Refresh
					</Button>
				</SubHeaderRight>
			</SubHeader>

			<Page container='fluid'>
				{isLoading ? (
					<div
						className='d-flex justify-content-center align-items-center'
						style={{ minHeight: 420 }}>
						<Spinner color='primary' />
					</div>
				) : (
					<>
						{Boolean(data?.unavailableSections.length) && (
							<div className='alert alert-warning d-flex align-items-start gap-2'>
								<Icon icon='CloudOff' className='mt-1' />
								<div>
									<strong>Some live sections are temporarily unavailable.</strong>
									<div className='small'>
										Showing all available information. Missing:{' '}
										{data?.unavailableSections.join(', ')}.
									</div>
								</div>
							</div>
						)}

						<div className='row g-4 mb-4'>
							<div className='col-sm-6 col-xl-3'>
								<KpiCard
									label={`${period}-Day Sales`}
									value={formatCurrency(periodSales)}
									detail={`${orderCount} orders in selected period`}
									icon='Paid'
									color='success'
									to={reportsMenu.sales.path}
								/>
							</div>
							<div className='col-sm-6 col-xl-3'>
								<KpiCard
									label='Custom Orders Pending'
									value={
										pendingCustomOrders || Number(metrics?.pendingOrders || 0)
									}
									detail={`${activeWorkOrders} active production work orders`}
									icon='DryCleaning'
									color='warning'
									to={productionMenu.sewAndSell.path}
								/>
							</div>
							<div className='col-sm-6 col-xl-3'>
								<KpiCard
									label='Low Stock Alerts'
									value={lowStockCount}
									detail={`${inventory.length} inventory records monitored`}
									icon='Warning'
									color='danger'
									to={reportsMenu.inventory.path}
								/>
							</div>
							<div className='col-sm-6 col-xl-3'>
								<KpiCard
									label='Customers & Products'
									value={Number(metrics?.totalCustomers || 0).toLocaleString()}
									detail={`${Number(metrics?.activeProducts || 0)} active products/styles`}
									icon='People'
									color='primary'
									to={reportsMenu.customers.path}
								/>
							</div>
						</div>

						<div className='row g-4 mb-4'>
							<div className='col-xl-8'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Order Activity</CardTitle>
										<span className='small text-muted'>
											Last {Math.min(period, 14)} days
										</span>
									</CardHeader>
									<CardBody>
										{trend.values.some((value) => value > 0) ? (
											<ReactApexChart
												options={orderChartOptions}
												series={[{ name: 'Orders', data: trend.values }]}
												type='area'
												height={310}
											/>
										) : (
											<EmptyChart message='No order activity in this period.' />
										)}
									</CardBody>
								</Card>
							</div>
							<div className='col-xl-4'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Attention Queue</CardTitle>
									</CardHeader>
									<CardBody className='p-0'>
										{actionItems.map((item) => (
											<ActionItem
												key={item.label}
												label={item.label}
												detail={item.detail}
												count={item.count}
												icon={item.icon}
												color={item.color}
												to={item.to}
											/>
										))}
									</CardBody>
								</Card>
							</div>
						</div>

						<div className='row g-4 mb-4'>
							<div className='col-lg-6'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Collection Mix</CardTitle>
									</CardHeader>
									<CardBody>
										{Object.values(paymentBreakdown).some(
											(value) => value > 0,
										) ? (
											<ReactApexChart
												options={donutOptions(
													['Cash', 'Cheque', 'Other / Invoice'],
													['#198754', '#0d6efd', '#6c757d'],
												)}
												series={Object.values(paymentBreakdown)}
												type='donut'
												height={290}
											/>
										) : (
											<EmptyChart message='No payment collections in this period.' />
										)}
									</CardBody>
								</Card>
							</div>
							<div className='col-lg-6'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Production Status</CardTitle>
									</CardHeader>
									<CardBody>
										{productionBreakdown.size > 0 ? (
											<ReactApexChart
												options={donutOptions(
													Array.from(productionBreakdown.keys()),
													[
														'#0d6efd',
														'#0dcaf0',
														'#ffc107',
														'#198754',
														'#dc3545',
													],
												)}
												series={Array.from(productionBreakdown.values())}
												type='donut'
												height={290}
											/>
										) : (
											<EmptyChart message='No production work orders in this period.' />
										)}
									</CardBody>
								</Card>
							</div>
						</div>

						<div className='row g-4'>
							<div className='col-xl-8'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Recent Orders</CardTitle>
										<Link
											to={salesMenu.salesOrders.path}
											className='small fw-semibold'>
											View all
										</Link>
									</CardHeader>
									<CardBody className='p-0'>
										{recentOrders.length > 0 ? (
											<div className='table-responsive'>
												<table className='table table-hover align-middle mb-0'>
													<thead>
														<tr>
															<th>Order</th>
															<th>Customer</th>
															<th>Type</th>
															<th>Status</th>
															<th className='text-end'>Amount</th>
														</tr>
													</thead>
													<tbody>
														{recentOrders.map((order, index) => {
															const status = textValue(order, [
																'status',
															]);
															return (
																<tr
																	key={String(
																		firstValue(order, ['id']) ??
																			index,
																	)}>
																	<td className='fw-bold text-primary'>
																		{textValue(order, [
																			'orderNo',
																			'order_no',
																		])}
																	</td>
																	<td>
																		{textValue(order, [
																			'customerName',
																			'customer.name',
																			'customerId',
																		])}
																	</td>
																	<td>
																		{textValue(order, [
																			'orderType',
																			'order_type',
																		])}
																	</td>
																	<td>
																		<Badge
																			color={statusColor(
																				status,
																			)}
																			isLight>
																			{status}
																		</Badge>
																	</td>
																	<td className='text-end fw-semibold'>
																		{formatCurrency(
																			numberValue(order, [
																				'netAmount',
																				'net_amount',
																				'totalAmount',
																			]),
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										) : (
											<div className='text-center text-muted py-5'>
												No recent orders available.
											</div>
										)}
									</CardBody>
								</Card>
							</div>
							<div className='col-xl-4'>
								<Card className='h-100 shadow-sm border-0'>
									<CardHeader>
										<CardTitle>Quick Actions</CardTitle>
									</CardHeader>
									<CardBody className='d-grid gap-3'>
										<Link
											to={salesMenu.pos.path}
											className='btn btn-primary text-start p-3'>
											<Icon icon='PointOfSale' className='me-2' /> Open Point
											of Sale
										</Link>
										<Link
											to={productionMenu.sewAndSell.path}
											className='btn btn-outline-primary text-start p-3'>
											<Icon icon='DryCleaning' className='me-2' /> Create
											Custom Order
										</Link>
										<Link
											to={purchasingMenu.purchaseOrders.path}
											className='btn btn-outline-primary text-start p-3'>
											<Icon icon='LocalMall' className='me-2' /> Manage
											Purchasing
										</Link>
										<Link
											to={reportsMenu.overview.path}
											className='btn btn-outline-primary text-start p-3'>
											<Icon icon='Assessment' className='me-2' /> Open Report
											Center
										</Link>
									</CardBody>
								</Card>
							</div>
						</div>
					</>
				)}
			</Page>
		</PageWrapper>
	);
};

export default DashboardPage;

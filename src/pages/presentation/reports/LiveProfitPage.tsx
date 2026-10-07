import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import { getLiveProfitApi, LiveProfitLine } from '../../../api/liveProfit.api';

const formatCurrency = (value?: number | null) =>
	value === null || value === undefined
		? '—'
		: `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DAY_OPTIONS = [
	{ value: 1, label: 'Today' },
	{ value: 7, label: '7 days' },
	{ value: 30, label: '30 days' },
	{ value: 90, label: '90 days' },
];

// Auto-refresh interval for the "live" part of "live profit need to be
// displayed when sales made" — a short polling interval on top of this
// codebase's existing React Query usage, not a push/websocket mechanism.
const LIVE_REFRESH_MS = 20_000;

/**
 * Manager-only Live Sales & Profit view — "costing (including vat) and live
 * profit need to be displayed when sales made". Deliberately a separate
 * page, gated on its own reporting-profit-view permission, never surfaced on
 * the cashier's own POS screen — see LiveProfitService on the backend for
 * why, and how a line's cost is computed.
 */
const LiveProfitPage = () => {
	const [days, setDays] = useState(30);

	const {
		data: report,
		isLoading,
		isFetching,
		error,
	} = useQuery({
		queryKey: ['liveProfit', days],
		queryFn: () => getLiveProfitApi(days),
		refetchInterval: LIVE_REFRESH_MS,
	});

	const lines = report?.lines ?? [];

	const columns: DataTableColumn<LiveProfitLine>[] = [
		{
			key: 'orderNo',
			label: 'Order',
			render: (row) => (
				<div>
					<div className='fw-semibold'>{row.orderNo}</div>
					<div className='small text-muted'>{new Date(row.soldAt).toLocaleString()}</div>
				</div>
			),
		},
		{
			key: 'showroomName',
			label: 'Showroom',
			render: (row) => row.showroomName || '—',
		},
		{
			key: 'productName',
			label: 'Item',
			accessor: (row) => `${row.productName ?? ''} ${row.sku ?? ''}`,
			render: (row) => (
				<div>
					<div className='fw-semibold'>{row.productName || row.sku || '—'}</div>
					{row.sku && <div className='small text-muted'>{row.sku}</div>}
				</div>
			),
		},
		{
			key: 'qty',
			label: 'Qty',
			align: 'center',
		},
		{
			key: 'revenue',
			label: 'Revenue',
			align: 'right',
			searchable: false,
			exportValue: (row) => row.revenue,
			render: (row) => formatCurrency(row.revenue),
		},
		{
			key: 'unitCost',
			label: 'Unit Cost (inc. VAT)',
			align: 'right',
			searchable: false,
			exportValue: (row) => row.unitCost,
			render: (row) => (
				<span>
					{formatCurrency(row.unitCost)}
					{!row.costIsExact && (
						<Badge color='warning' isLight className='ms-2' title='No batch cost on record — using the variant&apos;s current cost price instead'>
							approx
						</Badge>
					)}
				</span>
			),
		},
		{
			key: 'profit',
			label: 'Profit',
			align: 'right',
			searchable: false,
			exportValue: (row) => row.profit,
			render: (row) => (
				<span className={`fw-semibold ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}>
					{formatCurrency(row.profit)}
				</span>
			),
		},
		{
			key: 'marginPercent',
			label: 'Margin',
			align: 'right',
			searchable: false,
			exportValue: (row) => row.marginPercent,
			render: (row) => <span>{row.marginPercent.toFixed(1)}%</span>,
		},
	];

	return (
		<PageWrapper title='Live Profit' requiredPermission={PERMISSIONS.SHOW_PROFIT_REPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='TrendingUp' size='2x' color='success' />
					<span className='fs-5 fw-bold ms-2'>Live Sales &amp; Profit</span>
					{isFetching && !isLoading && (
						<span className='spinner-border spinner-border-sm text-muted ms-3' role='status' aria-hidden='true' />
					)}
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<div className='mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3'>
							<div className='btn-group' role='group' aria-label='Time range'>
								{DAY_OPTIONS.map((option) => (
									<Button
										key={option.value}
										size='sm'
										color={days === option.value ? 'primary' : 'light'}
										isLight={days !== option.value}
										onClick={() => setDays(option.value)}>
										{option.label}
									</Button>
								))}
							</div>
							<div className='d-flex gap-4 text-end'>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Revenue</div>
									<div className='fs-5 fw-bold'>{formatCurrency(report?.totalRevenue)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Cost</div>
									<div className='fs-5 fw-bold'>{formatCurrency(report?.totalCost)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Profit</div>
									<div
										className={`fs-5 fw-bold ${(report?.totalProfit ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
										{formatCurrency(report?.totalProfit)}
									</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Margin</div>
									<div className='fs-5 fw-bold'>{(report?.marginPercent ?? 0).toFixed(1)}%</div>
								</div>
							</div>
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={lines}
									rowKey='saleItemId'
									loading={isLoading}
									error={error}
									fileName='live-profit'
									emptyText='No stock sales in this time range yet.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>
		</PageWrapper>
	);
};

export default LiveProfitPage;

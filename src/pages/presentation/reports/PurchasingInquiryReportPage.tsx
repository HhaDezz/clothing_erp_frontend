import React, { useMemo, useState } from 'react';
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
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { formatCurrency } from '../../../helpers/currency';
import {
	computeInquiryEconomics,
	formatBreakdown,
	formatPercent,
	formatPointsRedeemed,
	formatQty,
	getPurchasingInquiryReportApi,
	InquiryEconomics,
	marginColorClass,
	mergeBreakdowns,
	PurchasingInquiryReport,
} from '../../../api/purchasingReport.api';
import PurchasingInquiryDetailModal, {
	inquiryStatusColor,
	inquiryStatusLabel,
} from '../../../components/reports/PurchasingInquiryDetailModal';

type InquiryRow = PurchasingInquiryReport & {
	econ: InquiryEconomics;
	// Merged across every item on this inquiry — how many distinct
	// warehouses/showrooms currently hold this inquiry's stock in total.
	// Exact per-item, per-location quantities are in "View Details".
	warehouseBreakdown: Record<string, number>;
	showroomBreakdown: Record<string, number>;
};

// "5 (3 warehouses)" when spread across more than one location, else just
// "5" — keeps single-location rows uncluttered while making a multi-location
// item impossible to miss at a glance, with the exact split on hover.
const qtyWithLocationHint = (qty: number, breakdown: Record<string, number>, unitLabel: string): { text: string; title?: string } => {
	const locations = Object.entries(breakdown).filter(([, v]) => v > 0);
	if (locations.length <= 1) return { text: formatQty(qty) };
	return {
		text: `${formatQty(qty)} (${locations.length} ${unitLabel}s)`,
		title: formatBreakdown(breakdown),
	};
};

/**
 * Purchasing Report, Purchase-Inquiry-wise — "view ordered items and their
 * locations: how many bar coded, how many in warehouses and which, how many
 * in showrooms and which, how many sold / costing (inc. VAT) and current
 * earning + profit margin". One row per inquiry; "View Details" opens the
 * full item-level breakdown (warehouses, showrooms, costing) in a modal.
 * Traceability past "received" — and therefore costing/earning/margin — is
 * exact only once that inquiry's stock has been imported and stock-committed
 * (see StockBatch on the backend); an inquiry from before batch tracking
 * shipped shows zero downstream and "—" for costing (flagged in the modal),
 * not a wrong number.
 */
const PurchasingInquiryReportPage = () => {
	const [statusFilter, setStatusFilter] = useState('ALL');
	const [viewInquiry, setViewInquiry] = useState<PurchasingInquiryReport | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const {
		data: inquiries = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['purchasingInquiryReport'],
		queryFn: getPurchasingInquiryReportApi,
	});

	const rows: InquiryRow[] = useMemo(
		() =>
			inquiries.map((inquiry) => ({
				...inquiry,
				econ: computeInquiryEconomics(inquiry),
				warehouseBreakdown: mergeBreakdowns(inquiry.lines.map((line) => line.warehouseBreakdown)),
				showroomBreakdown: mergeBreakdowns(inquiry.lines.map((line) => line.showroomBreakdown)),
			})),
		[inquiries],
	);

	const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);

	const visibleRows = statusFilter === 'ALL' ? rows : rows.filter((row) => row.status === statusFilter);

	const totals = useMemo(
		() =>
			visibleRows.reduce(
				(acc, row) => {
					acc.ordered += row.totalOrderedQty;
					acc.received += row.totalReceivedQty;
					acc.inWarehouse += row.totalInWarehouseQty;
					acc.inShowroom += row.totalInShowroomQty;
					acc.sold += row.totalSoldQty;
					if (row.econ.landedCost !== null) acc.landedCost += row.econ.landedCost;
					if (row.econ.earning !== null) acc.earning += row.econ.earning;
					if (row.econ.profit !== null) acc.profit += row.econ.profit;
					acc.pointsRedeemed += row.econ.pointsRedeemed;
					acc.pointsRedeemedValue += row.econ.pointsRedeemedValue;
					if (row.econ.hasCostData) acc.hasCostData = true;
					return acc;
				},
				{
					ordered: 0,
					received: 0,
					inWarehouse: 0,
					inShowroom: 0,
					sold: 0,
					landedCost: 0,
					earning: 0,
					profit: 0,
					pointsRedeemed: 0,
					pointsRedeemedValue: 0,
					hasCostData: false,
				},
			),
		[visibleRows],
	);
	const overallMarginPct = totals.hasCostData && totals.earning > 0 ? (totals.profit / totals.earning) * 100 : null;

	const openDetails = (row: InquiryRow) => {
		setViewInquiry(row);
		setIsDetailOpen(true);
	};

	const columns: DataTableColumn<InquiryRow>[] = [
		{
			key: 'inquiryNo',
			label: 'Inquiry',
			accessor: (row) => `${row.inquiryNo} ${row.title ?? ''}`,
			render: (row) => (
				<button
					type='button'
					className='btn btn-link p-0 fw-semibold text-decoration-none text-start'
					onClick={() => openDetails(row)}>
					<div>{row.inquiryNo}</div>
					<div className='small text-muted fw-normal'>{row.title || '—'}</div>
				</button>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			accessor: (row) => inquiryStatusLabel(row.status),
			render: (row) => (
				<Badge color={inquiryStatusColor(row.status)} isLight>
					{inquiryStatusLabel(row.status)}
				</Badge>
			),
		},
		{
			key: 'createdAt',
			label: 'Date',
			searchable: false,
			sortValue: (row) => (row.createdAt ? new Date(row.createdAt) : null),
			render: (row) => (
				<span className='text-muted small'>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</span>
			),
		},
		{
			key: 'totalOrderedQty',
			label: 'Ordered',
			align: 'center',
			render: (row) => <span className='fw-semibold'>{formatQty(row.totalOrderedQty)}</span>,
		},
		{
			key: 'totalReceivedQty',
			label: 'Received',
			align: 'center',
			render: (row) => formatQty(row.totalReceivedQty),
		},
		{
			key: 'totalInWarehouseQty',
			label: 'In Warehouse',
			align: 'center',
			render: (row) => {
				const hint = qtyWithLocationHint(row.totalInWarehouseQty, row.warehouseBreakdown, 'warehouse');
				return (
					<span className='text-success fw-semibold' title={hint.title}>
						{hint.text}
					</span>
				);
			},
		},
		{
			key: 'totalInShowroomQty',
			label: 'In Showroom',
			align: 'center',
			render: (row) => {
				const hint = qtyWithLocationHint(row.totalInShowroomQty, row.showroomBreakdown, 'showroom');
				return (
					<span className='text-warning fw-semibold' title={hint.title}>
						{hint.text}
					</span>
				);
			},
		},
		{
			key: 'totalSoldQty',
			label: 'Sold',
			align: 'center',
			render: (row) => <span className='fw-semibold text-primary'>{formatQty(row.totalSoldQty)}</span>,
		},
		{
			key: 'landedCost',
			label: 'Landed Cost',
			align: 'right',
			searchable: false,
			sortValue: (row) => row.econ.landedCost ?? -1,
			exportValue: (row) => row.econ.landedCost ?? '',
			render: (row) => <span>{row.econ.landedCost === null ? '—' : formatCurrency(row.econ.landedCost)}</span>,
		},
		{
			// Loyalty points customers redeemed on this inquiry's sold units —
			// money not collected, already taken off Current Earning / Margin.
			key: 'pointsRedeemed',
			label: 'Points Redeemed',
			align: 'right',
			searchable: false,
			sortValue: (row) => row.econ.pointsRedeemedValue,
			exportValue: (row) => row.econ.pointsRedeemedValue,
			render: (row) => (
				<span className={row.econ.pointsRedeemedValue > 0 ? 'text-danger' : 'text-muted'}>
					{formatPointsRedeemed(row.econ.pointsRedeemed, row.econ.pointsRedeemedValue, formatCurrency)}
				</span>
			),
		},
		{
			key: 'earning',
			label: 'Current Earning',
			align: 'right',
			searchable: false,
			sortValue: (row) => row.econ.earning ?? -1,
			exportValue: (row) => row.econ.earning ?? '',
			render: (row) => (
				<span className='text-success fw-semibold'>
					{row.econ.earning === null ? '—' : formatCurrency(row.econ.earning)}
				</span>
			),
		},
		{
			key: 'marginPct',
			label: 'Margin',
			align: 'right',
			searchable: false,
			sortValue: (row) => row.econ.marginPct ?? -1,
			exportValue: (row) => row.econ.marginPct ?? '',
			render: (row) => (
				<span className={`fw-semibold ${marginColorClass(row.econ.marginPct)}`}>
					{formatPercent(row.econ.marginPct)}
				</span>
			),
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
							onClick: () => openDetails(row),
						},
					]}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Purchasing Report' requiredPermission={PERMISSIONS.SHOW_REPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='LocalMall' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Purchasing Report — Purchase Inquiry Wise</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<div className='mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3'>
							<div className='btn-group' role='group' aria-label='Filter by inquiry status'>
								<Button
									size='sm'
									color={statusFilter === 'ALL' ? 'primary' : 'light'}
									isLight={statusFilter !== 'ALL'}
									onClick={() => setStatusFilter('ALL')}>
									All ({rows.length})
								</Button>
								{statuses.map((status) => (
									<Button
										key={status}
										size='sm'
										color={statusFilter === status ? 'primary' : 'light'}
										isLight={statusFilter !== status}
										onClick={() => setStatusFilter(status)}>
										{inquiryStatusLabel(status)}
									</Button>
								))}
							</div>
							<div className='d-flex flex-wrap gap-4 text-end'>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Ordered</div>
									<div className='fs-5 fw-bold'>{formatQty(totals.ordered)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>In Warehouse</div>
									<div className='fs-5 fw-bold text-success'>{formatQty(totals.inWarehouse)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>In Showroom</div>
									<div className='fs-5 fw-bold text-warning'>{formatQty(totals.inShowroom)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Sold</div>
									<div className='fs-5 fw-bold text-primary'>{formatQty(totals.sold)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Landed Cost</div>
									<div className='fs-5 fw-bold'>
										{totals.hasCostData ? formatCurrency(totals.landedCost) : '—'}
									</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Points Redeemed</div>
									<div
										className={`fs-5 fw-bold ${totals.pointsRedeemedValue > 0 ? 'text-danger' : 'text-muted'}`}>
										{formatPointsRedeemed(totals.pointsRedeemed, totals.pointsRedeemedValue, formatCurrency)}
									</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Current Earning</div>
									<div className='fs-5 fw-bold text-success'>
										{totals.hasCostData ? formatCurrency(totals.earning) : '—'}
									</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Margin</div>
									<div className={`fs-5 fw-bold ${marginColorClass(overallMarginPct)}`}>
										{formatPercent(overallMarginPct)}
									</div>
								</div>
							</div>
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={visibleRows}
									rowKey='inquiryId'
									loading={isLoading}
									error={error}
									fileName='purchasing-inquiry-report'
									emptyText='No purchase inquiries yet.'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<PurchasingInquiryDetailModal inquiry={viewInquiry} isOpen={isDetailOpen} setIsOpen={setIsDetailOpen} />
		</PageWrapper>
	);
};

export default PurchasingInquiryReportPage;

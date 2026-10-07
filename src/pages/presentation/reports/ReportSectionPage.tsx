import React, { FC, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import {
	getOperationalReportRows,
	OperationalReportRow,
	OperationalReportType,
} from '../../../api/report.api';
import { PERMISSIONS } from '../../../constants/permissions';

interface IReportSectionPageProps {
	reportType: OperationalReportType;
}

type TColor = 'primary' | 'success' | 'info' | 'warning' | 'danger' | 'secondary';

interface IReportDefinition {
	title: string;
	description: string;
	icon: string;
	color: TColor;
	dateKeys: string[];
	statusKeys: string[];
	amountKeys: string[];
	totalLabel: string;
	isCurrency?: boolean;
	columns: DataTableColumn<OperationalReportRow>[];
}

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

const dateValue = (row: OperationalReportRow, keys: string[]) => {
	const value = firstValue(row, keys);
	if (!value) return null;
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (row: OperationalReportRow, keys: string[]) =>
	dateValue(row, keys)?.toLocaleDateString() || '—';

const formatCurrency = (value: number) =>
	`Rs. ${value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const statusColor = (status: string): TColor => {
	const normalized = status.toUpperCase();
	if (['COMPLETED', 'PAID', 'PASS', 'DELIVERED', 'ACTIVE', 'REALIZED'].includes(normalized)) {
		return 'success';
	}
	if (['PENDING', 'PARTIAL', 'OPEN', 'RECEIVED'].includes(normalized)) return 'warning';
	if (['FAILED', 'REJECT', 'REJECTED', 'CANCELLED', 'BOUNCED', 'INACTIVE'].includes(normalized)) {
		return 'danger';
	}
	return 'info';
};

// Sales report: store credit + account charge + gift card used on an order.
const otherTendersValue = (row: OperationalReportRow) =>
	numberValue(row, ['storeCreditApplied', 'store_credit_applied']) +
	numberValue(row, ['accountCharge', 'account_charge']) +
	numberValue(row, ['giftCardApplied', 'gift_card_applied']);

const otherTendersText = (row: OperationalReportRow) => {
	const parts: string[] = [];
	const storeCredit = numberValue(row, ['storeCreditApplied', 'store_credit_applied']);
	const account = numberValue(row, ['accountCharge', 'account_charge']);
	const giftCard = numberValue(row, ['giftCardApplied', 'gift_card_applied']);
	if (storeCredit > 0) parts.push(`Store credit -${formatCurrency(storeCredit)}`);
	if (account > 0) parts.push(`Account -${formatCurrency(account)}`);
	if (giftCard > 0) parts.push(`Gift card -${formatCurrency(giftCard)}`);
	return parts.join(' · ');
};

// Sales report: what was collected at the till — net amount less points,
// store credit, account charge and gift card.
const paidAmountValue = (row: OperationalReportRow) =>
	Math.max(
		0,
		numberValue(row, ['netAmount', 'net_amount', 'totalAmount']) -
			numberValue(row, ['redeemedValue', 'redeemed_value']) -
			otherTendersValue(row),
	);

const statusColumn = (keys: string[], label = 'Status'): DataTableColumn<OperationalReportRow> => ({
	key: keys[0],
	label,
	align: 'center',
	accessor: (row) => textValue(row, keys),
	exportValue: (row) => textValue(row, keys),
	render: (row) => {
		const status = textValue(row, keys);
		return (
			<Badge color={statusColor(status)} isLight>
				{status}
			</Badge>
		);
	},
});

const REPORTS: Record<OperationalReportType, IReportDefinition> = {
	sales: {
		title: 'Sales Report',
		description: 'Ready-made and sew-and-sell orders, payment state and order value.',
		icon: 'TrendingUp',
		color: 'primary',
		dateKeys: ['createdAt', 'created_at', 'orderDate'],
		statusKeys: ['status'],
		amountKeys: ['netAmount', 'net_amount', 'totalAmount', 'total'],
		totalLabel: 'Net Sales',
		isCurrency: true,
		columns: [
			{
				key: 'orderNo',
				label: 'Order No',
				accessor: (row) => textValue(row, ['orderNo', 'order_no']),
				exportValue: (row) => textValue(row, ['orderNo', 'order_no']),
				render: (row) => (
					<span className='fw-bold text-primary'>
						{textValue(row, ['orderNo', 'order_no'])}
					</span>
				),
			},
			{
				key: 'customerName',
				label: 'Customer',
				accessor: (row) => textValue(row, ['customerName', 'customer.name', 'customerId']),
				exportValue: (row) =>
					textValue(row, ['customerName', 'customer.name', 'customerId']),
			},
			{
				key: 'orderType',
				label: 'Order Type',
				accessor: (row) => textValue(row, ['orderType', 'order_type']),
				exportValue: (row) => textValue(row, ['orderType', 'order_type']),
			},
			statusColumn(['status']),
			statusColumn(['paymentStatus', 'payment_status'], 'Payment'),
			{
				key: 'netAmount',
				label: 'Net Amount',
				align: 'right',
				accessor: (row) => numberValue(row, ['netAmount', 'net_amount', 'totalAmount']),
				exportValue: (row) => numberValue(row, ['netAmount', 'net_amount', 'totalAmount']),
				render: (row) => (
					<span className='fw-bold'>
						{formatCurrency(
							numberValue(row, ['netAmount', 'net_amount', 'totalAmount']),
						)}
					</span>
				),
			},
			{
				// "should show everywhere that sales order displays ... reports"
				// — same denormalized field as the Sales Orders views (V89).
				// This report hits GET /sales-orders directly (SalesOrderResponse),
				// so the field is already on every row once the backend ships it.
				key: 'pointsRedeemed',
				label: 'Points Redeemed',
				align: 'right',
				accessor: (row) => numberValue(row, ['pointsRedeemed', 'points_redeemed']),
				exportValue: (row) => numberValue(row, ['pointsRedeemed', 'points_redeemed']),
				render: (row) => {
					const pts = numberValue(row, ['pointsRedeemed', 'points_redeemed']);
					return pts > 0 ? (
						<span className='text-danger'>
							-{pts} pts (-
							{formatCurrency(numberValue(row, ['redeemedValue', 'redeemed_value']))})
						</span>
					) : (
						<span className='text-muted'>—</span>
					);
				},
			},
			{
				// Store credit / charged to account / gift card used on the sale
				// (V90) — the non-cash tenders other than points.
				key: 'otherTenders',
				label: 'Credit / Gift Card',
				align: 'right',
				accessor: (row) => otherTendersText(row) || '—',
				exportValue: (row) => otherTendersValue(row),
				render: (row) =>
					otherTendersValue(row) > 0 ? (
						<span className='text-danger small'>{otherTendersText(row)}</span>
					) : (
						<span className='text-muted'>—</span>
					),
			},
			{
				// Net Amount less every non-cash tender — what was actually
				// collected at the till.
				key: 'paidAmount',
				label: 'Paid Amount',
				align: 'right',
				accessor: (row) => paidAmountValue(row),
				exportValue: (row) => paidAmountValue(row),
				render: (row) => (
					<span className='fw-bold text-success'>{formatCurrency(paidAmountValue(row))}</span>
				),
			},
			{
				key: 'createdAt',
				label: 'Date',
				accessor: (row) => formatDate(row, ['createdAt', 'created_at', 'orderDate']),
				exportValue: (row) => formatDate(row, ['createdAt', 'created_at', 'orderDate']),
			},
		],
	},
	payments: {
		title: 'Payments & Cheques Report',
		description: 'Cash, cheque and invoice collections with cheque tracking details.',
		icon: 'Payments',
		color: 'success',
		dateKeys: ['receivedAt', 'received_at', 'createdAt', 'created_at'],
		statusKeys: ['status', 'paymentStatus'],
		amountKeys: ['amount', 'netTotal', 'net_total'],
		totalLabel: 'Collected Value',
		isCurrency: true,
		columns: [
			{
				key: 'paymentNo',
				label: 'Payment / Invoice',
				accessor: (row) =>
					textValue(row, ['paymentNo', 'payment_no', 'invoiceNo', 'invoice_number']),
				exportValue: (row) =>
					textValue(row, ['paymentNo', 'payment_no', 'invoiceNo', 'invoice_number']),
			},
			{
				key: 'method',
				label: 'Method',
				accessor: (row) => textValue(row, ['method', 'paymentMethod'], 'INVOICE'),
				exportValue: (row) => textValue(row, ['method', 'paymentMethod'], 'INVOICE'),
			},
			{
				key: 'chequeNo',
				label: 'Cheque No',
				accessor: (row) => textValue(row, ['chequeNo', 'cheque_no']),
				exportValue: (row) => textValue(row, ['chequeNo', 'cheque_no']),
			},
			{
				key: 'bank',
				label: 'Bank / Payer',
				accessor: (row) => textValue(row, ['bank', 'payerName', 'cashierName']),
				exportValue: (row) => textValue(row, ['bank', 'payerName', 'cashierName']),
			},
			{
				key: 'amount',
				label: 'Amount',
				align: 'right',
				accessor: (row) => numberValue(row, ['amount', 'netTotal', 'net_total']),
				exportValue: (row) => numberValue(row, ['amount', 'netTotal', 'net_total']),
				render: (row) => (
					<span className='fw-bold text-success'>
						{formatCurrency(numberValue(row, ['amount', 'netTotal', 'net_total']))}
					</span>
				),
			},
			statusColumn(['status', 'paymentStatus']),
			{
				key: 'receivedAt',
				label: 'Received Date',
				accessor: (row) =>
					formatDate(row, ['receivedAt', 'received_at', 'createdAt', 'created_at']),
				exportValue: (row) =>
					formatDate(row, ['receivedAt', 'received_at', 'createdAt', 'created_at']),
			},
		],
	},
	inventory: {
		title: 'Inventory Report',
		description: 'Available, reserved and low-stock quantities across inventory locations.',
		icon: 'Inventory2',
		color: 'info',
		dateKeys: ['updatedAt', 'updated_at', 'createdAt'],
		statusKeys: ['status'],
		amountKeys: ['quantity_available', 'quantityAvailable'],
		totalLabel: 'Available Quantity',
		columns: [
			{
				key: 'item',
				label: 'Item',
				accessor: (row) => textValue(row, ['item.name', 'itemName', 'name']),
				exportValue: (row) => textValue(row, ['item.name', 'itemName', 'name']),
				render: (row) => (
					<span className='fw-bold'>
						{textValue(row, ['item.name', 'itemName', 'name'])}
					</span>
				),
			},
			{
				key: 'sku',
				label: 'SKU',
				accessor: (row) => textValue(row, ['item.sku', 'sku']),
				exportValue: (row) => textValue(row, ['item.sku', 'sku']),
			},
			{
				key: 'location_type',
				label: 'Location',
				accessor: (row) =>
					textValue(row, ['location_type', 'locationType', 'warehouseName']),
				exportValue: (row) =>
					textValue(row, ['location_type', 'locationType', 'warehouseName']),
			},
			{
				key: 'quantity_available',
				label: 'Available',
				align: 'right',
				accessor: (row) => numberValue(row, ['quantity_available', 'quantityAvailable']),
				exportValue: (row) => numberValue(row, ['quantity_available', 'quantityAvailable']),
			},
			{
				key: 'quantity_reserved',
				label: 'Reserved',
				align: 'right',
				accessor: (row) => numberValue(row, ['quantity_reserved', 'quantityReserved']),
				exportValue: (row) => numberValue(row, ['quantity_reserved', 'quantityReserved']),
			},
			{
				key: 'reorder_level',
				label: 'Reorder Level',
				align: 'right',
				accessor: (row) => numberValue(row, ['reorder_level', 'reorderLevel']),
				exportValue: (row) => numberValue(row, ['reorder_level', 'reorderLevel']),
			},
			{
				key: 'is_low_stock',
				label: 'Stock Health',
				align: 'center',
				accessor: (row) => (firstValue(row, ['is_low_stock', 'isLowStock']) ? 'LOW' : 'OK'),
				exportValue: (row) =>
					firstValue(row, ['is_low_stock', 'isLowStock']) ? 'LOW' : 'OK',
				render: (row) => {
					const isLow = Boolean(firstValue(row, ['is_low_stock', 'isLowStock']));
					return (
						<Badge color={isLow ? 'danger' : 'success'}>{isLow ? 'LOW' : 'OK'}</Badge>
					);
				},
			},
		],
	},
	purchasing: {
		title: 'Purchasing Report',
		description:
			'Purchase commitments, supplier references, receipt progress and expected dates.',
		icon: 'LocalMall',
		color: 'warning',
		dateKeys: ['expectedDate', 'expected_date', 'createdAt'],
		statusKeys: ['status'],
		amountKeys: ['totalAmount', 'total_amount'],
		totalLabel: 'Purchase Value',
		isCurrency: true,
		columns: [
			{
				key: 'poNo',
				label: 'PO No',
				accessor: (row) => textValue(row, ['poNo', 'po_no']),
				exportValue: (row) => textValue(row, ['poNo', 'po_no']),
				render: (row) => (
					<span className='fw-bold text-primary'>
						{textValue(row, ['poNo', 'po_no'])}
					</span>
				),
			},
			{
				key: 'supplierId',
				label: 'Supplier',
				accessor: (row) => textValue(row, ['supplierName', 'supplier.name', 'supplierId']),
				exportValue: (row) =>
					textValue(row, ['supplierName', 'supplier.name', 'supplierId']),
			},
			{
				key: 'expectedDate',
				label: 'Expected Date',
				accessor: (row) => formatDate(row, ['expectedDate', 'expected_date']),
				exportValue: (row) => formatDate(row, ['expectedDate', 'expected_date']),
			},
			{
				key: 'totalAmount',
				label: 'Total',
				align: 'right',
				accessor: (row) => numberValue(row, ['totalAmount', 'total_amount']),
				exportValue: (row) => numberValue(row, ['totalAmount', 'total_amount']),
				render: (row) => formatCurrency(numberValue(row, ['totalAmount', 'total_amount'])),
			},
			statusColumn(['status']),
		],
	},
	production: {
		title: 'Production Report',
		description:
			'Work orders, assigned teams, planned quantities, due dates and current stages.',
		icon: 'Factory',
		color: 'primary',
		dateKeys: ['dueDate', 'due_date', 'createdAt'],
		statusKeys: ['status'],
		amountKeys: ['plannedQty', 'planned_qty'],
		totalLabel: 'Planned Quantity',
		columns: [
			{
				key: 'woNo',
				label: 'Work Order',
				accessor: (row) => textValue(row, ['woNo', 'wo_no']),
				exportValue: (row) => textValue(row, ['woNo', 'wo_no']),
				render: (row) => (
					<span className='fw-bold text-primary'>
						{textValue(row, ['woNo', 'wo_no'])}
					</span>
				),
			},
			{
				key: 'salesOrderId',
				label: 'Sales Order',
				accessor: (row) => textValue(row, ['salesOrderNo', 'salesOrderId']),
				exportValue: (row) => textValue(row, ['salesOrderNo', 'salesOrderId']),
			},
			{
				key: 'garmentType',
				label: 'Garment',
				accessor: (row) => textValue(row, ['garmentType', 'garment_type']),
				exportValue: (row) => textValue(row, ['garmentType', 'garment_type']),
			},
			{
				key: 'assignedTeam',
				label: 'Team',
				accessor: (row) => textValue(row, ['assignedTeam', 'assigned_team']),
				exportValue: (row) => textValue(row, ['assignedTeam', 'assigned_team']),
			},
			{
				key: 'plannedQty',
				label: 'Planned Qty',
				align: 'right',
				accessor: (row) => numberValue(row, ['plannedQty', 'planned_qty']),
				exportValue: (row) => numberValue(row, ['plannedQty', 'planned_qty']),
			},
			statusColumn(['status'], 'Current Stage'),
			{
				key: 'dueDate',
				label: 'Due Date',
				accessor: (row) => formatDate(row, ['dueDate', 'due_date']),
				exportValue: (row) => formatDate(row, ['dueDate', 'due_date']),
			},
		],
	},
	quality: {
		title: 'Quality Control Report',
		description: 'Inspection decisions, defects, passed quantities, rejects and rework.',
		icon: 'Verified',
		color: 'success',
		dateKeys: ['checkedAt', 'checkedDate', 'checked_date', 'createdAt'],
		statusKeys: ['decision'],
		amountKeys: ['passedQty', 'passed_qty'],
		totalLabel: 'Passed Quantity',
		columns: [
			{
				key: 'workOrderId',
				label: 'Work Order',
				accessor: (row) => textValue(row, ['workOrderNo', 'workOrderId']),
				exportValue: (row) => textValue(row, ['workOrderNo', 'workOrderId']),
			},
			{
				key: 'stage',
				label: 'Stage',
				accessor: (row) => textValue(row, ['stage']),
				exportValue: (row) => textValue(row, ['stage']),
			},
			{
				key: 'defectType',
				label: 'Defect',
				accessor: (row) => textValue(row, ['defectType', 'defect_type']),
				exportValue: (row) => textValue(row, ['defectType', 'defect_type']),
			},
			{
				key: 'passedQty',
				label: 'Passed',
				align: 'right',
				accessor: (row) => numberValue(row, ['passedQty', 'passed_qty']),
				exportValue: (row) => numberValue(row, ['passedQty', 'passed_qty']),
			},
			{
				key: 'rejectedQty',
				label: 'Rejected',
				align: 'right',
				accessor: (row) => numberValue(row, ['rejectedQty', 'rejected_qty']),
				exportValue: (row) => numberValue(row, ['rejectedQty', 'rejected_qty']),
			},
			statusColumn(['decision'], 'Decision'),
			{
				key: 'checkedDate',
				label: 'Checked Date',
				accessor: (row) =>
					formatDate(row, ['checkedAt', 'checkedDate', 'checked_date', 'createdAt']),
				exportValue: (row) =>
					formatDate(row, ['checkedAt', 'checkedDate', 'checked_date', 'createdAt']),
			},
		],
	},
	deliveries: {
		title: 'Delivery Report',
		description:
			'Dispatch progress, order/invoice references and courier tracking information.',
		icon: 'LocalShipping',
		color: 'info',
		dateKeys: ['dispatchDate', 'dispatch_date', 'createdAt'],
		statusKeys: ['status'],
		amountKeys: ['id'],
		totalLabel: 'Delivery Records',
		columns: [
			{
				key: 'deliveryNo',
				label: 'Delivery No',
				accessor: (row) => textValue(row, ['deliveryNo', 'delivery_no']),
				exportValue: (row) => textValue(row, ['deliveryNo', 'delivery_no']),
				render: (row) => (
					<span className='fw-bold text-primary'>
						{textValue(row, ['deliveryNo', 'delivery_no'])}
					</span>
				),
			},
			{
				key: 'salesOrderId',
				label: 'Sales Order',
				accessor: (row) => textValue(row, ['salesOrderNo', 'salesOrderId']),
				exportValue: (row) => textValue(row, ['salesOrderNo', 'salesOrderId']),
			},
			{
				key: 'invoiceId',
				label: 'Invoice',
				accessor: (row) => textValue(row, ['invoiceNo', 'invoiceId']),
				exportValue: (row) => textValue(row, ['invoiceNo', 'invoiceId']),
			},
			{
				key: 'courierReference',
				label: 'Courier Reference',
				accessor: (row) => textValue(row, ['courierReference', 'courier_reference']),
				exportValue: (row) => textValue(row, ['courierReference', 'courier_reference']),
			},
			statusColumn(['status']),
			{
				key: 'dispatchDate',
				label: 'Dispatch Date',
				accessor: (row) => formatDate(row, ['dispatchDate', 'dispatch_date', 'createdAt']),
				exportValue: (row) =>
					formatDate(row, ['dispatchDate', 'dispatch_date', 'createdAt']),
			},
		],
	},
	customers: {
		title: 'Customers & Measurements Report',
		description: 'Customer measurement profiles by product, template, version and status.',
		icon: 'People',
		color: 'primary',
		dateKeys: ['takenAt', 'taken_at', 'createdAt'],
		statusKeys: ['status'],
		amountKeys: ['version'],
		totalLabel: 'Profile Versions',
		columns: [
			{
				key: 'customerName',
				label: 'Customer',
				accessor: (row) => {
					const directName = firstValue(row, ['customerName', 'customer.name']);
					if (directName) return String(directName);
					return (
						`${textValue(row, ['firstName'], '')} ${textValue(row, ['lastName'], '')}`.trim() ||
						'—'
					);
				},
				exportValue: (row) => {
					const directName = firstValue(row, ['customerName', 'customer.name']);
					if (directName) return String(directName);
					return (
						`${textValue(row, ['firstName'], '')} ${textValue(row, ['lastName'], '')}`.trim() ||
						'—'
					);
				},
			},
			{
				key: 'productName',
				label: 'Product / Style',
				accessor: (row) => textValue(row, ['productName', 'product.name']),
				exportValue: (row) => textValue(row, ['productName', 'product.name']),
			},
			{
				key: 'measurementTypeName',
				label: 'Measurement Template',
				accessor: (row) => textValue(row, ['measurementTypeName', 'measurementType.name']),
				exportValue: (row) =>
					textValue(row, ['measurementTypeName', 'measurementType.name']),
			},
			{
				key: 'version',
				label: 'Version',
				align: 'center',
				accessor: (row) => textValue(row, ['version']),
				exportValue: (row) => textValue(row, ['version']),
			},
			statusColumn(['status']),
			{
				key: 'createdAt',
				label: 'Captured Date',
				accessor: (row) => formatDate(row, ['takenAt', 'taken_at', 'createdAt']),
				exportValue: (row) => formatDate(row, ['takenAt', 'taken_at', 'createdAt']),
			},
		],
	},
};

const ReportSectionPage: FC<IReportSectionPageProps> = ({ reportType }) => {
	const definition = REPORTS[reportType];
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [status, setStatus] = useState('');

	const {
		data: rows = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ['operational-report', reportType, dateFrom, dateTo],
		queryFn: () =>
			getOperationalReportRows(reportType, {
				date_from: dateFrom || undefined,
				date_to: dateTo || undefined,
			}),
	});

	const statusOptions = useMemo(
		() =>
			Array.from(
				new Set(
					rows.map((row) => textValue(row, definition.statusKeys, '')).filter(Boolean),
				),
			).sort(),
		[definition.statusKeys, rows],
	);

	const filteredRows = useMemo(
		() =>
			rows.filter((row) => {
				const rowStatus = textValue(row, definition.statusKeys, '');
				if (status && rowStatus !== status) return false;

				const rowDate = dateValue(row, definition.dateKeys);
				if (!rowDate) return true;
				if (dateFrom && rowDate < new Date(`${dateFrom}T00:00:00`)) return false;
				if (dateTo && rowDate > new Date(`${dateTo}T23:59:59`)) return false;
				return true;
			}),
		[dateFrom, dateTo, definition.dateKeys, definition.statusKeys, rows, status],
	);

	const totalValue = filteredRows.reduce(
		(total, row) => total + numberValue(row, definition.amountKeys),
		0,
	);
	const completedCount = filteredRows.filter((row) =>
		['COMPLETED', 'PAID', 'PASS', 'DELIVERED', 'ACTIVE', 'REALIZED'].includes(
			textValue(row, definition.statusKeys, '').toUpperCase(),
		),
	).length;
	const pendingCount = filteredRows.filter((row) =>
		['PENDING', 'PARTIAL', 'OPEN', 'RECEIVED', 'IN_PROGRESS'].includes(
			textValue(row, definition.statusKeys, '').toUpperCase(),
		),
	).length;

	const summaryCards = [
		{ label: 'Total Records', value: filteredRows.length, icon: 'TableRows', color: 'primary' },
		{
			label: 'Completed / Active',
			value: completedCount,
			icon: 'CheckCircle',
			color: 'success',
		},
		{ label: 'Pending / Open', value: pendingCount, icon: 'Schedule', color: 'warning' },
		{
			label: definition.totalLabel,
			value: definition.isCurrency ? formatCurrency(totalValue) : totalValue.toLocaleString(),
			icon: definition.isCurrency ? 'Paid' : 'Numbers',
			color: 'info',
		},
	];

	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
		setStatus('');
	};

	return (
		<PageWrapper title={definition.title} requiredPermission={PERMISSIONS.SHOW_REPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon={definition.icon as any} size='2x' color={definition.color} />
					<div className='ms-2'>
						<div className='fs-5 fw-bold'>{definition.title}</div>
						<div className='small text-muted'>{definition.description}</div>
					</div>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row g-3 mb-4'>
					{summaryCards.map((summary) => (
						<div className='col-sm-6 col-xl-3' key={summary.label}>
							<Card className='h-100'>
								<CardBody className='d-flex align-items-center gap-3'>
									<div
										className={`rounded-circle bg-${summary.color} bg-opacity-10 p-3`}>
										<Icon
											icon={summary.icon as any}
											color={summary.color as any}
											size='2x'
										/>
									</div>
									<div>
										<div className='text-muted small'>{summary.label}</div>
										<div className='fs-4 fw-bold'>{summary.value}</div>
									</div>
								</CardBody>
							</Card>
						</div>
					))}
				</div>

				<Card>
					<CardBody>
						<div className='row g-3 align-items-end mb-4'>
							<div className='col-sm-6 col-lg-3'>
								<label
									className='form-label fw-semibold'
									htmlFor={`${reportType}-from`}>
									From Date
								</label>
								<input
									id={`${reportType}-from`}
									type='date'
									className='form-control'
									value={dateFrom}
									onChange={(event) => setDateFrom(event.target.value)}
								/>
							</div>
							<div className='col-sm-6 col-lg-3'>
								<label
									className='form-label fw-semibold'
									htmlFor={`${reportType}-to`}>
									To Date
								</label>
								<input
									id={`${reportType}-to`}
									type='date'
									className='form-control'
									value={dateTo}
									onChange={(event) => setDateTo(event.target.value)}
								/>
							</div>
							<div className='col-sm-6 col-lg-3'>
								<label
									className='form-label fw-semibold'
									htmlFor={`${reportType}-status`}>
									Status
								</label>
								<select
									id={`${reportType}-status`}
									className='form-select'
									value={status}
									onChange={(event) => setStatus(event.target.value)}>
									<option value=''>All statuses</option>
									{statusOptions.map((option) => (
										<option value={option} key={option}>
											{option}
										</option>
									))}
								</select>
							</div>
							<div className='col-sm-6 col-lg-3 d-flex gap-2'>
								<Button color='light' icon='FilterAltOff' onClick={clearFilters}>
									Clear
								</Button>
								<Button
									color='primary'
									isLight
									icon='Refresh'
									onClick={() => refetch()}>
									Refresh
								</Button>
							</div>
						</div>

						<DataTable
							columns={definition.columns}
							data={filteredRows}
							rowKey={(row, index) => String(firstValue(row, ['id']) ?? index)}
							loading={isLoading}
							error={error}
							emptyText='No report records match the selected filters.'
							fileName={`${reportType}-report`}
							showActions={false}
						/>
					</CardBody>
				</Card>
			</Page>
		</PageWrapper>
	);
};

export default ReportSectionPage;

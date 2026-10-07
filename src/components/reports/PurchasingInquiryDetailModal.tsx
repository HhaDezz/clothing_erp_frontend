import React from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../bootstrap/Modal';
import Button from '../bootstrap/Button';
import Icon from '../icon/Icon';
import Badge from '../bootstrap/Badge';
import { formatCurrency } from '../../helpers/currency';
import {
	breakdownEntries,
	computeInquiryEconomics,
	computeLineEconomics,
	formatPercent,
	formatPointsRedeemed,
	formatQty,
	marginColorClass,
	PurchasingInquiryReport,
	PurchasingReportLine,
} from '../../api/purchasingReport.api';

// One small badge per location a quantity is split across — used for both
// the "In Warehouse" and "In Showroom" cells so an item sitting in several
// places at once reads as clearly several places, not a single number.
const LocationBadges = ({ breakdown, color }: { breakdown: Record<string, number>; color: string }) => {
	const entries = breakdownEntries(breakdown);
	if (entries.length === 0) return null;
	return (
		<div className='d-flex flex-wrap justify-content-center gap-1 mt-1'>
			{entries.map(([name, qty]) => (
				<Badge key={name} color={color} isLight className='fw-normal'>
					{name}: {formatQty(qty)}
				</Badge>
			))}
		</div>
	);
};

// Shared by the Purchasing Report list page ("View Details") — kept here,
// same convention as SalesOrderViewModal, so the labels/colors for an
// inquiry's status only need to be right in one place.
export const INQUIRY_STATUS_LABEL: Record<string, string> = {
	DRAFT_INQUIRY: 'Draft',
	PENDING_GF_CONFIRM: 'Pending GF Confirm',
	GF_CONFIRMED: 'GF Confirmed',
	SL_RECONFIRMED: 'SL Reconfirmed',
	PO_APPROVED: 'PO Approved',
	AWAITING_PI: 'Awaiting PI',
	PI_UPLOADED: 'PI Uploaded',
	PAYMENT_PROCESSED: 'Payment Processed',
	PO_FINALIZED: 'PO Finalized',
	GOODS_REQUESTED: 'Goods Requested',
};

export const inquiryStatusLabel = (status: string): string => INQUIRY_STATUS_LABEL[status] ?? status;

export const inquiryStatusColor = (status: string): any => {
	const map: Record<string, any> = {
		DRAFT_INQUIRY: 'secondary',
		PENDING_GF_CONFIRM: 'warning',
		GF_CONFIRMED: 'info',
		SL_RECONFIRMED: 'info',
		PO_APPROVED: 'info',
		AWAITING_PI: 'warning',
		PI_UPLOADED: 'warning',
		PAYMENT_PROCESSED: 'warning',
		PO_FINALIZED: 'primary',
		GOODS_REQUESTED: 'success',
	};
	return map[status] ?? 'secondary';
};

const variantLabel = (line: PurchasingReportLine) => [line.size, line.color].filter(Boolean).join(' / ');

const PurchasingInquiryDetailModal = ({
	inquiry,
	isOpen,
	setIsOpen,
}: {
	inquiry: PurchasingInquiryReport | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}) => {
	if (!inquiry) return null;

	const econ = computeInquiryEconomics(inquiry);

	const tiles: { label: string; value: string; className?: string }[] = [
		{ label: 'Ordered', value: formatQty(inquiry.totalOrderedQty) },
		{ label: 'Received', value: formatQty(inquiry.totalReceivedQty) },
		{ label: 'In Warehouse', value: formatQty(inquiry.totalInWarehouseQty), className: 'text-success' },
		{ label: 'In Showroom', value: formatQty(inquiry.totalInShowroomQty), className: 'text-warning' },
		{ label: 'Sold', value: formatQty(inquiry.totalSoldQty), className: 'text-primary' },
		{ label: 'Landed Cost', value: econ.landedCost === null ? '—' : formatCurrency(econ.landedCost) },
		{
			label: 'Points Redeemed',
			value: formatPointsRedeemed(econ.pointsRedeemed, econ.pointsRedeemedValue, formatCurrency),
			className: econ.pointsRedeemedValue > 0 ? 'text-danger' : 'text-muted',
		},
		{
			label: 'Current Earning',
			value: econ.earning === null ? '—' : formatCurrency(econ.earning),
			className: 'text-success',
		},
		{ label: 'Profit Margin', value: formatPercent(econ.marginPct), className: marginColorClass(econ.marginPct) },
	];

	const itemCount = inquiry.lines.reduce((sum, line) => sum + (line.orderedQty || 0), 0);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='purchasing-inquiry-detail-title'>
					<Icon icon='LocalMall' className='me-2 text-primary' />
					Inquiry — {inquiry.inquiryNo}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{!econ.hasCostData && (
					<div className='alert alert-warning py-2 px-3 small mb-3'>
						<Icon icon='ReportProblem' size='sm' className='me-2' />
						No costing/earning data yet for this inquiry — its stock arrived before batch-level cost
						tracking shipped, so it can&apos;t be traced to a landed cost. This is expected, not an
						error; new shipments track correctly going forward.
					</div>
				)}

				{/* Top stat strip */}
				<div className='row g-3 mb-4'>
					{tiles.map((tile) => (
						<div className='col-6 col-md-3' key={tile.label}>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>{tile.label}</div>
								<div className={`fs-5 fw-bold ${tile.className ?? ''}`}>{tile.value}</div>
							</div>
						</div>
					))}
				</div>

				{/* Inquiry details */}
				<h6 className='fw-bold text-muted small text-uppercase mb-3'>Inquiry Details</h6>
				<div className='row g-3 mb-4'>
					<div className='col-md-6'>
						<label className='text-muted small fw-semibold text-uppercase'>Title</label>
						<p className='fw-bold mb-0'>{inquiry.title || '—'}</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Status</label>
						<p className='mb-0'>
							<Badge color={inquiryStatusColor(inquiry.status)} isLight>
								{inquiryStatusLabel(inquiry.status)}
							</Badge>
						</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Created</label>
						<p className='mb-0 text-muted'>
							{inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString() : '—'}
						</p>
					</div>
				</div>

				{inquiry.lines.length > 0 && (
					<>
						<hr />
						<div className='d-flex justify-content-between align-items-center mb-3'>
							<h6 className='fw-bold mb-0'>Items</h6>
							<span className='text-muted small'>
								{inquiry.lines.length} line{inquiry.lines.length === 1 ? '' : 's'} ·{' '}
								{formatQty(itemCount)} unit{itemCount === 1 ? '' : 's'} ordered
							</span>
						</div>
						<div className='table-responsive'>
							<table className='table table-sm table-hover mb-0 align-middle'>
								<thead className='table-light'>
									<tr>
										<th>Item</th>
										<th className='text-center'>Ordered</th>
										<th className='text-end'>Unit Price</th>
										<th className='text-center'>Received</th>
										<th className='text-center'>In Warehouse</th>
										<th className='text-center'>Barcoded</th>
										<th className='text-center'>Awaiting Issue</th>
										<th className='text-center'>In Showroom</th>
										<th className='text-center'>Sold</th>
										<th className='text-end'>Unit Cost (inc. VAT)</th>
										<th className='text-end'>Selling Price</th>
										<th className='text-end'>Points Redeemed</th>
										<th className='text-end'>Earning</th>
										<th className='text-end'>Margin</th>
									</tr>
								</thead>
								<tbody>
									{inquiry.lines.map((line) => {
										const lineEcon = computeLineEconomics(line);
										return (
											<tr key={line.itemId}>
												<td>
													<div className='fw-semibold'>
														{line.productName || line.sku || '—'}
													</div>
													<div className='small text-muted'>
														{[line.sku, variantLabel(line)].filter(Boolean).join(' · ')}
													</div>
												</td>
												<td className='text-center fw-semibold'>{formatQty(line.orderedQty)}</td>
												<td className='text-end'>{formatCurrency(line.unitPrice || 0)}</td>
												<td className='text-center'>{formatQty(line.receivedQty)}</td>
												<td className='text-center' style={{ minWidth: 150 }}>
													<div className='fw-semibold'>{formatQty(line.inWarehouseQty)}</div>
													<LocationBadges breakdown={line.warehouseBreakdown} color='success' />
												</td>
												<td className='text-center'>{formatQty(line.barcodedQty)}</td>
												<td className='text-center'>{formatQty(line.awaitingIssueQty)}</td>
												<td className='text-center' style={{ minWidth: 150 }}>
													<div className='fw-semibold'>{formatQty(line.inShowroomQty)}</div>
													<LocationBadges breakdown={line.showroomBreakdown} color='warning' />
												</td>
												<td className='text-center fw-semibold text-primary'>
													{formatQty(line.soldQty)}
												</td>
												<td className='text-end'>
													{line.unitCostIncVat === null || line.unitCostIncVat === undefined
														? '—'
														: formatCurrency(line.unitCostIncVat)}
												</td>
												<td className='text-end'>
													{line.sellingPrice === null || line.sellingPrice === undefined
														? '—'
														: formatCurrency(line.sellingPrice)}
												</td>
												<td
													className={`text-end ${
														lineEcon.pointsRedeemedValue > 0 ? 'text-danger' : 'text-muted'
													}`}>
													{formatPointsRedeemed(
														lineEcon.pointsRedeemed,
														lineEcon.pointsRedeemedValue,
														formatCurrency,
													)}
												</td>
												<td className='text-end fw-semibold text-success'>
													{lineEcon.earning === null ? '—' : formatCurrency(lineEcon.earning)}
												</td>
												<td className={`text-end fw-semibold ${marginColorClass(lineEcon.marginPct)}`}>
													{formatPercent(lineEcon.marginPct)}
												</td>
											</tr>
										);
									})}
								</tbody>
								<tfoot>
									<tr className='table-light'>
										<td className='fw-bold'>Totals</td>
										<td className='text-center fw-bold'>{formatQty(inquiry.totalOrderedQty)}</td>
										<td />
										<td className='text-center fw-bold'>{formatQty(inquiry.totalReceivedQty)}</td>
										<td className='text-center fw-bold'>{formatQty(inquiry.totalInWarehouseQty)}</td>
										<td className='text-center fw-bold'>{formatQty(inquiry.totalBarcodedQty)}</td>
										<td className='text-center fw-bold'>{formatQty(inquiry.totalAwaitingIssueQty)}</td>
										<td className='text-center fw-bold'>{formatQty(inquiry.totalInShowroomQty)}</td>
										<td className='text-center fw-bold text-primary'>{formatQty(inquiry.totalSoldQty)}</td>
										<td />
										<td />
										<td
											className={`text-end fw-bold ${
												econ.pointsRedeemedValue > 0 ? 'text-danger' : 'text-muted'
											}`}>
											{formatPointsRedeemed(econ.pointsRedeemed, econ.pointsRedeemedValue, formatCurrency)}
										</td>
										<td className='text-end fw-bold text-success'>
											{econ.earning === null ? '—' : formatCurrency(econ.earning)}
										</td>
										<td className={`text-end fw-bold ${marginColorClass(econ.marginPct)}`}>
											{formatPercent(econ.marginPct)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default PurchasingInquiryDetailModal;

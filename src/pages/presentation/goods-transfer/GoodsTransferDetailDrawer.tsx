import React from 'react';
import OffCanvas, {
	OffCanvasBody,
	OffCanvasHeader,
	OffCanvasTitle,
} from '../../../components/bootstrap/OffCanvas';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import { GoodsTransferRequest, GoodsTransferItem } from '../../../api/goodsTransfer.api';
import { STATUS_META } from './goodsTransferStatus';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	request: GoodsTransferRequest | null;
}

// Main workflow milestones for the visual timeline. REJECTED forks off
// REQUESTED and is rendered separately below rather than as a timeline step.
// PARTIALLY_BARCODED sits at the same position as BARCODED, and
// PARTIALLY_ISSUED at the same position as ISSUED — each shown with its own
// (amber) marker rather than the solid "done" green, since not every
// warehouse allocation has finished that step yet (barcode generation and
// issuing are both scoped per-warehouse — see GoodsTransferService).
const STATUS_STEPS = ['REQUESTED', 'APPROVED', 'BARCODED', 'ISSUED', 'RECEIVED'] as const;

const fmt = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

const qty = (value: number | null) => (value === null || value === undefined ? '—' : value);

// One warehouse's own allocation slice, showing both its barcode-tag
// progress and its issue progress — "only 50 barcodes can be created by
// warehouse 1 assigned user" when a 100-unit line is split 50/50, so each
// warehouse's own tag count and issued/allocated quantity are shown
// separately rather than rolled up at the item level.
const AllocationRow: React.FC<{ item: GoodsTransferItem }> = ({ item }) => {
	if (item.allocations.length === 0) return null;
	return (
		<tr>
			<td colSpan={5} className='pt-0 pb-2'>
				<div className='d-flex flex-wrap gap-2 ms-2'>
					{item.allocations.map((a) => {
						const fullyIssued = a.issuedQty >= a.allocatedQty;
						const isBarcoded = a.barcodeUnits.length > 0;
						return (
							<div
								key={a.id}
								className={`d-flex align-items-center gap-2 px-2 py-1 border rounded small ${
									fullyIssued ? 'border-success' : 'border-warning'
								}`}>
								<Icon icon='Store' size='sm' color={fullyIssued ? 'success' : 'warning'} />
								<span>{a.warehouseName}</span>
								<span className='fw-bold'>
									{a.issuedQty}/{a.allocatedQty}
								</span>
								{fullyIssued ? (
									<span className='text-success'>issued</span>
								) : (
									<span className='text-warning'>pending</span>
								)}
								<span className={isBarcoded ? 'text-muted' : 'text-danger'}>
									· {isBarcoded ? `${a.barcodeUnits.length} tag${a.barcodeUnits.length === 1 ? '' : 's'}` : 'not tagged'}
								</span>
							</div>
						);
					})}
				</div>
			</td>
		</tr>
	);
};

/**
 * Read-only "View Details" drawer for a Goods-to-Showroom request — mirrors
 * InquiryDetailDrawer.tsx's off-canvas pattern (status badge, summary info,
 * status timeline, line items table). Shared across the Showroom Requests,
 * Approve Requests and Barcode & Issue pages so any user who can see a
 * request can also inspect its full detail, including the per-warehouse
 * allocation breakdown once SL Operations has split it across warehouses.
 */
const GoodsTransferDetailDrawer: React.FC<Props> = ({ isOpen, setIsOpen, request }) => {
	if (!request) return null;

	const isRejected = request.status === 'REJECTED';
	const collapsedStatus =
		request.status === 'PARTIALLY_BARCODED'
			? 'BARCODED'
			: request.status === 'PARTIALLY_ISSUED'
				? 'ISSUED'
				: request.status;
	const currentIndex = isRejected ? 0 : STATUS_STEPS.indexOf(collapsedStatus as any);
	const meta = STATUS_META[request.status] ?? { label: request.status, color: 'secondary' };

	return (
		<OffCanvas
			id='goodsTransferDetailDrawer'
			titleId='goodsTransferDetailTitle'
			placement='end'
			isOpen={isOpen}
			setOpen={setIsOpen}
			style={{ width: 'min(94vw, clamp(420px, 50vw, 760px))' }}>
			<OffCanvasHeader setOpen={setIsOpen}>
				<OffCanvasTitle id='goodsTransferDetailTitle'>
					<Icon icon='AddShoppingCart' className='me-2' />
					{request.requestNo}
				</OffCanvasTitle>
			</OffCanvasHeader>
			<OffCanvasBody>
				{/* Status Badge */}
				<div className='mb-4 d-flex align-items-center gap-2'>
					<Badge color={meta.color as any} className='fs-6 px-3 py-2'>
						{meta.label}
					</Badge>
				</div>

				{/* Summary Info */}
				<div className='mb-4 border rounded p-3'>
					<div className='row g-2'>
						<div className='col-6'>
							<div className='text-muted small'>Showroom</div>
							<div className='fw-bold'>{request.showroomName ?? '—'}</div>
						</div>
						<div className='col-6'>
							<div className='text-muted small'>Requested By</div>
							<div className='fw-bold'>{request.requestedByName ?? '—'}</div>
						</div>
						<div className='col-6'>
							<div className='text-muted small'>Requested At</div>
							<div>{fmt(request.requestedAt)}</div>
						</div>
						{request.approvedByName && (
							<div className='col-6'>
								<div className='text-muted small'>Approved By</div>
								<div>
									{request.approvedByName}
									{request.approvedAt && (
										<span className='text-muted small'> · {fmt(request.approvedAt)}</span>
									)}
								</div>
							</div>
						)}
						{request.issuedByName && (
							<div className='col-6'>
								<div className='text-muted small'>Last Issued By</div>
								<div>
									{request.issuedByName}
									{request.issuedAt && (
										<span className='text-muted small'> · {fmt(request.issuedAt)}</span>
									)}
								</div>
							</div>
						)}
						{request.receivedByName && (
							<div className='col-6'>
								<div className='text-muted small'>Received By</div>
								<div>
									{request.receivedByName}
									{request.receivedAt && (
										<span className='text-muted small'> · {fmt(request.receivedAt)}</span>
									)}
								</div>
							</div>
						)}
						{request.notes && (
							<div className='col-12'>
								<div className='text-muted small'>Notes</div>
								<div>{request.notes}</div>
							</div>
						)}
						{request.receivingNote && (
							<div className='col-12'>
								<div className='text-muted small'>Receiving Note</div>
								<div>{request.receivingNote}</div>
							</div>
						)}
					</div>
				</div>

				{/* Rejection */}
				{isRejected && (
					<div className='mb-4 d-flex align-items-start gap-2 p-3 border border-danger rounded'>
						<Icon icon='Cancel' color='danger' size='lg' />
						<div>
							<div className='fw-bold text-danger'>Rejected</div>
							<div className='small'>{request.rejectionReason || 'No reason given.'}</div>
						</div>
					</div>
				)}

				{/* Status Timeline */}
				{!isRejected && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Workflow Progress</div>
						<div className='d-flex flex-column gap-1'>
							{STATUS_STEPS.map((step, idx) => {
								const isPartial =
									(request.status === 'PARTIALLY_BARCODED' && step === 'BARCODED') ||
									(request.status === 'PARTIALLY_ISSUED' && step === 'ISSUED');
								const isDone = idx < currentIndex || (idx === currentIndex && !isPartial);
								const isCurrent = idx === currentIndex;
								const bg = isPartial ? '#ffc107' : isDone ? '#198754' : isCurrent ? '#0d6efd' : '#dee2e6';
								const label = isPartial
									? request.status === 'PARTIALLY_BARCODED'
										? 'Partially Barcoded'
										: 'Partially Issued'
									: STATUS_META[step]?.label ?? step;
								return (
									<div key={step} className='d-flex align-items-center gap-2'>
										<div
											className='rounded-circle d-flex align-items-center justify-content-center'
											style={{
												width: 28,
												height: 28,
												backgroundColor: bg,
												color: isCurrent || isDone ? '#fff' : '#6c757d',
												fontSize: 12,
												flexShrink: 0,
											}}>
											{isDone && !isPartial ? <Icon icon='Check' size='sm' /> : <span>{idx + 1}</span>}
										</div>
										<span
											className={
												isCurrent
													? isPartial
														? 'fw-bold text-warning'
														: 'fw-bold text-primary'
													: isDone
														? 'text-success'
														: 'text-muted'
											}
											style={{ fontSize: 13 }}>
											{label}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Line Items */}
				{request.items.length > 0 && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Line Items</div>
						<div className='table-responsive rounded'>
							<table className='table table-modern-compact mb-0'>
								<thead className='table-light'>
									<tr>
										<th>Item</th>
										<th>Barcode Tags</th>
										<th className='text-center'>Requested</th>
										<th className='text-center'>Approved</th>
										<th className='text-center'>Issued</th>
									</tr>
								</thead>
								<tbody>
									{request.items.map((item) => (
										<React.Fragment key={item.id}>
											<tr>
												<td>
													{item.productName || '—'}
													<div className='small text-muted'>
														SKU: {item.sku}
														{(item.size || item.color) &&
															` · ${[item.size, item.color].filter(Boolean).join(' / ')}`}
													</div>
												</td>
												<td>
													{item.barcodeUnits.length > 0 ? (
														<Badge color='success' isLight>
															{item.barcodeUnits.length} unit tag{item.barcodeUnits.length === 1 ? '' : 's'}
														</Badge>
													) : (
														<span className='text-muted fst-italic small'>Not generated</span>
													)}
												</td>
												<td className='text-center'>{qty(item.requestedQty)}</td>
												<td className='text-center'>{qty(item.approvedQty)}</td>
												<td className='text-center'>{qty(item.issuedQty)}</td>
											</tr>
											<AllocationRow item={item} />
										</React.Fragment>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</OffCanvasBody>
		</OffCanvas>
	);
};

export default GoodsTransferDetailDrawer;

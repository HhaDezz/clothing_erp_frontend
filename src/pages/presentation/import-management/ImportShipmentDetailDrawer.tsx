import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import OffCanvas, {
	OffCanvasBody,
	OffCanvasHeader,
	OffCanvasTitle,
} from '../../../components/bootstrap/OffCanvas';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import Button from '../../../components/bootstrap/Button';
import Spinner from '../../../components/bootstrap/Spinner';
import showNotification from '../../../components/extras/showNotification';
import {
	ImportShipmentResponse,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
	IMPORT_LEG_STAGE_LABELS,
	IMPORT_LEG_STAGE_COLORS,
	getImportShipmentDocumentApi,
	getImportWarehouseAllocationsApi,
	getImportWarehouseLegsApi,
} from '../../../api/importShipments.api';
import ImportShipmentSourceInquiryModal from './ImportShipmentSourceInquiryModal';
import ViewGrnPdfButton from './ViewGrnPdfButton';
import PrintGrnPdfButton from './PrintGrnPdfButton';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	shipment: ImportShipmentResponse | null;
	canUploadDocument: boolean;
	onUploadDocument: (file: File) => void;
	isUploading: boolean;
	// Warehouse-to-import-process linkage (optional — pages that don't offer
	// editing simply omit these and the section renders read-only/hidden).
	canEditWarehouseAllocation?: boolean;
	onEditWarehouseAllocation?: () => void;
}

const STATUS_STEPS = [
	'DRAFT_INTAKE',
	'COSTING_SUBMITTED',
	'PROCUREMENT_REVIEW',
	'PROCUREMENT_APPROVED',
	'RECEIVING_BAY1',
	'QA_BAY2',
	'GRN_GENERATED',
	'FINANCE_VAT_PENDING',
	'PENDING_HIGHER_APPROVAL',
	'STOCK_COMMITTED',
] as const;

const DocumentAction: React.FC<{
	shipmentId: number;
	documentId: number;
	label: string;
}> = ({ shipmentId, documentId, label }) => {
	const [busy, setBusy] = useState<'view' | 'download' | null>(null);
	const cacheRef = useRef<{ url: string; filename: string } | null>(null);

	useEffect(
		() => () => {
			if (cacheRef.current) URL.revokeObjectURL(cacheRef.current.url);
		},
		[],
	);

	const load = async () => {
		if (cacheRef.current) return cacheRef.current;
		const { blob, filename } = await getImportShipmentDocumentApi(shipmentId, documentId);
		const entry = { url: URL.createObjectURL(blob), filename };
		cacheRef.current = entry;
		return entry;
	};

	const handleView = async () => {
		setBusy('view');
		try {
			const { url } = await load();
			window.open(url, '_blank', 'noopener,noreferrer');
		} catch {
			showNotification('Error', `Could not open ${label}.`, 'danger');
		} finally {
			setBusy(null);
		}
	};

	const handleDownload = async () => {
		setBusy('download');
		try {
			const { url, filename } = await load();
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch {
			showNotification('Error', `Could not download ${label}.`, 'danger');
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className='d-flex align-items-center gap-2 mb-2 p-2 border rounded'>
			<Icon icon='FileCopy' color='primary' size='lg' />
			<span className='small flex-grow-1 text-truncate'>{label}</span>
			<Button size='sm' color='light' isDisable={busy !== null} onClick={handleView}>
				{busy === 'view' ? <Spinner isSmall inButton isGrow /> : 'View'}
			</Button>
			<Button size='sm' color='light' isDisable={busy !== null} onClick={handleDownload}>
				{busy === 'download' ? <Spinner isSmall inButton isGrow /> : 'Download'}
			</Button>
		</div>
	);
};

const ImportShipmentDetailDrawer: React.FC<Props> = ({
	isOpen,
	setIsOpen,
	shipment,
	canUploadDocument,
	onUploadDocument,
	isUploading,
	canEditWarehouseAllocation,
	onEditWarehouseAllocation,
}) => {
	const [isSourceInquiryOpen, setIsSourceInquiryOpen] = useState(false);

	const shipmentId = shipment?.id ?? null;
	const { data: warehouseAllocations = [] } = useQuery({
		queryKey: ['importShipmentWarehouseAllocations', shipmentId],
		queryFn: () => getImportWarehouseAllocationsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});
	// "need multiple grn if allocated multiple warehouses" — each warehouse
	// here runs its own independent Receive Bay1 -> QA Bay2 -> GRN cycle; see
	// ImportShipmentService's class Javadoc on the backend for the full
	// picture. Empty for a shipment that hasn't been allocated to any
	// warehouse yet.
	const { data: warehouseLegs = [], isLoading: legsLoading } = useQuery({
		queryKey: ['importShipmentWarehouseLegs', shipmentId],
		queryFn: () => getImportWarehouseLegsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});

	if (!shipment) return null;

	// Editable any time before Bay 1 receiving starts for a given item — this
	// button hides once every warehouse has at least started receiving (the
	// backend still enforces the real per-item lock, this is just when the
	// shortcut here is worth offering).
	// Also locked once the shipment is submitted for higher approval:
	// the Director/Admin is reviewing the final per-warehouse figures and
	// changing the split at that point would silently invalidate the approval.
	const postHigherApproval =
		shipment.status === 'PENDING_HIGHER_APPROVAL' || shipment.status === 'STOCK_COMMITTED';
	const canOfferAllocationEdit =
		!!canEditWarehouseAllocation &&
		!!onEditWarehouseAllocation &&
		!postHigherApproval &&
		(warehouseLegs.length === 0 || warehouseLegs.some((l) => l.legStage === 'PENDING_RECEIVING'));

	const currentIndex = STATUS_STEPS.indexOf(shipment.status as any);
	const showReceivingColumns = currentIndex >= STATUS_STEPS.indexOf('RECEIVING_BAY1');
	const showFinalPricingColumn = currentIndex >= STATUS_STEPS.indexOf('FINANCE_VAT_PENDING');

	const triggerUpload = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/pdf,image/*';
		input.onchange = () => {
			if (input.files?.[0]) onUploadDocument(input.files[0]);
		};
		input.click();
	};

	return (
		<>
		<OffCanvas
			id='importShipmentDetailDrawer'
			titleId='importShipmentDetailTitle'
			placement='end'
			isOpen={isOpen}
			setOpen={setIsOpen}
			style={{ width: 'min(94vw, clamp(420px, 50vw, 760px))' }}>
			<OffCanvasHeader setOpen={setIsOpen}>
				<OffCanvasTitle id='importShipmentDetailTitle'>
					<Icon icon='LocalShipping' className='me-2' />
					{shipment.shipmentNo}
				</OffCanvasTitle>
			</OffCanvasHeader>
			<OffCanvasBody>
				<div className='mb-4 d-flex align-items-center gap-2'>
					<Badge color={IMPORT_SHIPMENT_STATUS_COLORS[shipment.status] as any} className='fs-6 px-3 py-2'>
						{IMPORT_SHIPMENT_STATUS_LABELS[shipment.status]}
					</Badge>
				</div>

				<div className='mb-4 border rounded p-3'>
					<div className='row g-2'>
						<div className='col-6'>
							<div className='text-muted small'>Created By</div>
							<div className='fw-bold'>{shipment.createdByName}</div>
						</div>
						<div className='col-6'>
							<div className='text-muted small'>Total Costing Value</div>
							<div className='fw-bold'>{formatCurrency(shipment.totalCostingValue)}</div>
						</div>
						{shipment.packingRefNo && (
							<div className='col-12'>
								<div className='text-muted small'>Packing Reference</div>
								<div className='fw-bold'>{shipment.packingRefNo}</div>
							</div>
						)}
						{shipment.gfReference && (
							<div className='col-12'>
								<div className='text-muted small'>GF Reference</div>
								<div>{shipment.gfReference}</div>
							</div>
						)}
						{shipment.sourceInquiryNo && (
							<div className='col-12'>
								<div className='text-muted small'>Linked Purchase Inquiry</div>
								<div
									role='button'
									className='fw-bold text-primary text-decoration-underline'
									style={{ cursor: 'pointer' }}
									onClick={() => setIsSourceInquiryOpen(true)}>
									{shipment.sourceInquiryNo}
								</div>
							</div>
						)}
						{shipment.procurementApprovedByName && (
							<div className='col-6'>
								<div className='text-muted small'>Reviewed By (Procurement)</div>
								<div>{shipment.procurementApprovedByName}</div>
							</div>
						)}
						{shipment.financeApprovedByName && (
							<div className='col-6'>
								<div className='text-muted small'>Price Approved By (Finance)</div>
								<div>{shipment.financeApprovedByName}</div>
							</div>
						)}
						{shipment.deliveryConfirmationNote && (
							<div className='col-12'>
								<div className='text-muted small'>Freight Forwarder Delivery Confirmation (legacy, whole-shipment)</div>
								<div>{shipment.deliveryConfirmationNote}</div>
							</div>
						)}
					</div>
				</div>

				<div className='mb-4'>
					<div className='fw-bold mb-2'>Workflow Progress</div>
					<div className='d-flex flex-column gap-1'>
						{STATUS_STEPS.map((step, idx) => {
							const isDone = idx < currentIndex;
							const isCurrent = idx === currentIndex;
							return (
								<div key={step} className='d-flex align-items-center gap-2'>
									<div
										className='rounded-circle d-flex align-items-center justify-content-center'
										style={{
											width: 28,
											height: 28,
											backgroundColor: isDone ? '#198754' : isCurrent ? '#0d6efd' : '#dee2e6',
											color: isCurrent || isDone ? '#fff' : '#6c757d',
											fontSize: 12,
											flexShrink: 0,
										}}>
										{isDone ? <Icon icon='Check' size='sm' /> : <span>{idx + 1}</span>}
									</div>
									<span
										className={
											isCurrent ? 'fw-bold text-primary' : isDone ? 'text-success' : 'text-muted'
										}
										style={{ fontSize: 13 }}>
										{IMPORT_SHIPMENT_STATUS_LABELS[step]}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{shipment.items.length > 0 && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Line Items</div>
						<div className='table-responsive rounded'>
						<table className='table table-modern-compact mb-0'>
							<thead className='table-light'>
								<tr>
									<th>Description</th>
									<th>Qty</th>
									<th className='text-end'>Costing</th>
									<th className='text-end'>Baseline Selling</th>
									<th className='text-end'>Adjusted Selling</th>
									{showFinalPricingColumn && <th className='text-end'>Final Selling</th>}
								</tr>
							</thead>
							<tbody>
								{shipment.items.map((item) => (
									<tr key={item.id}>
										<td>
										{item.productName ?? item.description ?? '—'}
										{item.variantSku && (
											<div className='small text-muted'>SKU: {item.variantSku}{(item.variantSize || item.variantColor) ? ` (${[item.variantSize, item.variantColor].filter(Boolean).join(' / ')})` : ''}</div>
										)}
									</td>
										<td>
											{item.quantity} {item.unit ?? ''}
										</td>
										<td className='text-end'>{formatCurrency(item.costingPrice)}</td>
										<td className='text-end'>{formatCurrency(item.baselineSellingPrice)}</td>
										<td className='text-end'>
											{item.adjustedSellingPrice != null ? (
												<span className='fw-bold text-warning'>{formatCurrency(item.adjustedSellingPrice)}</span>
											) : (
												<span className='text-muted'>—</span>
											)}
										</td>
										{showFinalPricingColumn && (
											<td className='text-end fw-bold'>
												{item.finalSellingPrice != null ? formatCurrency(item.finalSellingPrice) : '—'}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
						</div>
						{showReceivingColumns && (
							<div className='small text-muted fst-italic mt-1'>
								Receiving/QA figures are now per warehouse — see "Warehouse Legs" below.
							</div>
						)}
					</div>
				)}

				<div className='mb-4 border rounded p-3'>
					<div className='d-flex align-items-center justify-content-between mb-2'>
						<div className='fw-bold'>Warehouse Allocation</div>
						{canOfferAllocationEdit && (
							<Button size='sm' color='primary' isLight icon='Edit' onClick={onEditWarehouseAllocation}>
								Edit
							</Button>
						)}
					</div>
					{warehouseAllocations.length === 0 ? (
						<div className='small text-muted fst-italic'>
							Not yet split across warehouses — visible to every warehouse-restricted user until allocated,
							and receiving cannot start for any item until it is.
						</div>
					) : (
						<div className='d-flex flex-column gap-1'>
							{shipment.items.map((item) => {
								const lines = warehouseAllocations.filter((a) => a.shipmentItemId === item.id);
								if (lines.length === 0) return null;
								return (
									<div key={item.id} className='small'>
										<span className='text-muted'>{item.productName ?? item.description ?? `Item ${item.id}`}:</span>{' '}
										{lines.map((l, i) => (
											<span key={l.id}>
												{i > 0 && ', '}
												<span className='fw-bold'>{l.warehouseName ?? '—'}</span> ({l.quantity})
											</span>
										))}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* "if user 1 allocated warehouse 1, shipment has 100 items 50 goes to
				    warehouse 1 and 50 goes to warehouse 2, user 1 can accept only 50,
				    need multiple grn if allocated multiple warehouses" — each card below
				    is one warehouse's own independent Receive Bay1 -> QA Bay2 -> GRN
				    cycle. Once a leg has its own GRN, PrintGrnPdfButton builds that
				    warehouse's GRN PDF (with the company logo) entirely client-side —
				    see helpers/generateGrnPdf.ts. */}
				{(legsLoading || warehouseLegs.length > 0) && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Warehouse Legs</div>
						{legsLoading ? (
							<div className='text-center py-3'>
								<Spinner isSmall />
							</div>
						) : (
							<div className='d-flex flex-column gap-2'>
								{warehouseLegs.map((leg) => (
									<div key={leg.warehouseId} className='border rounded p-3'>
										<div className='d-flex align-items-center justify-content-between mb-2'>
											<div>
												<div className='fw-bold'>{leg.warehouseName ?? `Warehouse ${leg.warehouseId}`}</div>
												{/* This warehouse's own packing-list code  -  the shipment's shared
												    packing reference plus this warehouse's code, e.g. "PKG-2026-0001-WH3"
												    ("if same shipment goes to multiple warehouses, use reference number +
												    warehouse code but share same reference number"). Falls back to the
												    shipment's shipmentNo when packingRefNo isn't populated yet (pre-feature
												    shipments), mirroring the backend's own fallback. The WH{id} suffix
												    mirrors GoodsTransferService#warehouseCode's "WH" + warehouse.getId()
												    stand-in code. */}
												<div className='text-muted small font-monospace'>
													{(shipment.packingRefNo ?? shipment.shipmentNo)}-WH{leg.warehouseId}
												</div>
											</div>
											<div className='d-flex align-items-center gap-2'>
												{leg.grnNo && <PrintGrnPdfButton shipment={shipment} leg={leg} />}
												<Badge color={IMPORT_LEG_STAGE_COLORS[leg.legStage] as any} isLight>
													{IMPORT_LEG_STAGE_LABELS[leg.legStage]}
												</Badge>
											</div>
										</div>
										<div className='row g-2 small'>
											{leg.receivedAt && (
												<div className='col-6'>
													<div className='text-muted'>Received By</div>
													<div>{leg.receivedByName ?? '—'} · {new Date(leg.receivedAt).toLocaleString()}</div>
												</div>
											)}
											{leg.qaSubmittedAt && (
												<div className='col-6'>
													<div className='text-muted'>QA By</div>
													<div>{leg.qaSubmittedByName ?? '—'} · {new Date(leg.qaSubmittedAt).toLocaleString()}</div>
												</div>
											)}
											{leg.deliveryConfirmationNote && (
												<div className='col-12'>
													<div className='text-muted'>Delivery Confirmation</div>
													<div>{leg.deliveryConfirmationNote}</div>
												</div>
											)}
										</div>
										{leg.grnNo && (
											<div className='row g-2 small mt-1 pt-2 border-top'>
												<div className='col-6'>
													<div className='text-muted'>GRN No.</div>
													<div className='fw-bold'>{leg.grnNo}</div>
												</div>
												<div className='col-6'>
													<div className='text-muted'>Generated</div>
													<div>{leg.grnGeneratedAt ? new Date(leg.grnGeneratedAt).toLocaleString() : '—'}</div>
												</div>
												<div className='col-6'>
													<div className='text-muted'>Accepted</div>
													<div className='text-success fw-bold'>{leg.grnTotalAcceptedQty ?? 0}</div>
												</div>
												<div className='col-6'>
													<div className='text-muted'>Defective</div>
													<div className='text-danger fw-bold'>{leg.grnTotalDefectiveQty ?? 0}</div>
												</div>
											</div>
										)}
										<table className='table table-sm table-borderless align-middle mb-0 mt-2'>
											<thead className='table-light'>
												<tr>
													<th>Item</th>
													<th className='text-end'>Planned</th>
													<th className='text-end'>Received</th>
													<th className='text-end'>Passed</th>
													<th className='text-end'>Defective</th>
												</tr>
											</thead>
											<tbody>
												{leg.items.map((item) => (
													<tr key={item.allocationId}>
														<td>{item.productName ?? item.description ?? '—'}</td>
														<td className='text-end'>{item.plannedQty}</td>
														<td className='text-end'>{item.receivedAt ? item.receivedQty : '—'}</td>
														<td className='text-end text-success'>{item.qaSubmittedAt ? item.qaPassedQty : '—'}</td>
														<td className='text-end text-danger'>{item.qaSubmittedAt ? item.qaDefectiveQty : '—'}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{shipment.grn && (
					<div className='mb-4 border rounded p-3'>
						<div className='d-flex align-items-center justify-content-between mb-2'>
							<div className='fw-bold'>Goods Received Note (legacy, whole-shipment)</div>
							{shipment.grn.pdfAvailable && <ViewGrnPdfButton shipment={shipment} />}
						</div>
						<div className='row g-2'>
							<div className='col-6'>
								<div className='text-muted small'>GRN No.</div>
								<div className='fw-bold'>{shipment.grn.grnNo}</div>
							</div>
							<div className='col-6'>
								<div className='text-muted small'>Generated By</div>
								<div>{shipment.grn.generatedByName ?? '—'}</div>
							</div>
							<div className='col-6'>
								<div className='text-muted small'>Total Accepted</div>
								<div className='text-success fw-bold'>{shipment.grn.totalAcceptedQty}</div>
							</div>
							<div className='col-6'>
								<div className='text-muted small'>Total Defective</div>
								<div className='text-danger fw-bold'>{shipment.grn.totalDefectiveQty}</div>
							</div>
						</div>
					</div>
				)}

				{(shipment.vatAmount != null || shipment.higherApprovedByName) && (
					<div className='mb-4 border rounded p-3'>
						<div className='fw-bold mb-2'>VAT, Final Pricing &amp; Higher Approval</div>
						<div className='row g-2'>
							{shipment.vatAmount != null && (
								<div className='col-6'>
									<div className='text-muted small'>VAT Amount</div>
									<div className='fw-bold'>{formatCurrency(shipment.vatAmount)}</div>
								</div>
							)}
							{shipment.finalSellingAdjustedByName && (
								<div className='col-6'>
									<div className='text-muted small'>VAT / Pricing By</div>
									<div>{shipment.finalSellingAdjustedByName}</div>
								</div>
							)}
							{shipment.higherApprovedByName && (
								<div className='col-6'>
									<div className='text-muted small'>Approved By</div>
									<div className='text-success fw-bold'>{shipment.higherApprovedByName}</div>
								</div>
							)}
							{shipment.stockCommittedAt && (
								<div className='col-6'>
									<div className='text-muted small'>Stock Committed At</div>
									<div>{new Date(shipment.stockCommittedAt).toLocaleString()}</div>
								</div>
							)}
						</div>
					</div>
				)}

				<div className='mb-4'>
					<div className='d-flex align-items-center justify-content-between mb-2'>
						<div className='fw-bold'>Documents (Packing List)</div>
						{canUploadDocument && shipment.status === 'DRAFT_INTAKE' && (
							<Button size='sm' color='primary' isLight icon='FileUpload' isDisable={isUploading} onClick={triggerUpload}>
								{isUploading ? 'Uploading...' : 'Upload'}
							</Button>
						)}
					</div>
					{shipment.documents.length === 0 ? (
						<div className='d-flex align-items-center gap-2 p-2 border rounded border-dashed text-muted'>
							<Icon icon='HourglassEmpty' size='lg' />
							<span className='small fst-italic'>No documents uploaded yet…</span>
						</div>
					) : (
						shipment.documents.map((doc) => (
							<DocumentAction
								key={doc.id}
								shipmentId={shipment.id}
								documentId={doc.id}
								label={doc.originalFilename ?? `Document ${doc.id}`}
							/>
						))
					)}
				</div>
			</OffCanvasBody>
		</OffCanvas>
		<ImportShipmentSourceInquiryModal
			isOpen={isSourceInquiryOpen}
			setIsOpen={setIsSourceInquiryOpen}
			inquiryId={shipment.sourceInquiryId}
		/>
		</>
	);
};

export default ImportShipmentDetailDrawer;

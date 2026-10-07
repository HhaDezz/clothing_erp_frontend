import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { getApiErrorMessage } from '../../../utils/apiError';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import {
	PurchaseInquiryResponse,
	INQUIRY_STATUS_LABELS,
	INQUIRY_STATUS_COLORS,
	InquiryDocumentType,
	getInquiryDocumentApi,
} from '../../../api/inquiry.api';
import {
	getImportShipmentsByInquiryApi,
	createImportShipmentFromInquiryApi,
	IMPORT_SHIPMENT_STATUS_LABELS,
	IMPORT_SHIPMENT_STATUS_COLORS,
} from '../../../api/importShipments.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	inquiry: PurchaseInquiryResponse | null;
}

// Ordered list of statuses for the visual timeline
const STATUS_STEPS = [
	'DRAFT_INQUIRY',
	'PENDING_GF_CONFIRM',
	'GF_CONFIRMED',
	'SL_RECONFIRMED',
	'PO_APPROVED',
	'AWAITING_PI',
	'PI_UPLOADED',
	'PAYMENT_PROCESSED',
	'PO_FINALIZED',
	'GOODS_REQUESTED',
] as const;

/**
 * "View" opens the file in a new tab (browser renders PDFs/images natively).
 * "Download" saves it locally under its original filename. Both pull from
 * the same lazily-fetched, cached blob so clicking one then the other
 * doesn't re-hit the network.
 */
const DocumentAction: React.FC<{
	inquiryId: number;
	type: InquiryDocumentType;
	label: string;
	color: string;
}> = ({ inquiryId, type, label, color }) => {
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
		const { blob, filename } = await getInquiryDocumentApi(inquiryId, type);
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
			<Icon icon='FileCopy' color={color as any} size='lg' />
			<span className='small flex-grow-1'>{label}</span>
			<Button size='sm' color='light' isDisable={busy !== null} onClick={handleView}>
				{busy === 'view' ? <Spinner isSmall inButton isGrow /> : 'View'}
			</Button>
			<Button size='sm' color='light' isDisable={busy !== null} onClick={handleDownload}>
				{busy === 'download' ? <Spinner isSmall inButton isGrow /> : 'Download'}
			</Button>
		</div>
	);
};

// A doc slot that hasn't been uploaded yet, shown only while the workflow is
// actually waiting on it — keeps the drawer from implying nothing is missing.
const PendingDocument: React.FC<{ label: string }> = ({ label }) => (
	<div className='d-flex align-items-center gap-2 mb-2 p-2 border rounded border-dashed text-muted'>
		<Icon icon='HourglassEmpty' size='lg' />
		<span className='small fst-italic'>Waiting for {label.toLowerCase()}…</span>
	</div>
);

const InquiryDetailDrawer: React.FC<Props> = ({ isOpen, setIsOpen, inquiry }) => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canCreateImportShipment = hasPermission(PERMISSIONS.CREATE_IMPORT_SHIPMENT);

	// A PO can spawn more than one import shipment as goods arrive — this
	// looks up what already exists so the drawer doesn't imply there's none.
	const { data: linkedShipments = [] } = useQuery({
		queryKey: ['importShipments', 'byInquiry', inquiry?.id],
		queryFn: () => getImportShipmentsByInquiryApi(inquiry!.id),
		enabled: isOpen && !!inquiry?.id,
	});

	const createImportShipmentMutation = useMutation({
		mutationFn: createImportShipmentFromInquiryApi,
		onSuccess: (shipment) => {
			queryClient.invalidateQueries({ queryKey: ['importShipments'] });
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Import Shipment {shipment.shipmentNo} Created</>,
				'Find it under Import Process → Import Shipments to continue the intake.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to create import shipment'), 'danger'),
	});

	if (!inquiry) return null;

	const currentIndex = STATUS_STEPS.indexOf(inquiry.status as any);
	const showPiSlot = inquiry.piDocumentPath || inquiry.status === 'AWAITING_PI';
	const showTtSlot = inquiry.ttDocumentPath || inquiry.status === 'PI_UPLOADED';

	return (
		<OffCanvas
			id='inquiryDetailDrawer'
			titleId='inquiryDetailTitle'
			placement='end'
			isOpen={isOpen}
			setOpen={setIsOpen}
			style={{ width: 'min(94vw, clamp(420px, 50vw, 760px))' }}>
			<OffCanvasHeader setOpen={setIsOpen}>
				<OffCanvasTitle id='inquiryDetailTitle'>
					<Icon icon='FindInPage' className='me-2' />
					{inquiry.inquiryNo}
				</OffCanvasTitle>
			</OffCanvasHeader>
			<OffCanvasBody>
				{/* Status Badge */}
				<div className='mb-4 d-flex align-items-center gap-2'>
					<Badge
						color={INQUIRY_STATUS_COLORS[inquiry.status] as any}
						className='fs-6 px-3 py-2'>
						{INQUIRY_STATUS_LABELS[inquiry.status]}
					</Badge>
				</div>

				{/* Summary Info */}
				<div className='mb-4 border rounded p-3'>
					<div className='row g-2'>
						<div className='col-6'>
							<div className='text-muted small'>Created By</div>
							<div className='fw-bold'>{inquiry.createdByName}</div>
						</div>
						<div className='col-6'>
							<div className='text-muted small'>Total Amount</div>
							<div className='fw-bold'>{formatCurrency(inquiry.totalAmount)}</div>
						</div>
						{inquiry.gfContactEmail && (
							<div className='col-12'>
								<div className='text-muted small'>GF Contact Email</div>
								<div>
									<a href={`mailto:${inquiry.gfContactEmail}`}>{inquiry.gfContactEmail}</a>
								</div>
							</div>
						)}
						{inquiry.title && (
							<div className='col-12'>
								<div className='text-muted small'>Title</div>
								<div>{inquiry.title}</div>
							</div>
						)}
						{inquiry.notes && (
							<div className='col-12'>
								<div className='text-muted small'>Notes</div>
								<div>{inquiry.notes}</div>
							</div>
						)}
					</div>
				</div>

				{/* Status Timeline */}
				<div className='mb-4'>
					<div className='fw-bold mb-2'>Workflow Progress</div>
					<div className='d-flex flex-column gap-1'>
						{STATUS_STEPS.map((step, idx) => {
							const isDone = idx < currentIndex;
							const isCurrent = idx === currentIndex;
							return (
								<div key={step} className='d-flex align-items-center gap-2'>
									<div
										className={`rounded-circle d-flex align-items-center justify-content-center`}
										style={{
											width: 28,
											height: 28,
											backgroundColor: isDone
												? '#198754'
												: isCurrent
												? '#0d6efd'
												: '#dee2e6',
											color: isCurrent || isDone ? '#fff' : '#6c757d',
											fontSize: 12,
											flexShrink: 0,
										}}>
										{isDone ? (
											<Icon icon='Check' size='sm' />
										) : (
											<span>{idx + 1}</span>
										)}
									</div>
									<span
										className={
											isCurrent
												? 'fw-bold text-primary'
												: isDone
												? 'text-success'
												: 'text-muted'
										}
										style={{ fontSize: 13 }}>
										{INQUIRY_STATUS_LABELS[step]}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Line Items */}
				{inquiry.items.length > 0 && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Line Items</div>
						<div className='table-responsive rounded'>
						<table className='table table-modern-compact mb-0'>
							<thead className='table-light'>
								<tr>
									<th>Description</th>
									<th>Qty</th>
									<th>Unit</th>
									<th className='text-end'>Total</th>
								</tr>
							</thead>
							<tbody>
								{inquiry.items.map((item) => (
									<tr key={item.id}>
										<td>{item.productName ?? item.description ?? '—'}</td>
										<td>{item.quantity}</td>
										<td>{item.unit ?? '—'}</td>
										<td className='text-end'>{formatCurrency(item.totalPrice)}</td>
									</tr>
								))}
							</tbody>
						</table>
						</div>
					</div>
				)}

				{/* Documents */}
				{(showPiSlot || showTtSlot) && (
					<div className='mb-4'>
						<div className='fw-bold mb-2'>Documents</div>
						{showPiSlot &&
							(inquiry.piDocumentPath ? (
								<DocumentAction
									inquiryId={inquiry.id}
									type='pi'
									label='Proforma Invoice'
									color='primary'
								/>
							) : (
								<PendingDocument label='Proforma Invoice' />
							))}
						{showTtSlot &&
							(inquiry.ttDocumentPath ? (
								<DocumentAction
									inquiryId={inquiry.id}
									type='tt'
									label='TT Payment Receipt'
									color='success'
								/>
							) : (
								<PendingDocument label='TT payment receipt' />
							))}
					</div>
				)}
				{/* Import Shipments (linked via "Create Import Shipment" once goods dispatch has been requested — V60) */}
				{(inquiry.status === 'GOODS_REQUESTED' || linkedShipments.length > 0) && (
					<div className='mb-4'>
						<div className='d-flex align-items-center justify-content-between mb-2'>
							<div className='fw-bold'>Import Shipments</div>
							{canCreateImportShipment && inquiry.status === 'GOODS_REQUESTED' && linkedShipments.length === 0 && (
								<Button
									size='sm'
									color='primary'
									isLight
									icon='Add'
									isDisable={createImportShipmentMutation.isPending}
									onClick={() => createImportShipmentMutation.mutate(inquiry.id)}>
									{createImportShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
								</Button>
							)}
						</div>
						{linkedShipments.length === 0 ? (
							<div className='d-flex align-items-center gap-2 p-2 border rounded border-dashed text-muted'>
								<Icon icon='HourglassEmpty' size='lg' />
								<span className='small fst-italic'>No import shipments created yet…</span>
							</div>
						) : (
							linkedShipments.map((shipment) => (
								<div key={shipment.id} className='d-flex align-items-center gap-2 mb-2 p-2 border rounded'>
									<Icon icon='LocalShipping' color='primary' size='lg' />
									<span className='small flex-grow-1'>{shipment.shipmentNo}</span>
									<Badge color={IMPORT_SHIPMENT_STATUS_COLORS[shipment.status] as any} isLight>
										{IMPORT_SHIPMENT_STATUS_LABELS[shipment.status]}
									</Badge>
								</div>
							))
						)}
					</div>
				)}
			</OffCanvasBody>
		</OffCanvas>
	);
};

export default InquiryDetailDrawer;

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, { ModalBody, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import Button from '../../../components/bootstrap/Button';
import Spinner from '../../../components/bootstrap/Spinner';
import showNotification from '../../../components/extras/showNotification';
import {
	getInquiryByIdApi,
	getInquiryDocumentApi,
	INQUIRY_STATUS_LABELS,
	INQUIRY_STATUS_COLORS,
	InquiryDocumentType,
} from '../../../api/inquiry.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	inquiryId: number | null;
}

// Compact view/download control for the PI/TT documents — same lazily-fetched,
// cached-blob pattern used in InquiryDetailDrawer, duplicated here since that
// one isn't exported and this modal has its own, simpler layout.
const DocumentAction: React.FC<{
	inquiryId: number;
	type: InquiryDocumentType;
	label: string;
}> = ({ inquiryId, type, label }) => {
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
			<Icon icon='FileCopy' color='primary' size='lg' />
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

const ImportShipmentSourceInquiryModal: React.FC<Props> = ({ isOpen, setIsOpen, inquiryId }) => {
	const { data: inquiry, isLoading, error } = useQuery({
		queryKey: ['purchaseInquiry', inquiryId],
		queryFn: () => getInquiryByIdApi(inquiryId!),
		enabled: isOpen && !!inquiryId,
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='sourceInquiryModalTitle' isCentered isScrollable>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='sourceInquiryModalTitle'>
					<Icon icon='FindInPage' className='me-2' />
					{inquiry ? inquiry.inquiryNo : 'Linked Purchase Inquiry'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{isLoading && (
					<div className='d-flex justify-content-center py-5'>
						<Spinner />
					</div>
				)}

				{!isLoading && error && (
					<div className='text-danger text-center py-3'>Failed to load the linked purchase inquiry.</div>
				)}

				{!isLoading && inquiry && (
					<>
						<div className='mb-4 d-flex align-items-center gap-2'>
							<Badge color={INQUIRY_STATUS_COLORS[inquiry.status] as any} className='fs-6 px-3 py-2'>
								{INQUIRY_STATUS_LABELS[inquiry.status]}
							</Badge>
						</div>

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

						{inquiry.items.length > 0 && (
							<div className='mb-4'>
								<div className='fw-bold mb-2'>Line Items</div>
								<table className='table table-sm table-bordered'>
									<thead className='table-light'>
										<tr>
											<th>Description</th>
											<th>Qty</th>
											<th>Unit</th>
											<th className='text-end'>Unit Price</th>
											<th className='text-end'>Total</th>
										</tr>
									</thead>
									<tbody>
										{inquiry.items.map((item) => (
											<tr key={item.id}>
												<td>{item.productName ?? item.description ?? '—'}</td>
												<td>{item.quantity}</td>
												<td>{item.unit ?? '—'}</td>
												<td className='text-end'>{formatCurrency(item.unitPrice)}</td>
												<td className='text-end'>{formatCurrency(item.totalPrice)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{(inquiry.piDocumentPath || inquiry.ttDocumentPath) && (
							<div className='mb-2'>
								<div className='fw-bold mb-2'>Documents</div>
								{inquiry.piDocumentPath && (
									<DocumentAction inquiryId={inquiry.id} type='pi' label='Proforma Invoice' />
								)}
								{inquiry.ttDocumentPath && (
									<DocumentAction inquiryId={inquiry.id} type='tt' label='TT Payment Receipt' />
								)}
							</div>
						)}
					</>
				)}
			</ModalBody>
		</Modal>
	);
};

export default ImportShipmentSourceInquiryModal;

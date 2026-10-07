import React from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import { ImportShipmentResponse } from '../../../api/importShipments.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onApprove: () => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

/**
 * Step 9 — Higher Approval. Read-only recap of the GRN and Finance's VAT /
 * final pricing work — the last checkpoint before stock goes live. Nothing
 * here is editable; send the shipment back through QA/VAT to correct a line.
 */
const ImportHigherApprovalModal: React.FC<Props> = ({ isOpen, setIsOpen, onApprove, isLoading, shipment }) => {
	if (!shipment) return null;

	const totalFinalSelling = shipment.items.reduce(
		(sum, i) => sum + (i.finalSellingPrice ?? 0) * i.quantity,
		0,
	);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='importHigherApprovalModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importHigherApprovalModal'>Higher Approval — {shipment.shipmentNo}</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<Alert color='warning' isLight className='mb-3'>
					This is the final sign-off. Approving commits the stock as live — it cannot be undone from
					here.
				</Alert>

				<div className='row g-2 mb-3'>
					<div className='col-6'>
						<div className='text-muted small'>GRN No.</div>
						<div className='fw-bold'>{shipment.grn?.grnNo ?? '—'}</div>
					</div>
					<div className='col-6'>
						<div className='text-muted small'>VAT Amount (shipment)</div>
						<div className='fw-bold'>{shipment.vatAmount != null ? formatCurrency(shipment.vatAmount) : '—'}</div>
					</div>
					<div className='col-6'>
						<div className='text-muted small'>VAT / Final Pricing By</div>
						<div>{shipment.finalSellingAdjustedByName ?? '—'}</div>
					</div>
				</div>

				<table className='table table-sm table-bordered align-middle'>
					<thead className='table-light'>
						<tr>
							<th>Item</th>
							<th className='text-end' style={{ width: 110 }}>
								Accepted Qty
							</th>
							<th className='text-end' style={{ width: 130 }}>
								Final Selling Price
							</th>
						</tr>
					</thead>
					<tbody>
						{shipment.items.map((item) => (
							<tr key={item.id}>
								<td>{item.productName ?? item.description ?? '—'}</td>
								<td className='text-end'>{item.qaPassedQty}</td>
								<td className='text-end fw-bold'>
									{item.finalSellingPrice != null ? formatCurrency(item.finalSellingPrice) : '—'}
								</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className='table-light fw-bold'>
							<td colSpan={2}>Total Final Selling Value</td>
							<td className='text-end'>{formatCurrency(totalFinalSelling)}</td>
						</tr>
					</tfoot>
				</table>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button type='button' color='success' isDisable={isLoading} isLight onClick={onApprove}>
					{isLoading ? 'Approving...' : 'Approve — Commit Stock'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ImportHigherApprovalModal;

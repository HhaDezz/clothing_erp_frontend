import React from 'react';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Input from '../../../components/bootstrap/forms/Input';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import { ImportPriceReviewPayload, ImportShipmentResponse } from '../../../api/importShipments.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: ImportPriceReviewPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type ReviewFormValues = {
	items: { itemId: number; adjustedSellingPrice: number | ''; touched: boolean }[];
};

/**
 * Step 3 — Procurement Price Review. Leaving a line's "Adjusted Selling
 * Price" blank keeps the baseline Finance set during costing. Touching even
 * one item routes the whole shipment to Finance for approval instead of
 * approving it outright — see ImportShipmentService.submitPriceReview().
 */
const ImportPriceReviewModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const formik = useFormik<ReviewFormValues>({
		initialValues: {
			items:
				shipment?.items.map((i) => ({
					itemId: i.id,
					adjustedSellingPrice: i.adjustedSellingPrice ?? '',
					touched: i.adjustedSellingPrice != null,
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit({
				items: values.items.map((it) => ({
					itemId: it.itemId,
					adjustedSellingPrice: it.touched && it.adjustedSellingPrice !== '' ? Number(it.adjustedSellingPrice) : null,
				})),
			});
		},
	});

	if (!shipment) return null;

	const anyChanged = formik.values.items.some(
		(it, idx) =>
			it.touched &&
			it.adjustedSellingPrice !== '' &&
			Number(it.adjustedSellingPrice) !== shipment.items[idx]?.baselineSellingPrice,
	);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='importPriceReviewModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importPriceReviewModal'>
					Price Review — {shipment.shipmentNo}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					<Alert color={anyChanged ? 'warning' : 'info'} isLight className='mb-3'>
						{anyChanged
							? 'One or more selling prices differ from the baseline — this will route the shipment to Finance for approval instead of approving it outright.'
							: 'Leave a price blank to keep the baseline Finance set during costing. Submitting with no changes approves the shipment immediately.'}
					</Alert>
					<table className='table table-sm table-bordered align-middle'>
						<thead className='table-light'>
							<tr>
								<th>Item</th>
								<th style={{ width: 90 }}>Qty</th>
								<th style={{ width: 140 }}>Baseline Selling</th>
								<th style={{ width: 160 }}>Adjusted Selling Price</th>
							</tr>
						</thead>
						<tbody>
							{shipment.items.map((item, idx) => (
								<tr key={item.id}>
									<td>{item.productName ?? item.description ?? '—'}</td>
									<td>
										{item.quantity} {item.unit ?? ''}
									</td>
									<td>{formatCurrency(item.baselineSellingPrice)}</td>
									<td>
										<Input
											type='number'
											name={`items.${idx}.adjustedSellingPrice`}
											value={formik.values.items[idx]?.adjustedSellingPrice ?? ''}
											placeholder='No change'
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												const val = e.target.value;
												formik.setFieldValue(`items.${idx}.adjustedSellingPrice`, val === '' ? '' : Number(val));
												formik.setFieldValue(`items.${idx}.touched`, val !== '');
											}}
											min={0}
											step={0.01}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' color='primary' isDisable={isLoading} isLight>
						{isLoading ? 'Submitting...' : 'Submit Price Review'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportPriceReviewModal;

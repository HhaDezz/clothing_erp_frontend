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
import { ImportShipmentResponse, ImportVatPayload } from '../../../api/importShipments.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: ImportVatPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type VatFormValues = {
	vatAmount: number | '';
	items: { itemId: number; finalSellingPrice: number | '' }[];
};

/**
 * Step 8 — Finance VAT and final pricing. vatAmount is a single figure for
 * the whole shipment (customs assesses VAT once, on the landed value);
 * finalSellingPrice is set per item, pre-filled from whatever Procurement
 * last adjusted it to (or the baseline if nothing was adjusted).
 */
const ImportVatModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const formik = useFormik<VatFormValues>({
		initialValues: {
			vatAmount: shipment?.vatAmount ?? '',
			items:
				shipment?.items.map((i) => ({
					itemId: i.id,
					finalSellingPrice:
						i.finalSellingPrice ?? i.adjustedSellingPrice ?? i.baselineSellingPrice,
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit({
				vatAmount: values.vatAmount === '' ? 0 : Number(values.vatAmount),
				items: values.items.map((it) => ({
					itemId: it.itemId,
					finalSellingPrice: it.finalSellingPrice === '' ? 0 : Number(it.finalSellingPrice),
				})),
			});
		},
	});

	if (!shipment) return null;

	const missingPrice = formik.values.items.some((it) => it.finalSellingPrice === '');

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='importVatModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importVatModal'>VAT and Final Pricing — {shipment.shipmentNo}</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					<Alert color='info' isLight className='mb-3'>
						Enter the VAT paid on this shipment (assessed once by customs on the landed value) and
						confirm the final selling price for each item. Submitting sends this shipment to
						Director/Admin for Higher Approval.
					</Alert>

					<div className='mb-3' style={{ maxWidth: 280 }}>
						<label className='form-label fw-bold' htmlFor='vatAmount'>
							VAT Amount (whole shipment)
						</label>
						<Input
							id='vatAmount'
							type='number'
							name='vatAmount'
							value={formik.values.vatAmount}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								const val = e.target.value;
								formik.setFieldValue('vatAmount', val === '' ? '' : Number(val));
							}}
							min={0}
							step={0.01}
						/>
					</div>

					<table className='table table-sm table-bordered align-middle'>
						<thead className='table-light'>
							<tr>
								<th>Item</th>
								<th className='text-end' style={{ width: 110 }}>
									Costing
								</th>
								<th className='text-end' style={{ width: 110 }}>
									Baseline Selling
								</th>
								<th className='text-end' style={{ width: 110 }}>
									Adjusted Selling
								</th>
								<th style={{ width: 160 }}>Final Selling Price</th>
							</tr>
						</thead>
						<tbody>
							{shipment.items.map((item, idx) => (
								<tr key={item.id}>
									<td>{item.productName ?? item.description ?? '—'}</td>
									<td className='text-end'>{formatCurrency(item.costingPrice)}</td>
									<td className='text-end'>{formatCurrency(item.baselineSellingPrice)}</td>
									<td className='text-end'>
										{item.adjustedSellingPrice != null ? (
											<span className='text-warning'>{formatCurrency(item.adjustedSellingPrice)}</span>
										) : (
											<span className='text-muted'>—</span>
										)}
									</td>
									<td>
										<Input
											type='number'
											name={`items.${idx}.finalSellingPrice`}
											value={formik.values.items[idx]?.finalSellingPrice ?? ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												const val = e.target.value;
												formik.setFieldValue(
													`items.${idx}.finalSellingPrice`,
													val === '' ? '' : Number(val),
												);
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
					<Button type='submit' color='primary' isDisable={isLoading || missingPrice} isLight>
						{isLoading ? 'Submitting...' : 'Submit — Send to Higher Approval'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportVatModal;

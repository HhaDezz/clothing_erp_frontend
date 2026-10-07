import React from 'react';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import { ImportCostingPayload, ImportShipmentResponse } from '../../../api/importShipments.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: ImportCostingPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type CostingFormValues = {
	items: { itemId: number; costingPrice: number; baselineSellingPrice: number }[];
};

/**
 * Step 2 — Initial Costing. Finance enters the costing (landed) price and a
 * baseline selling price per line item, then submits: this hands the
 * shipment to Procurement for price review (see ImportShipmentService.submitCosting()).
 * Requires the packing list to already be uploaded — the "Enter Costing"
 * action on the page is gated on that, so this modal assumes it's there.
 */
const ImportCostingModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const formik = useFormik<CostingFormValues>({
		initialValues: {
			items:
				shipment?.items.map((i) => ({
					itemId: i.id,
					costingPrice: i.costingPrice || 0,
					baselineSellingPrice: i.baselineSellingPrice || 0,
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit(values);
		},
	});

	if (!shipment) return null;

	const totalCosting = formik.values.items.reduce((sum, it, idx) => {
		const qty = shipment.items[idx]?.quantity ?? 0;
		return sum + it.costingPrice * qty;
	}, 0);
	const totalSelling = formik.values.items.reduce((sum, it, idx) => {
		const qty = shipment.items[idx]?.quantity ?? 0;
		return sum + it.baselineSellingPrice * qty;
	}, 0);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='importCostingModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importCostingModal'>
					Enter Costing — {shipment.shipmentNo}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					{shipment.packingRefNo && (
						<div className='mb-3'>
							<div className='text-muted small'>Packing List</div>
							<div className='fw-bold font-monospace'>{shipment.packingRefNo}</div>
						</div>
					)}
					<Alert color='info' isLight className='mb-3'>
						Submitting locks the item list and sends this shipment to Procurement for price
						review.
					</Alert>
					<table className='table table-sm table-bordered align-middle'>
						<thead className='table-light'>
							<tr>
								<th>Item</th>
								<th style={{ width: 90 }}>Qty</th>
								<th style={{ width: 160 }}>Costing Price</th>
								<th style={{ width: 160 }}>Baseline Selling Price</th>
							</tr>
						</thead>
						<tbody>
							{shipment.items.map((item, idx) => (
								<tr key={item.id}>
									<td>{item.productName ?? item.description ?? '—'}</td>
									<td>
										{item.quantity} {item.unit ?? ''}
									</td>
									<td>
										<Input
											type='number'
											name={`items.${idx}.costingPrice`}
											value={formik.values.items[idx]?.costingPrice ?? 0}
											onChange={formik.handleChange}
											min={0}
											step={0.01}
										/>
									</td>
									<td>
										<Input
											type='number'
											name={`items.${idx}.baselineSellingPrice`}
											value={formik.values.items[idx]?.baselineSellingPrice ?? 0}
											onChange={formik.handleChange}
											min={0}
											step={0.01}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className='row g-2 mt-2'>
						<div className='col-6'>
							<FormGroup id='totalCosting' label='Total Costing Value'>
								<Input id='totalCosting' value={formatCurrency(totalCosting)} disabled />
							</FormGroup>
						</div>
						<div className='col-6'>
							<FormGroup id='totalSelling' label='Total Selling Value'>
								<Input id='totalSelling' value={formatCurrency(totalSelling)} disabled />
							</FormGroup>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' color='primary' isDisable={isLoading} isLight>
						{isLoading ? 'Submitting...' : 'Submit Costing'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportCostingModal;

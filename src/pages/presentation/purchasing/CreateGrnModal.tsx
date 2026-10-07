import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import {
	createGrnApi,
	GrnPayload,
	getPurchaseOrderByIdApi,
	getPurchaseOrdersApi,
	getWarehousesApi,
} from '../../../api/purchasing.api';
import { useQuery, useMutation } from '@tanstack/react-query';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';

const CreateGrnModal = ({
	isOpen,
	setIsOpen,
	onSuccess,
}: {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSuccess: () => void;
}) => {
	const [selectedPo, setSelectedPo] = useState<any>(null);

	const { data: purchaseOrders } = useQuery({
		queryKey: ['purchaseOrders'],
		queryFn: getPurchaseOrdersApi,
	});

	const { data: warehouses } = useQuery({
		queryKey: ['warehouses'],
		queryFn: getWarehousesApi,
	});

	const availablePos =
		purchaseOrders?.filter((po) => po.status === 'ISSUED' || po.status === 'PARTIAL') || [];

	const createMutation = useMutation({
		mutationFn: createGrnApi,
		onSuccess: () => onSuccess(),
		onError: (error) =>
			showNotification(
				'Unable to create GRN',
				getApiErrorMessage(error, 'The goods received note could not be created.'),
				'danger',
			),
	});

	const formik = useFormik({
		initialValues: {
			poId: '',
			receivedBy: '',
			supplierInvoice: '',
			notes: '',
			items: {} as Record<string, any>, // mapping poItemId to GrnItem fields
		},
		validationSchema: Yup.object({
			poId: Yup.string().required('Purchase Order is required'),
		}),
		onSubmit: (values) => {
			// Extract valid items where receivedQty > 0
			const grnItems = Object.values(values.items)
				.filter((item: any) => item.receivedQty && Number(item.receivedQty) > 0)
				.map((item: any) => ({
					poItemId: Number(item.poItemId),
					warehouseId: Number(item.warehouseId),
					receivedQty: Number(item.receivedQty),
					unitPrice: Number(item.unitPrice),
				}));

			if (grnItems.length === 0) {
				alert('Please enter a received quantity greater than 0 for at least one item.');
				return;
			}

			// Validate warehouse is selected for all received items
			for (const item of grnItems) {
				if (!item.warehouseId) {
					alert('Please select a warehouse for all received items.');
					return;
				}
			}

			createMutation.mutate({
				poId: Number(values.poId),
				receivedBy: values.receivedBy.trim() || undefined,
				supplierInvoice: values.supplierInvoice.trim() || undefined,
				notes: values.notes.trim() || undefined,
				items: grnItems,
			} as GrnPayload);
		},
	});

	const handlePoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const poId = e.target.value;
		formik.setFieldValue('poId', poId);

		if (poId) {
			const po = await getPurchaseOrderByIdApi(Number(poId));
			setSelectedPo(po);

			// Initialize items mapping
			const initialItems: Record<string, any> = {};
			po.items.forEach((item: any) => {
				const remaining = item.orderedQty - item.receivedQty;
				if (remaining > 0) {
					initialItems[item.id] = {
						poItemId: item.id,
						warehouseId: '',
						receivedQty: remaining, // default to full remaining
						unitPrice: item.unitPrice,
						maxQty: remaining,
					};
				}
			});
			formik.setFieldValue('items', initialItems);
		} else {
			setSelectedPo(null);
			formik.setFieldValue('items', {});
		}
	};

	const handleItemChange = (itemId: string, field: string, value: any) => {
		formik.setFieldValue(`items.${itemId}.${field}`, value);
	};

	if (!isOpen) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='new-grn-title'>
						<Icon icon='Inventory' className='me-2 text-primary' />
						Receive Goods (GRN)
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='row g-3 mb-4'>
						<div className='col-md-6'>
							<label className='form-label fw-bold'>Purchase Order *</label>
							<select
								className='form-select'
								name='poId'
								onChange={handlePoChange}
								onBlur={formik.handleBlur}
								value={formik.values.poId}>
								<option value=''>Select PO...</option>
								{availablePos.map((po: any) => (
									<option key={po.id} value={po.id}>
										{po.poNo} - Supplier #{po.supplierId}
									</option>
								))}
							</select>
							{formik.touched.poId && formik.errors.poId && (
								<div className='text-danger small mt-1'>
									{formik.errors.poId as string}
								</div>
							)}
						</div>

						<div className='col-md-6'>
							<label className='form-label fw-bold'>Supplier Invoice #</label>
							<input
								type='text'
								className='form-control'
								name='supplierInvoice'
								onChange={formik.handleChange}
								value={formik.values.supplierInvoice}
							/>
							{formik.touched.supplierInvoice && formik.errors.supplierInvoice && (
								<div className='text-danger small mt-1'>
									{formik.errors.supplierInvoice as string}
								</div>
							)}
						</div>

						<div className='col-md-6'>
							<label className='form-label'>Received By</label>
							<input
								type='text'
								className='form-control'
								name='receivedBy'
								onChange={formik.handleChange}
								value={formik.values.receivedBy}
							/>
						</div>

						<div className='col-md-6'>
							<label className='form-label'>Notes</label>
							<input
								type='text'
								className='form-control'
								name='notes'
								onChange={formik.handleChange}
								value={formik.values.notes}
							/>
						</div>
					</div>

					{selectedPo && (
						<>
							<h6 className='fw-bold mb-3'>Items Pending Receipt</h6>
							{Object.keys(formik.values.items).length === 0 ? (
								<div className='alert alert-info'>
									All items for this PO have already been fully received.
								</div>
							) : (
								<div className='table-responsive'>
									<table className='table table-bordered align-middle'>
										<thead className='table-light'>
											<tr>
												<th>Material / Item</th>
												<th>Ordered</th>
												<th>Pending</th>
												<th style={{ width: '200px' }}>Warehouse *</th>
												<th style={{ width: '150px' }}>Received Qty *</th>
											</tr>
										</thead>
										<tbody>
											{Object.keys(formik.values.items).map((itemId) => {
												const itemData = formik.values.items[itemId];
												const poItem = selectedPo.items.find(
													(i: any) => i.id === Number(itemId),
												);
												return (
													<tr key={itemId}>
														<td>Material #{poItem.materialId}</td>
														<td>{poItem.orderedQty}</td>
														<td className='text-danger fw-bold'>
															{itemData.maxQty}
														</td>
														<td>
															<select
																className='form-select form-select-sm'
																value={itemData.warehouseId}
																onChange={(e) =>
																	handleItemChange(
																		itemId,
																		'warehouseId',
																		e.target.value,
																	)
																}>
																<option value=''>
																	Select Warehouse...
																</option>
																{warehouses?.map((w: any) => (
																	<option key={w.id} value={w.id}>
																		{w.name}
																	</option>
																))}
															</select>
														</td>
														<td>
															<input
																type='number'
																className='form-control form-control-sm'
																value={itemData.receivedQty}
																min='0'
																max={itemData.maxQty} // Prevent over-receiving in UI
																step='0.01'
																onChange={(e) =>
																	handleItemChange(
																		itemId,
																		'receivedQty',
																		e.target.value,
																	)
																}
															/>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}
				</ModalBody>
				<ModalFooter>
					<Button
						color='light'
						onClick={() => setIsOpen(false)}
						isDisable={createMutation.isPending}
						type='button'>
						Cancel
					</Button>
					<Button
						color='primary'
						type='submit'
						isDisable={
							createMutation.isPending ||
							!selectedPo ||
							Object.keys(formik.values.items).length === 0
						}>
						{createMutation.isPending ? 'Saving...' : 'Save GRN'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreateGrnModal;

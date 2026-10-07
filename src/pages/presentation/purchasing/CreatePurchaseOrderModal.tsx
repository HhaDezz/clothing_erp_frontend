import React from 'react';
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
import { createPurchaseOrderApi, PurchaseOrderPayload } from '../../../api/purchasing.api';
import { getSuppliersApi } from '../../../api/purchasing.api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMaterialsApi } from '../../../api/materials.api';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';

const CreatePurchaseOrderModal = ({
	isOpen,
	setIsOpen,
	onSuccess,
}: {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSuccess: () => void;
}) => {
	const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliersApi });
	const { data: materials } = useQuery({
		queryKey: ['materials'],
		queryFn: getMaterialsApi,
	});

	const createMutation = useMutation({
		mutationFn: createPurchaseOrderApi,
		onSuccess: () => onSuccess(),
		onError: (error) =>
			showNotification(
				'Unable to create purchase order',
				getApiErrorMessage(error, 'The purchase order could not be created.'),
				'danger',
			),
	});

	const formik = useFormik({
		initialValues: {
			supplierId: '',
			expectedDate: '',
			notes: '',
			items: [] as any[],
		},
		validationSchema: Yup.object({
			supplierId: Yup.string().required('Supplier is required'),
			items: Yup.array()
				.of(
					Yup.object({
						materialId: Yup.number().required('Material is required'),
						orderedQty: Yup.number()
							.moreThan(0, 'Quantity must be greater than 0')
							.required(),
						unitPrice: Yup.number().min(0, 'Price cannot be negative').required(),
					}),
				)
				.min(1, 'Add at least one item'),
		}),
		onSubmit: (values) => {
			createMutation.mutate({
				supplierId: Number(values.supplierId),
				expectedDate: values.expectedDate || undefined,
				notes: values.notes.trim() || undefined,
				items: values.items.map((i) => ({
					materialId: Number(i.materialId),
					orderedQty: Number(i.orderedQty),
					unitPrice: Number(i.unitPrice),
				})),
			} as PurchaseOrderPayload);
		},
	});

	const handleAddItem = () => {
		formik.setFieldValue('items', [
			...formik.values.items,
			{ materialId: '', orderedQty: 1, unitPrice: 0 },
		]);
	};

	const handleRemoveItem = (index: number) => {
		const newItems = [...formik.values.items];
		newItems.splice(index, 1);
		formik.setFieldValue('items', newItems);
	};

	const handleItemChange = (index: number, field: string, value: any) => {
		const newItems = [...formik.values.items];
		newItems[index][field] = value;
		formik.setFieldValue('items', newItems);
	};

	if (!isOpen) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='new-po-title'>
						<Icon icon='AddShoppingCart' className='me-2 text-primary' />
						New Purchase Order
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='row g-3 mb-4'>
						<div className='col-md-6'>
							<label className='form-label fw-bold'>Supplier *</label>
							<select
								className='form-select'
								name='supplierId'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.supplierId}>
								<option value=''>Select Supplier...</option>
								{suppliers
									?.filter((s: any) => s.status === 'ACTIVE')
									.map((s: any) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
							</select>
							{formik.touched.supplierId && formik.errors.supplierId && (
								<div className='text-danger small mt-1'>
									{formik.errors.supplierId as string}
								</div>
							)}
						</div>

						<div className='col-md-6'>
							<label className='form-label fw-bold'>Expected Date</label>
							<input
								type='date'
								className='form-control'
								name='expectedDate'
								onChange={formik.handleChange}
								value={formik.values.expectedDate}
							/>
						</div>

						<div className='col-md-12'>
							<label className='form-label fw-bold'>Notes</label>
							<textarea
								className='form-control'
								name='notes'
								rows={2}
								onChange={formik.handleChange}
								value={formik.values.notes}
							/>
						</div>
					</div>

					<div className='d-flex justify-content-between align-items-center mb-3'>
						<h6 className='fw-bold mb-0'>Order Items</h6>
						<Button
							color='info'
							isLight
							size='sm'
							icon='Add'
							onClick={handleAddItem}
							type='button'>
							Add Item
						</Button>
					</div>

					{typeof formik.errors.items === 'string' && (
						<div className='alert alert-danger py-2 mb-3'>{formik.errors.items}</div>
					)}

					<table className='table table-bordered'>
						<thead className='table-light'>
							<tr>
								<th>Material</th>
								<th style={{ width: '150px' }}>Quantity</th>
								<th style={{ width: '150px' }}>Unit Price</th>
								<th style={{ width: '150px' }}>Total</th>
								<th style={{ width: '60px' }} />
							</tr>
						</thead>
						<tbody>
							{formik.values.items.length === 0 ? (
								<tr>
									<td colSpan={5} className='text-center py-4 text-muted'>
										No items added. Click "Add Item".
									</td>
								</tr>
							) : (
								formik.values.items.map((item, idx) => (
									<tr key={idx}>
										<td>
											<select
												className='form-select'
												value={item.materialId}
												onChange={(e) =>
													handleItemChange(
														idx,
														'materialId',
														e.target.value,
													)
												}
												required>
												<option value=''>Select Material...</option>
												{materials?.map((m: any) => (
													<option key={m.id} value={m.id}>
														{m.materialCode} - {m.name}
													</option>
												))}
											</select>
										</td>
										<td>
											<input
												type='number'
												className='form-control'
												value={item.orderedQty}
												min='1'
												onChange={(e) =>
													handleItemChange(
														idx,
														'orderedQty',
														e.target.value,
													)
												}
												required
											/>
										</td>
										<td>
											<input
												type='number'
												className='form-control'
												value={item.unitPrice}
												min='0'
												step='0.01'
												onChange={(e) =>
													handleItemChange(
														idx,
														'unitPrice',
														e.target.value,
													)
												}
												required
											/>
										</td>
										<td className='align-middle fw-bold'>
											{formatCurrency(
												Number(item.orderedQty || 0) *
													Number(item.unitPrice || 0),
											)}
										</td>
										<td className='text-center align-middle'>
											<button
												type='button'
												className='btn btn-sm btn-danger'
												onClick={() => handleRemoveItem(idx)}>
												<i className='ti ti-trash' />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</ModalBody>
				<ModalFooter>
					<Button
						color='light'
						onClick={() => setIsOpen(false)}
						isDisable={createMutation.isPending}
						type='button'>
						Cancel
					</Button>
					<Button color='primary' type='submit' isDisable={createMutation.isPending}>
						{createMutation.isPending ? 'Saving...' : 'Create Order'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreatePurchaseOrderModal;

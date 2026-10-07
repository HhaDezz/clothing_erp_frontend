import React, { useMemo } from 'react';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import { useQuery, useQueries } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import Button from '../../../components/bootstrap/Button';
import Label from '../../../components/bootstrap/forms/Label';
import Alert from '../../../components/bootstrap/Alert';
import VariantSearchSelect from '../../../components/common/VariantSearchSelect';
import { useProducts } from '../../../hooks/useProducts';
import { useAllVariants } from '../../../hooks/useVariants';
import { getWarehousesApi } from '../../../api/warehouses.api';
import { getStockLevelApi } from '../../../api/inventory.api';
import { GoodsTransferApprovalPayload, GoodsTransferRequest } from '../../../api/goodsTransfer.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	request: GoodsTransferRequest | null;
	onApprove: (id: number, payload: GoodsTransferApprovalPayload) => void;
	onReject: (id: number, reason: string) => void;
	isLoading: boolean;
}

type AllocationValue = { warehouseId: number | ''; quantity: number | '' };
type LineValue = { variantId: number | null; allocations: AllocationValue[] };

type FormValues = {
	items: LineValue[];
	rejectionReason: string;
};

const stockKey = (variantId: number, warehouseId: number) => `${variantId}-${warehouseId}`;

/**
 * Step 2 — "SL Operations can see notification and they do modifications
 * if need and approve", now also "user can assign warehouses (can assign
 * multiple warehouses)" — a single item's approved quantity can be split
 * across several source warehouses (e.g. 20 pcs as 10 from Warehouse 1 + 10
 * from Warehouse 2). Each warehouse's live current stock is looked up as
 * Ops types (polling every 15s) so overshooting what a warehouse actually
 * has is caught here — the backend hard-blocks it too, so this is a
 * best-effort live warning, not the enforcement itself.
 */
const GoodsTransferApprovalModal: React.FC<Props> = ({
	isOpen,
	setIsOpen,
	request,
	onApprove,
	onReject,
	isLoading,
}) => {
	const { data: products } = useProducts();
	const { data: variants } = useAllVariants();
	const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehousesApi });

	const formik = useFormik<FormValues>({
		initialValues: {
			items:
				request?.items.map((i) => ({
					variantId: i.variantId,
					allocations: [{ warehouseId: '' as const, quantity: i.requestedQty }],
				})) ?? [],
			rejectionReason: '',
		},
		enableReinitialize: true,
		onSubmit: () => {
			// Submission is driven by the explicit Approve/Reject buttons below,
			// not a single "submit" action — see the footer.
		},
	});

	// Every distinct (variant, warehouse) pair currently on the form, so we
	// fetch each one's live stock exactly once regardless of how many rows
	// reference it.
	const allocationPairs = useMemo(() => {
		const seen = new Set<string>();
		const pairs: { variantId: number; warehouseId: number }[] = [];
		formik.values.items.forEach((item) => {
			if (item.variantId == null) return;
			item.allocations.forEach((a) => {
				if (a.warehouseId === '') return;
				const key = stockKey(item.variantId as number, Number(a.warehouseId));
				if (seen.has(key)) return;
				seen.add(key);
				pairs.push({ variantId: item.variantId as number, warehouseId: Number(a.warehouseId) });
			});
		});
		return pairs;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formik.values.items]);

	const stockQueries = useQueries({
		queries: allocationPairs.map((p) => ({
			queryKey: ['stockLevel', 'VARIANT', p.variantId, p.warehouseId],
			queryFn: () => getStockLevelApi('VARIANT', p.variantId, p.warehouseId),
			enabled: isOpen,
			refetchInterval: isOpen ? 15000 : false,
			staleTime: 5000,
		})),
	});

	// Recomputed every render (cheap — at most a handful of rows) rather than
	// memoized, since memoizing on the query results array would need a
	// deep-equality key anyway.
	const stockByKey = new Map<string, number>();
	allocationPairs.forEach((p, idx) => {
		const data = stockQueries[idx]?.data as { currentQty?: number } | undefined;
		if (data?.currentQty !== undefined) stockByKey.set(stockKey(p.variantId, p.warehouseId), Number(data.currentQty));
	});

	const allItemsValid =
		formik.values.items.length > 0 &&
		formik.values.items.every(
			(item) =>
				item.variantId != null &&
				item.allocations.some((a) => a.warehouseId !== '' && Number(a.quantity) > 0),
		);

	// Rows that name the same warehouse for the same item are one allocation
	// as far as stock is concerned: 5 + 5 from Main Warehouse needs 10 there.
	const warehouseTotal = (item: LineValue, warehouseId: number) =>
		item.allocations
			.filter((a) => a.warehouseId !== '' && Number(a.warehouseId) === warehouseId)
			.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

	const hasOverAllocation = formik.values.items.some((item) =>
		item.allocations.some((a) => {
			if (item.variantId == null || a.warehouseId === '') return false;
			const available = stockByKey.get(stockKey(item.variantId, Number(a.warehouseId)));
			return available !== undefined && warehouseTotal(item, Number(a.warehouseId)) > available;
		}),
	);

	if (!request) return null;

	const handleApprove = () => {
		const items = formik.values.items
			.filter((i) => i.variantId != null)
			.map((i) => {
				// The same warehouse picked on two rows is sent as ONE
				// allocation with the quantities added together.
				const byWarehouse = new Map<number, number>();
				i.allocations.forEach((a) => {
					if (a.warehouseId === '' || !(Number(a.quantity) > 0)) return;
					const id = Number(a.warehouseId);
					byWarehouse.set(id, (byWarehouse.get(id) ?? 0) + Number(a.quantity));
				});
				return {
					variantId: i.variantId as number,
					allocations: Array.from(byWarehouse.entries()).map(([warehouseId, quantity]) => ({
						warehouseId,
						quantity,
					})),
				};
			})
			.filter((i) => i.allocations.length > 0);
		if (items.length === 0) return;
		onApprove(request.id, { items });
	};

	const handleReject = () => {
		if (!formik.values.rejectionReason.trim()) return;
		onReject(request.id, formik.values.rejectionReason.trim());
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isScrollable isCentered titleId='goodsTransferApprovalModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='goodsTransferApprovalModal'>
					Review Request {request.requestNo} — {request.showroomName}
				</ModalTitle>
			</ModalHeader>
			<ModalBody style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
				{request.notes && (
					<Alert color='info' isLight className='mb-3'>
						<strong>Showroom note:</strong> {request.notes}
					</Alert>
				)}

				{hasOverAllocation && (
					<Alert color='danger' isLight className='mb-3'>
						One or more warehouses don&apos;t have enough stock for the quantity assigned to them —
						reduce it or pick a different warehouse before approving.
					</Alert>
				)}

				<FormikProvider value={formik}>
					<FieldArray name='items'>
						{({ push, remove }) => (
							<>
								<div className='d-flex justify-content-between align-items-center mb-3'>
									<Label className='fs-5 fw-bold mb-0'>Items</Label>
									<Button
										color='primary'
										isLight
										icon='Add'
										onClick={() => push({ variantId: null, allocations: [{ warehouseId: '', quantity: '' }] })}>
										Add Item
									</Button>
								</div>

								{formik.values.items.map((item, idx) => {
									const requestedQty = request.items[idx]?.requestedQty;
									const totalAllocated = item.allocations.reduce(
										(sum, a) => sum + (Number(a.quantity) || 0),
										0,
									);
									return (
										// eslint-disable-next-line react/no-array-index-key
										<div key={idx} className='card border shadow-sm mb-3'>
											<div className='card-body p-3'>
												<div className='row g-3 align-items-end mb-2'>
													<div className='col-12 col-md-9'>
														<FormGroup id={`items.${idx}.variantId`} label='Variant / SKU'>
															<VariantSearchSelect
																id={`items.${idx}.variantId`}
																name={`items.${idx}.variantId`}
																ariaLabel='Variant'
																imageSize={44}
																value={item.variantId ?? null}
																variants={variants}
																products={products}
																onChange={(variantId) =>
																	formik.setFieldValue(`items.${idx}.variantId`, variantId)
																}
															/>
														</FormGroup>
													</div>
													<div className='col-8 col-md-2'>
														{requestedQty !== undefined && (
															<div className='small text-muted'>Requested: {requestedQty}</div>
														)}
													</div>
													<div className='col-4 col-md-1 text-end'>
														<Button color='danger' isLight icon='Delete' onClick={() => remove(idx)} />
													</div>
												</div>

												<FieldArray name={`items.${idx}.allocations`}>
													{({ push: pushAlloc, remove: removeAlloc }) => (
														<div className='border rounded p-2 bg-light bg-opacity-50'>
															<div className='d-flex justify-content-between align-items-center mb-2'>
																<Label className='small fw-bold text-muted mb-0'>
																	Warehouse Allocation
																</Label>
																<Button
																	size='sm'
																	color='primary'
																	isLight
																	icon='Add'
																	onClick={() => pushAlloc({ warehouseId: '', quantity: '' })}>
																	Add Warehouse
																</Button>
															</div>

															{item.allocations.map((alloc, aIdx) => {
																const available =
																	item.variantId != null && alloc.warehouseId !== ''
																		? stockByKey.get(
																				stockKey(item.variantId, Number(alloc.warehouseId)),
																			)
																		: undefined;
																const over =
																	available !== undefined && Number(alloc.quantity) > available;
																return (
																	// eslint-disable-next-line react/no-array-index-key
																	<div key={aIdx} className='row g-2 align-items-center mb-2'>
																		<div className='col-12 col-md-5'>
																			<Select
																				name={`items.${idx}.allocations.${aIdx}.warehouseId`}
																				value={alloc.warehouseId}
																				onChange={formik.handleChange}
																				ariaLabel='Warehouse'>
																				<option value=''>Select warehouse...</option>
																				{warehouses.map((w) => (
																					<option key={w.id} value={w.id}>
																						{w.name}
																					</option>
																				))}
																			</Select>
																		</div>
																		<div className='col-6 col-md-3'>
																			<Input
																				type='number'
																				name={`items.${idx}.allocations.${aIdx}.quantity`}
																				value={alloc.quantity}
																				onChange={formik.handleChange}
																				min={0}
																				isValid={!over}
																				isTouched={over}
																				invalidFeedback='Exceeds available stock'
																			/>
																		</div>
																		<div className='col-4 col-md-3'>
																			{alloc.warehouseId !== '' && item.variantId != null && (
																				<span
																					className={`small ${
																						over ? 'text-danger fw-bold' : 'text-muted'
																					}`}>
																					Available: {available === undefined ? '…' : available}
																				</span>
																			)}
																		</div>
																		<div className='col-2 col-md-1 text-end'>
																			<Button
																				size='sm'
																				color='danger'
																				isLight
																				icon='Delete'
																				isDisable={item.allocations.length === 1}
																				onClick={() => removeAlloc(aIdx)}
																			/>
																		</div>
																	</div>
																);
															})}

															<div className='small mt-1'>
																<span
																	className={
																		requestedQty !== undefined && totalAllocated !== requestedQty
																			? 'text-warning fw-semibold'
																			: 'text-muted'
																	}>
																	Total allocated: {totalAllocated}
																	{requestedQty !== undefined ? ` (requested ${requestedQty})` : ''}
																</span>
															</div>
														</div>
													)}
												</FieldArray>
											</div>
										</div>
									);
								})}
							</>
						)}
					</FieldArray>
				</FormikProvider>

				<hr className='my-4' />

				<FormGroup id='rejectionReason' label='Rejection reason (only needed if rejecting)'>
					<Input
						name='rejectionReason'
						value={formik.values.rejectionReason}
						onChange={formik.handleChange}
						placeholder='e.g. Out of stock for the season'
					/>
				</FormGroup>
			</ModalBody>
			<ModalFooter className='d-flex justify-content-between'>
				<Button
					color='danger'
					isLight
					icon='Cancel'
					isDisable={isLoading || !formik.values.rejectionReason.trim()}
					onClick={handleReject}>
					Reject
				</Button>
				<div className='d-flex gap-2'>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button
						color='primary'
						isLight
						isDisable={isLoading || !allItemsValid || hasOverAllocation}
						onClick={handleApprove}>
						{isLoading ? 'Saving...' : 'Approve Request'}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default GoodsTransferApprovalModal;

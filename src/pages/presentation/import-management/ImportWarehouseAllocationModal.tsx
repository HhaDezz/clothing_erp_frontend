import React from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import Option from '../../../components/bootstrap/Option';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import Spinner from '../../../components/bootstrap/Spinner';
import { getWarehousesApi } from '../../../api/warehouses.api';
import {
	getImportWarehouseAllocationsApi,
	ImportShipmentResponse,
	ImportWarehouseAllocationPayload,
} from '../../../api/importShipments.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: ImportWarehouseAllocationPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type AllocationLineValues = {
	warehouseId: number | '';
	quantity: number | '';
};

type AllocationItemValues = {
	itemId: number;
	lines: AllocationLineValues[];
};

type AllocationFormValues = {
	items: AllocationItemValues[];
};

const toNum = (v: number | '') => (v === '' ? 0 : Number(v));

/**
 * "After Draft Intake we have to select warehouse that items to be
 * delivered — same import shipment can have multiple warehouses like
 * shipment have 100 items 30 goes to warehouse 1 70 goes to warehouse 2 —
 * this option can be edited anytime before GRN process."
 *
 * Per line item, split its quantity across one or more warehouses. Backend
 * enforces the "before GRN" cutoff (ImportShipmentService
 * #updateWarehouseAllocations) — this modal is simply not offered as an
 * action once a shipment has a GRN (see the calling pages).
 */
const ImportWarehouseAllocationModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const { data: warehouses = [] } = useQuery({
		queryKey: ['warehouses'],
		queryFn: getWarehousesApi,
		enabled: isOpen,
	});

	const shipmentId = shipment?.id ?? null;
	const { data: existingAllocations = [], isLoading: isLoadingAllocations } = useQuery({
		queryKey: ['importShipmentWarehouseAllocations', shipmentId],
		queryFn: () => getImportWarehouseAllocationsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});

	const formik = useFormik<AllocationFormValues>({
		initialValues: {
			items:
				shipment?.items.map((item) => {
					const lines = existingAllocations
						.filter((a) => a.shipmentItemId === item.id)
						.sort((a, b) => a.lineNo - b.lineNo)
						.map((a) => ({ warehouseId: a.warehouseId ?? '', quantity: a.quantity }));
					return { itemId: item.id, lines };
				}) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit({
				items: values.items.map((it) => ({
					itemId: it.itemId,
					allocations: it.lines
						.filter((l) => l.warehouseId !== '' && toNum(l.quantity) > 0)
						.map((l) => ({ warehouseId: Number(l.warehouseId), quantity: toNum(l.quantity) })),
				})),
			});
		},
	});

	if (!shipment) return null;

	const addLine = (itemIdx: number) => {
		const current = formik.values.items[itemIdx]?.lines ?? [];
		formik.setFieldValue(`items.${itemIdx}.lines`, [...current, { warehouseId: '', quantity: '' }]);
	};

	const removeLine = (itemIdx: number, lineIdx: number) => {
		const current = formik.values.items[itemIdx]?.lines ?? [];
		formik.setFieldValue(
			`items.${itemIdx}.lines`,
			current.filter((_, i) => i !== lineIdx),
		);
	};

	const allocatedFor = (itemIdx: number) =>
		(formik.values.items[itemIdx]?.lines ?? []).reduce((sum, l) => sum + toNum(l.quantity), 0);

	const hasIncompleteLine = formik.values.items.some((it) =>
		it.lines.some((l) => (toNum(l.quantity) > 0 && l.warehouseId === '') || (l.warehouseId !== '' && toNum(l.quantity) <= 0)),
	);

	const hasOverAllocated = shipment.items.some((item, idx) => allocatedFor(idx) > item.quantity);

	const canSubmit = !hasIncompleteLine && !hasOverAllocated && !isLoadingAllocations;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='importWarehouseAllocationModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importWarehouseAllocationModal'>
					Warehouse Allocation — {shipment.shipmentNo}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					{isLoadingAllocations ? (
						<div className='d-flex justify-content-center py-4'>
							<Spinner />
						</div>
					) : (
						<>
							<Alert color={hasOverAllocated ? 'danger' : hasIncompleteLine ? 'warning' : 'info'} isLight className='mb-3'>
								{hasOverAllocated
									? 'Allocated quantity cannot exceed a line item\'s total quantity.'
									: hasIncompleteLine
										? 'Every allocation line needs both a warehouse and a quantity.'
										: 'Split each item\'s delivery across one or more warehouses. Leave an item unallocated to keep it visible to everyone until a decision is made. Editable any time before the GRN is generated.'}
							</Alert>
							<table className='table table-sm table-bordered align-middle'>
								<thead className='table-light'>
									<tr>
										<th style={{ width: '22%' }}>Item</th>
										<th style={{ width: 90 }}>Qty</th>
										<th>Warehouse allocation</th>
									</tr>
								</thead>
								<tbody>
									{shipment.items.map((item, idx) => {
										const lines = formik.values.items[idx]?.lines ?? [];
										const allocated = allocatedFor(idx);
										const overAllocated = allocated > item.quantity;
										return (
											<tr key={item.id}>
												<td>
													{item.productName ?? item.description ?? '—'}
													{item.variantSku && <div className='small text-muted'>SKU: {item.variantSku}</div>}
												</td>
												<td>
													{item.quantity} {item.unit ?? ''}
												</td>
												<td>
													{lines.length === 0 && (
														<div className='small text-muted mb-2'>Not yet split — visible to everyone.</div>
													)}
													{lines.map((line, lineIdx) => {
														const lineIncomplete =
															(toNum(line.quantity) > 0 && line.warehouseId === '') ||
															(line.warehouseId !== '' && toNum(line.quantity) <= 0);
														return (
															<div key={lineIdx} className='d-flex align-items-center gap-2 mb-2'>
																<Select
																	ariaLabel='Warehouse'
																	placeholder='Select a warehouse'
																	name={`items.${idx}.lines.${lineIdx}.warehouseId`}
																	value={line.warehouseId?.toString() ?? ''}
																	onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
																		const val = e.target.value;
																		formik.setFieldValue(
																			`items.${idx}.lines.${lineIdx}.warehouseId`,
																			val === '' ? '' : Number(val),
																		);
																	}}
																	isValid={!lineIncomplete}
																	isTouched={lineIncomplete}
																	invalidFeedback='Required'
																	style={{ minWidth: 180 }}>
																	{warehouses.map((w) => (
																		<Option key={w.id} value={w.id.toString()}>
																			{w.name}
																		</Option>
																	))}
																</Select>
																<Input
																	type='number'
																	ariaLabel='Quantity'
																	name={`items.${idx}.lines.${lineIdx}.quantity`}
																	value={line.quantity ?? ''}
																	onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
																		const val = e.target.value;
																		formik.setFieldValue(
																			`items.${idx}.lines.${lineIdx}.quantity`,
																			val === '' ? '' : Number(val),
																		);
																	}}
																	min={0}
																	step={0.01}
																	style={{ width: 100 }}
																/>
																<Button
																	type='button'
																	color='danger'
																	isLight
																	icon='Delete'
																	size='sm'
																	onClick={() => removeLine(idx, lineIdx)}
																/>
															</div>
														);
													})}
													<Button type='button' color='primary' isLight size='sm' icon='Add' onClick={() => addLine(idx)}>
														Add warehouse
													</Button>
													{lines.length > 0 && (
														<div className={`small mt-2 ${overAllocated ? 'text-danger fw-bold' : 'text-muted'}`}>
															Allocated: {allocated} / {item.quantity}
														</div>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</>
					)}
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' color='primary' isDisable={isLoading || !canSubmit} isLight>
						{isLoading ? 'Saving...' : 'Save Allocation'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportWarehouseAllocationModal;

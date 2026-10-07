import React, { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Input from '../../../components/bootstrap/forms/Input';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import Spinner from '../../../components/bootstrap/Spinner';
import Nav, { NavItem } from '../../../components/bootstrap/Nav';
import Tooltips from '../../../components/bootstrap/Tooltips';
import Icon from '../../../components/icon/Icon';
import { usePermission } from '../../../hooks/usePermission';
import {
	getImportWarehouseLegsApi,
	ImportLegReceivingPayload,
	ImportShipmentResponse,
} from '../../../api/importShipments.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (warehouseId: number, payload: ImportLegReceivingPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type ReceivingFormValues = {
	items: { allocationId: number; receivedQty: number | '' }[];
	deliveryConfirmationNote: string;
};

/**
 * Step 5 — Bay 1 receiving, per warehouse leg, one tab per warehouse still
 * awaiting receiving. "user 1 can accept only 50" — each item's received
 * qty is capped to THIS warehouse's own planned allocation, not the item's
 * full shipment quantity.
 * <p>
 * Only warehouses the caller is assigned to can be switched to — a
 * warehouse-restricted user sees every pending warehouse's tab (so they
 * know other work is in flight) but can only click into their own; SUPER_ADMIN
 * and a user with no warehouse assigned at all can switch to any of them.
 * This mirrors the backend's own authorization rule
 * (ImportShipmentService#assertWarehouseActionAllowed) — this is a UX
 * shortcut, not the enforcement itself, which the server still applies
 * regardless.
 */
const ImportReceivingModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const { canActOnWarehouse, isSuperAdmin } = usePermission();

	const shipmentId = shipment?.id ?? null;
	const { data: legs = [], isLoading: legsLoading } = useQuery({
		queryKey: ['importShipmentWarehouseLegs', shipmentId],
		queryFn: () => getImportWarehouseLegsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});

	const pendingLegs = useMemo(() => legs.filter((l) => l.legStage === 'PENDING_RECEIVING'), [legs]);
	const switchableLegs = useMemo(
		() => pendingLegs.filter((l) => canActOnWarehouse(l.warehouseId)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pendingLegs],
	);

	const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

	useEffect(() => {
		if (!isOpen) {
			setSelectedWarehouseId(null);
			return;
		}
		const stillSwitchable = switchableLegs.some((l) => l.warehouseId === selectedWarehouseId);
		if (!stillSwitchable) {
			setSelectedWarehouseId(switchableLegs[0]?.warehouseId ?? null);
		}
	}, [isOpen, switchableLegs, selectedWarehouseId]);

	const selectedLeg = pendingLegs.find((l) => l.warehouseId === selectedWarehouseId) ?? null;

	const formik = useFormik<ReceivingFormValues>({
		initialValues: {
			items:
				selectedLeg?.items.map((i) => ({
					allocationId: i.allocationId,
					receivedQty: i.plannedQty,
				})) ?? [],
			deliveryConfirmationNote: '',
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			if (!selectedWarehouseId) return;
			onSubmit(selectedWarehouseId, {
				items: values.items.map((it) => ({
					allocationId: it.allocationId,
					receivedQty: it.receivedQty === '' ? 0 : Number(it.receivedQty),
				})),
				deliveryConfirmationNote: values.deliveryConfirmationNote || undefined,
			});
		},
	});

	if (!shipment) return null;

	const anyOverPlanned = selectedLeg
		? formik.values.items.some((it, idx) => {
				const planned = selectedLeg.items[idx]?.plannedQty ?? 0;
				return it.receivedQty !== '' && Number(it.receivedQty) > planned;
			})
		: false;

	const anyShort = selectedLeg
		? formik.values.items.some((it, idx) => {
				const planned = selectedLeg.items[idx]?.plannedQty ?? 0;
				return it.receivedQty !== '' && Number(it.receivedQty) !== planned;
			})
		: false;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='importReceivingModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importReceivingModal'>Receive at Bay 1 — {shipment.shipmentNo}</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					{legsLoading ? (
						<div className='text-center py-4'>
							<Spinner />
						</div>
					) : pendingLegs.length === 0 ? (
						<Alert color='info' isLight>
							Every warehouse allocated to this shipment has already been received.
						</Alert>
					) : (
						<>
							{pendingLegs.length > 1 && (
								<Nav design='tabs' className='mb-3'>
									{pendingLegs.map((leg) => {
										const canSwitch = canActOnWarehouse(leg.warehouseId);
										const label = (
											<span
												onClick={() => {
													if (canSwitch) setSelectedWarehouseId(leg.warehouseId);
												}}>
												{!canSwitch && <Icon icon='Lock' size='sm' className='me-1' />}
												{leg.warehouseName ?? `Warehouse ${leg.warehouseId}`}
											</span>
										);
										return (
											<NavItem
												key={leg.warehouseId}
												isActive={selectedWarehouseId === leg.warehouseId}
												isDisable={!canSwitch}>
												{canSwitch ? (
													label
												) : (
													<Tooltips title="Not your assigned warehouse — you can only receive your own warehouse's stock.">
														{label}
													</Tooltips>
												)}
											</NavItem>
										);
									})}
								</Nav>
							)}

							{!isSuperAdmin && switchableLegs.length === 0 ? (
								<Alert color='warning' isLight className='mb-3'>
									None of the warehouses still awaiting receiving on this shipment are assigned to
									you.
								</Alert>
							) : (
								<Alert color={anyOverPlanned ? 'danger' : anyShort ? 'warning' : 'info'} isLight className='mb-3'>
									{anyOverPlanned
										? "One or more received quantities exceed this warehouse's allocated amount — reduce them before submitting."
										: anyShort
											? "One or more received quantities differ from this warehouse's allocated amount — recorded as-is."
											: "Received quantity defaults to this warehouse's allocated amount. Adjust any line that arrived short or over — it can never exceed the planned allocation."}
								</Alert>
							)}

							{selectedLeg && (
								<>
									<table className='table table-sm table-bordered align-middle'>
										<thead className='table-light'>
											<tr>
												<th>Item</th>
												<th style={{ width: 130 }}>Allocated Qty</th>
												<th style={{ width: 140 }}>Received Qty</th>
											</tr>
										</thead>
										<tbody>
											{selectedLeg.items.map((item, idx) => {
												const value = formik.values.items[idx]?.receivedQty ?? '';
												const over = value !== '' && Number(value) > item.plannedQty;
												return (
													<tr key={item.allocationId}>
														<td>
															{item.productName ?? item.description ?? '—'}
															{item.sku && <div className='small text-muted'>SKU: {item.sku}</div>}
														</td>
														<td>{item.plannedQty}</td>
														<td>
															<Input
																type='number'
																name={`items.${idx}.receivedQty`}
																value={value}
																onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
																	const val = e.target.value;
																	formik.setFieldValue(`items.${idx}.receivedQty`, val === '' ? '' : Number(val));
																}}
																isValid={!over}
																isTouched={over}
																invalidFeedback='Exceeds allocated qty'
																min={0}
																max={item.plannedQty}
																step={0.01}
															/>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>

									<FormGroup id='deliveryConfirmationNote' label='Freight Forwarder Delivery Confirmation'>
										<Textarea
											name='deliveryConfirmationNote'
											value={formik.values.deliveryConfirmationNote}
											onChange={formik.handleChange}
											placeholder='e.g. Delivered by ABC Freight, driver signed off, 3 cartons, no visible damage…'
											rows={3}
										/>
									</FormGroup>
								</>
							)}
						</>
					)}
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button
						type='submit'
						color='primary'
						isDisable={isLoading || !selectedLeg || anyOverPlanned}
						isLight>
						{isLoading ? 'Submitting...' : 'Confirm Receipt'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportReceivingModal;

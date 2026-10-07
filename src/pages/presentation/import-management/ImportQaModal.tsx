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
import Select from '../../../components/bootstrap/forms/Select';
import Option from '../../../components/bootstrap/Option';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Spinner from '../../../components/bootstrap/Spinner';
import { getDefectiveReasonsApi } from '../../../api/defectiveReasons.api';
import {
	getImportWarehouseLegsApi,
	ImportLegQaPayload,
	ImportShipmentResponse,
} from '../../../api/importShipments.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (warehouseId: number, payload: ImportLegQaPayload) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

type DefectLineValues = {
	defectiveReasonId: number | '';
	qty: number | '';
};

type QaItemValues = {
	allocationId: number;
	receivedQty: number;
	qaPassedQty: number | '';
	defects: DefectLineValues[];
};

type QaFormValues = {
	items: QaItemValues[];
};

const toNum = (v: number | '') => (v === '' ? 0 : Number(v));

/**
 * Step 6 — Bay 2 QA, per warehouse leg. Passed defaults to what THAT
 * warehouse received; the Storekeeper moves quantity into one or more
 * defect lines as items fail inspection. A single item can be split across
 * several defective reasons — e.g. of 50 pcs received, 5 "Missing" and 4
 * "Crashed" — via the "+ Add reason" button per row.
 * <p>
 * Only warehouses that have finished Bay 1 receiving and not yet submitted
 * QA are offered here — see ImportShipmentWarehouseLegStage.RECEIVED.
 */
const ImportQaModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, shipment }) => {
	const { data: defectiveReasons = [] } = useQuery({
		queryKey: ['defective-reasons'],
		queryFn: getDefectiveReasonsApi,
		enabled: isOpen,
	});
	const activeReasons = defectiveReasons.filter((r) => r.active);

	const shipmentId = shipment?.id ?? null;
	const { data: legs = [], isLoading: legsLoading } = useQuery({
		queryKey: ['importShipmentWarehouseLegs', shipmentId],
		queryFn: () => getImportWarehouseLegsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});

	const readyLegs = useMemo(() => legs.filter((l) => l.legStage === 'RECEIVED'), [legs]);

	const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

	useEffect(() => {
		if (!isOpen) {
			setSelectedWarehouseId(null);
			return;
		}
		if (readyLegs.length > 0 && !readyLegs.some((l) => l.warehouseId === selectedWarehouseId)) {
			setSelectedWarehouseId(readyLegs[0].warehouseId);
		}
	}, [isOpen, readyLegs, selectedWarehouseId]);

	const selectedLeg = readyLegs.find((l) => l.warehouseId === selectedWarehouseId) ?? null;

	const formik = useFormik<QaFormValues>({
		initialValues: {
			items:
				selectedLeg?.items.map((i) => ({
					allocationId: i.allocationId,
					receivedQty: i.receivedQty,
					qaPassedQty: i.receivedQty,
					defects: [],
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			if (!selectedWarehouseId) return;
			onSubmit(selectedWarehouseId, {
				items: values.items.map((it) => ({
					allocationId: it.allocationId,
					qaPassedQty: toNum(it.qaPassedQty),
					defects: it.defects
						.filter((d) => d.defectiveReasonId !== '' && toNum(d.qty) > 0)
						.map((d) => ({
							defectiveReasonId: Number(d.defectiveReasonId),
							qty: toNum(d.qty),
						})),
				})),
			});
		},
	});

	if (!shipment) return null;

	const addDefectLine = (itemIdx: number) => {
		const current = formik.values.items[itemIdx]?.defects ?? [];
		formik.setFieldValue(`items.${itemIdx}.defects`, [...current, { defectiveReasonId: '', qty: '' }]);
	};

	const removeDefectLine = (itemIdx: number, lineIdx: number) => {
		const current = formik.values.items[itemIdx]?.defects ?? [];
		formik.setFieldValue(
			`items.${itemIdx}.defects`,
			current.filter((_, i) => i !== lineIdx),
		);
	};

	const defectiveQtyFor = (itemIdx: number) =>
		(formik.values.items[itemIdx]?.defects ?? []).reduce((sum, d) => sum + toNum(d.qty), 0);

	const hasIncompleteLine = formik.values.items.some((it) =>
		it.defects.some((d) => (toNum(d.qty) > 0 && d.defectiveReasonId === '') || (d.defectiveReasonId !== '' && toNum(d.qty) <= 0)),
	);

	const hasOverReceived = formik.values.items.some(
		(it, idx) => toNum(it.qaPassedQty) + defectiveQtyFor(idx) > it.receivedQty,
	);

	const canSubmit = !!selectedLeg && !hasIncompleteLine && !hasOverReceived;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='importQaModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importQaModal'>QA — Bay 2 — {shipment.shipmentNo}</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					{legsLoading ? (
						<div className='text-center py-4'>
							<Spinner />
						</div>
					) : readyLegs.length === 0 ? (
						<Alert color='info' isLight>
							No warehouse on this shipment is currently awaiting QA — either none has finished Bay 1
							receiving yet, or QA has already been submitted for every received warehouse.
						</Alert>
					) : (
						<>
							{readyLegs.length > 1 && (
								<FormGroup id='qaWarehouseSelect' label='Warehouse' className='mb-3'>
									<div className='btn-group' role='group'>
										{readyLegs.map((leg) => (
											<Button
												key={leg.warehouseId}
												type='button'
												size='sm'
												color={selectedWarehouseId === leg.warehouseId ? 'primary' : 'light'}
												isLight={selectedWarehouseId !== leg.warehouseId}
												onClick={() => setSelectedWarehouseId(leg.warehouseId)}>
												{leg.warehouseName ?? `Warehouse ${leg.warehouseId}`}
											</Button>
										))}
									</div>
								</FormGroup>
							)}

							<Alert color={!canSubmit && (hasOverReceived || hasIncompleteLine) ? 'warning' : 'info'} isLight className='mb-3'>
								{hasOverReceived
									? 'Passed + defective quantity cannot exceed what was received on any line.'
									: hasIncompleteLine
										? 'Every defect line needs both a reason and a quantity before this can be submitted.'
										: 'Passed quantity defaults to what this warehouse received. Move quantity into one or more defect lines for anything that fails QA.'}
							</Alert>
							<table className='table table-sm table-bordered align-middle'>
								<thead className='table-light'>
									<tr>
										<th style={{ width: '22%' }}>Item</th>
										<th style={{ width: 90 }}>Received</th>
										<th style={{ width: 110 }}>Passed Qty</th>
										<th>Defective — reason &amp; qty</th>
									</tr>
								</thead>
								<tbody>
									{selectedLeg?.items.map((item, idx) => {
										const defects = formik.values.items[idx]?.defects ?? [];
										const totalDefective = defectiveQtyFor(idx);
										const overReceived =
											toNum(formik.values.items[idx]?.qaPassedQty) + totalDefective > item.receivedQty;
										return (
											<tr key={item.allocationId}>
												<td>
													{item.productName ?? item.description ?? '—'}
													{item.sku && <div className='small text-muted'>SKU: {item.sku}</div>}
												</td>
												<td>{item.receivedQty}</td>
												<td>
													<Input
														type='number'
														name={`items.${idx}.qaPassedQty`}
														value={formik.values.items[idx]?.qaPassedQty ?? ''}
														onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
															const val = e.target.value;
															formik.setFieldValue(`items.${idx}.qaPassedQty`, val === '' ? '' : Number(val));
														}}
														isValid={!overReceived}
														isTouched={overReceived}
														invalidFeedback='Exceeds received qty'
														min={0}
														step={0.01}
													/>
												</td>
												<td>
													{defects.length === 0 && (
														<div className='small text-muted mb-2'>No defects recorded for this line.</div>
													)}
													{defects.map((line, lineIdx) => {
														const lineIncomplete =
															(toNum(line.qty) > 0 && line.defectiveReasonId === '') ||
															(line.defectiveReasonId !== '' && toNum(line.qty) <= 0);
														return (
															<div key={lineIdx} className='d-flex align-items-center gap-2 mb-2'>
																<Select
																	ariaLabel='Defective Reason'
																	placeholder='Select a reason'
																	name={`items.${idx}.defects.${lineIdx}.defectiveReasonId`}
																	value={line.defectiveReasonId?.toString() ?? ''}
																	onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
																		const val = e.target.value;
																		formik.setFieldValue(
																			`items.${idx}.defects.${lineIdx}.defectiveReasonId`,
																			val === '' ? '' : Number(val),
																		);
																	}}
																	isValid={!lineIncomplete}
																	isTouched={lineIncomplete}
																	invalidFeedback='Required'
																	style={{ minWidth: 180 }}>
																	{activeReasons.map((r) => (
																		<Option key={r.id} value={r.id.toString()}>
																			{r.label}
																		</Option>
																	))}
																</Select>
																<Input
																	type='number'
																	ariaLabel='Defective Qty'
																	name={`items.${idx}.defects.${lineIdx}.qty`}
																	value={line.qty ?? ''}
																	onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
																		const val = e.target.value;
																		formik.setFieldValue(
																			`items.${idx}.defects.${lineIdx}.qty`,
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
																	onClick={() => removeDefectLine(idx, lineIdx)}
																/>
															</div>
														);
													})}
													<Button
														type='button'
														color='primary'
														isLight
														size='sm'
														icon='Add'
														onClick={() => addDefectLine(idx)}>
														Add reason
													</Button>
													{defects.length > 0 && (
														<div className={`small mt-2 ${overReceived ? 'text-danger fw-bold' : 'text-muted'}`}>
															Total defective: {totalDefective}
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
						{isLoading ? 'Submitting...' : 'Submit QA'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportQaModal;

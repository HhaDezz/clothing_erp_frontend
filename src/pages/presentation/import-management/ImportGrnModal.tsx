import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Spinner from '../../../components/bootstrap/Spinner';
import { getImportWarehouseLegsApi, ImportShipmentResponse } from '../../../api/importShipments.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onGenerate: (warehouseId: number) => void;
	isLoading: boolean;
	shipment: ImportShipmentResponse | null;
}

/**
 * Step 7 — GRN generation, per warehouse leg. Read-only recap of what was
 * already captured during that warehouse's own Bay 2 QA (accepted/defective
 * qty + reasons) — nothing is editable here, this just snapshots those
 * numbers into that warehouse's own GRN. "need multiple grn if allocated
 * multiple warehouses" — only one warehouse's GRN is generated per
 * submission; a shipment split across several warehouses needs this run
 * once per warehouse. Once generated, the PDF (with the company logo) can
 * be printed/downloaded from the shipment's detail view — see
 * PrintGrnPdfButton in the "Warehouse Legs" section of
 * ImportShipmentDetailDrawer.tsx.
 */
const ImportGrnModal: React.FC<Props> = ({ isOpen, setIsOpen, onGenerate, isLoading, shipment }) => {
	const shipmentId = shipment?.id ?? null;
	const { data: legs = [], isLoading: legsLoading } = useQuery({
		queryKey: ['importShipmentWarehouseLegs', shipmentId],
		queryFn: () => getImportWarehouseLegsApi(shipmentId as number),
		enabled: isOpen && shipmentId !== null,
	});

	const readyLegs = useMemo(() => legs.filter((l) => l.legStage === 'QA_DONE'), [legs]);

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

	if (!shipment) return null;

	const totalAccepted = selectedLeg?.items.reduce((sum, i) => sum + (i.qaPassedQty ?? 0), 0) ?? 0;
	const totalDefective = selectedLeg?.items.reduce((sum, i) => sum + (i.qaDefectiveQty ?? 0), 0) ?? 0;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='importGrnModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importGrnModal'>Generate GRN — {shipment.shipmentNo}</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{legsLoading ? (
					<div className='text-center py-4'>
						<Spinner />
					</div>
				) : readyLegs.length === 0 ? (
					<Alert color='info' isLight>
						No warehouse on this shipment is currently awaiting GRN generation — either QA hasn't been
						submitted yet, or every QA'd warehouse already has its GRN.
					</Alert>
				) : (
					<>
						{readyLegs.length > 1 && (
							<FormGroup id='grnWarehouseSelect' label='Warehouse' className='mb-3'>
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

						<Alert color='info' isLight className='mb-3'>
							This snapshots the accepted/defective quantities already captured during this warehouse's
							QA (Bay 2) into its own Goods Received Note. Nothing below can be changed here — go back
							to QA — Bay 2 to correct a line first. Once generated, the GRN PDF (with the company
							logo) can be printed or downloaded from the shipment's detail view, under "Warehouse
							Legs".
						</Alert>
						<table className='table table-sm table-bordered align-middle'>
							<thead className='table-light'>
								<tr>
									<th>Item</th>
									<th className='text-end' style={{ width: 110 }}>
										Received
									</th>
									<th className='text-end' style={{ width: 110 }}>
										Accepted
									</th>
									<th className='text-end' style={{ width: 110 }}>
										Defective
									</th>
									<th style={{ width: 220 }}>Defective Reason</th>
								</tr>
							</thead>
							<tbody>
								{selectedLeg?.items.map((item) => (
									<tr key={item.allocationId}>
										<td>{item.productName ?? item.description ?? '—'}</td>
										<td className='text-end'>{item.receivedQty}</td>
										<td className='text-end text-success fw-bold'>{item.qaPassedQty}</td>
										<td className='text-end text-danger fw-bold'>{item.qaDefectiveQty}</td>
										<td>
											{item.defects && item.defects.length > 0 ? (
												item.defects.map((d) => `${d.defectiveReasonLabel ?? '—'} (${d.qty})`).join(', ')
											) : (
												<span className='text-muted'>—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className='table-light fw-bold'>
									<td>Total</td>
									<td className='text-end'>—</td>
									<td className='text-end text-success'>{totalAccepted}</td>
									<td className='text-end text-danger'>{totalDefective}</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					type='button'
					color='primary'
					isDisable={isLoading || !selectedLeg}
					isLight
					onClick={() => selectedWarehouseId && onGenerate(selectedWarehouseId)}>
					{isLoading ? 'Generating...' : 'Generate GRN'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ImportGrnModal;

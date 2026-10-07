import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Select from '../../../components/bootstrap/forms/Select';
import Input from '../../../components/bootstrap/forms/Input';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import { usePermission } from '../../../hooks/usePermission';
import { getWarehousesApi } from '../../../api/warehouses.api';
import { GoodsTransferRequest } from '../../../api/goodsTransfer.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	request: GoodsTransferRequest | null;
	onIssue: (id: number, warehouseId: number) => void;
	isLoading: boolean;
	/** Pre-selects (and locks) the warehouse when opened from that warehouse's own tab. */
	presetWarehouseId?: number | null;
}

/**
 * Step 4 — "and issue items (bar code generated items) to Showroom". Since
 * approval can now split a line across several warehouses, this only
 * issues the ONE warehouse's own pending slice(s) — other warehouses' slices
 * are issued independently by their own store keeper. A slice only counts
 * as pending here once it has its own barcode tags — barcoding is now also
 * per-warehouse, so one warehouse being done with tags never lets another
 * warehouse skip straight to issuing an un-tagged slice (see
 * GoodsTransferService#issue, which silently skips any allocation without
 * barcodeUnits). The backend moves stock via
 * InventoryService#transferVariantStock (a TRANSFER_OUT at that warehouse +
 * TRANSFER_IN at the showroom) for each pending allocation.
 */
const GoodsTransferIssueModal: React.FC<Props> = ({
	isOpen,
	setIsOpen,
	request,
	onIssue,
	isLoading,
	presetWarehouseId,
}) => {
	const { canActOnWarehouse, isSuperAdmin, warehouseIds } = usePermission();
	const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehousesApi });

	// Only warehouses that actually still have something pending AND already
	// tagged on this request, intersected with what the current user is
	// assigned to.
	const pendingWarehouseIds = useMemo(() => {
		const ids = new Set<number>();
		request?.items.forEach((item) =>
			item.allocations.forEach((a) => {
				if (a.issuedQty < a.allocatedQty && a.barcodeUnits.length > 0) ids.add(a.warehouseId);
			}),
		);
		return ids;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [request]);

	const issuableWarehouses = useMemo(
		() => warehouses.filter((w) => pendingWarehouseIds.has(w.id) && canActOnWarehouse(w.id)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[warehouses, pendingWarehouseIds],
	);

	const [warehouseId, setWarehouseId] = useState<number | ''>('');

	useEffect(() => {
		if (!isOpen) {
			setWarehouseId('');
			return;
		}
		if (presetWarehouseId) {
			setWarehouseId(presetWarehouseId);
		} else if (issuableWarehouses.length === 1) {
			setWarehouseId(issuableWarehouses[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, presetWarehouseId, issuableWarehouses]);

	if (!request) return null;

	const presetWarehouseName = presetWarehouseId
		? warehouses.find((w) => w.id === presetWarehouseId)?.name
		: undefined;

	// Only this warehouse's own pending AND already-tagged lines/quantities —
	// not the item's full approved quantity, which may include other
	// warehouses' slices, and not a slice this same warehouse hasn't
	// barcoded yet.
	const pendingLines = warehouseId
		? request.items
				// One row per allocation — an item may have more than one at
				// this warehouse (see GoodsTransferBarcodeModal).
				.flatMap((item) =>
					item.allocations
						.filter(
							(a) =>
								a.warehouseId === Number(warehouseId) &&
								a.issuedQty < a.allocatedQty &&
								a.barcodeUnits.length > 0,
						)
						.map((allocation) => ({ item, allocation })),
				)
		: [];

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' isCentered titleId='goodsTransferIssueModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='goodsTransferIssueModal'>
					Issue {request.requestNo} to {request.showroomName}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<Alert color='info' isLight className='mb-3'>
					This deducts stock from the selected warehouse. The items are then in transit: they are
					added to <strong>{request.showroomName}</strong>&apos;s stock only when the showroom
					confirms receipt. Only this warehouse&apos;s own pending items are issued — other
					warehouses on this request are issued separately.
				</Alert>

				{!isSuperAdmin && warehouseIds.length > 0 && issuableWarehouses.length === 0 ? (
					<Alert color='warning' isLight>
						None of your assigned warehouses have anything pending on this request.
					</Alert>
				) : presetWarehouseId ? (
					<FormGroup id='warehouseId' label='Issuing From'>
						<Input value={presetWarehouseName ?? `Warehouse ${presetWarehouseId}`} disabled />
					</FormGroup>
				) : (
					<FormGroup id='warehouseId' label='Issue From Warehouse'>
						<Select
							name='warehouseId'
							value={warehouseId}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								setWarehouseId(e.target.value ? Number(e.target.value) : '')
							}
							ariaLabel='Warehouse'>
							<option value=''>Select a warehouse...</option>
							{issuableWarehouses.map((w) => (
								<option key={w.id} value={w.id}>
									{w.name}
								</option>
							))}
						</Select>
					</FormGroup>
				)}

				<table className='table table-sm table-bordered align-middle mt-3'>
					<thead className='table-light'>
						<tr>
							<th>Item</th>
							<th>SKU</th>
							<th style={{ width: 90 }}>Qty</th>
						</tr>
					</thead>
					<tbody>
						{pendingLines.length === 0 ? (
							<tr>
								<td colSpan={3} className='text-center text-muted small py-3'>
									{warehouseId ? 'Nothing pending for this warehouse.' : 'Pick a warehouse to see its items.'}
								</td>
							</tr>
						) : (
							pendingLines.map(({ item, allocation }) => (
								<tr key={allocation.id}>
									<td>{item.productName || '—'}</td>
									<td>{item.sku}</td>
									<td>{allocation?.allocatedQty}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					isLight
					isDisable={isLoading || !warehouseId || pendingLines.length === 0}
					onClick={() => warehouseId && onIssue(request.id, Number(warehouseId))}>
					{isLoading ? 'Issuing...' : 'Confirm Issue'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default GoodsTransferIssueModal;

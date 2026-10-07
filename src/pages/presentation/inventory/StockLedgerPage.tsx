import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../../../helpers/currency';
import {
	getInventoryTransactionsApi,
	getLowStockApi,
	getVariantStockByProductApi,
	InventoryTransaction,
	LowStockAlert,
	ProductStock,
} from '../../../api/inventory.api';
import { getWarehousesApi } from '../../../api/purchasing.api';
import { getShowroomsApi } from '../../../api/showrooms.api';
import { getVariantImageApi } from '../../../api/products.api';

type LowStockRow = LowStockAlert & { rowKey: string };

/**
 * Read-only variant photo for a Stock Quantity row — same blob-fetch pattern
 * as VariantSearchSelect, kept local since it only needs a variantId/sku
 * here. Only rendered for variants under an expanded product, so this never
 * fires more requests than the rows actually on screen.
 */
const VariantThumb: React.FC<{ variantId: number; sku: string; size?: number }> = ({
	variantId,
	sku,
	size = 36,
}) => {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const objectUrlRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		getVariantImageApi(variantId)
			.then((blob) => {
				if (cancelled || !blob) return;
				const url = URL.createObjectURL(blob);
				objectUrlRef.current = url;
				setImageUrl(url);
			})
			.catch(() => {
				// 404 == no photo yet
			});
		return () => {
			cancelled = true;
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		};
	}, [variantId]);

	return (
		<div
			className='d-flex align-items-center justify-content-center rounded border bg-light overflow-hidden flex-shrink-0'
			style={{ width: size, height: size }}>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={sku}
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
				/>
			) : (
				<Icon icon='Image' size='sm' color='secondary' />
			)}
		</div>
	);
};

const numberValue = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

const getMovement = (transaction: InventoryTransaction) => {
	const qtyIn = numberValue(transaction.qtyIn);
	const qtyOut = numberValue(transaction.qtyOut);
	const legacyQty = numberValue(transaction.qty);
	const type = (transaction.transactionType || transaction.referenceType || '').toUpperCase();

	if (qtyIn > 0) return { direction: 'IN' as const, quantity: qtyIn };
	if (qtyOut > 0) return { direction: 'OUT' as const, quantity: qtyOut };
	if (legacyQty < 0 || type.includes('OUT') || type === 'SALE') {
		return { direction: 'OUT' as const, quantity: Math.abs(legacyQty) };
	}
	return { direction: 'IN' as const, quantity: Math.abs(legacyQty) };
};

const getTransactionType = (transaction: InventoryTransaction) =>
	transaction.transactionType || transaction.referenceType || 'STOCK_MOVEMENT';

const getReference = (transaction: InventoryTransaction) =>
	transaction.reference || transaction.referenceType || '—';

const getTransactionDate = (transaction: InventoryTransaction) =>
	transaction.transactionDate || transaction.createdAt;

const txColor = (type: string): any => {
	const map: Record<string, any> = {
		STOCK_IN: 'success',
		STOCK_OUT: 'danger',
		ADJUSTMENT: 'warning',
		TRANSFER_IN: 'info',
		TRANSFER_OUT: 'secondary',
		SALE: 'primary',
		GRN: 'success',
	};
	return map[type] ?? 'secondary';
};

const getWarehouseLabel = (
	warehouseId?: number | string | null,
	warehouseName?: string,
	warehouses: { id: number; name: string }[] = [],
) =>
	warehouseName ||
	warehouses.find((warehouse) => warehouse.id === Number(warehouseId))?.name ||
	'—';

const getItemLabel = (itemName?: string, itemType?: string) => itemName || itemType || '—';

const TxViewModal = ({
	tx,
	isOpen,
	setIsOpen,
	warehouses,
}: {
	tx: InventoryTransaction | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	warehouses: { id: number; name: string }[];
}) => {
	if (!tx) return null;
	const movement = getMovement(tx);
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='tx-view-title'>
					<Icon icon='MenuBook' className='me-2 text-primary' />
					Transaction — {tx.transactionNo || '—'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<div className='col-6'>
						<div className='text-muted small fw-semibold text-uppercase'>Type</div>
						<p className='mb-0'>
							<Badge color={txColor(getTransactionType(tx))} isLight>
								{getTransactionType(tx)}
							</Badge>
						</p>
					</div>
					<div className='col-6'>
						<div className='text-muted small fw-semibold text-uppercase'>Warehouse</div>
						<p className='fw-bold mb-0'>
							{getWarehouseLabel(tx.warehouseId, tx.warehouseName, warehouses)}
						</p>
					</div>
					<div className='col-6'>
						<div className='text-muted small fw-semibold text-uppercase'>Item</div>
						<p className='mb-0'>{getItemLabel(tx.itemName, tx.itemType)}</p>
					</div>
					<div className='col-3'>
						<div className='text-muted small fw-semibold text-uppercase'>Quantity</div>
						<p
							className={`fw-bold mb-0 ${movement.direction === 'IN' ? 'text-success' : 'text-danger'}`}>
							{movement.direction === 'IN' ? '+' : '-'}
							{movement.quantity}
						</p>
					</div>
					<div className='col-3'>
						<div className='text-muted small fw-semibold text-uppercase'>Unit Cost</div>
						<p className='mb-0'>
							{tx.unitCost === undefined
								? '—'
								: formatCurrency(numberValue(tx.unitCost))}
						</p>
					</div>
					{getReference(tx) !== '—' && (
						<div className='col-12'>
							<div className='text-muted small fw-semibold text-uppercase'>
								Reference
							</div>
							<p className='mb-0'>{getReference(tx)}</p>
						</div>
					)}
					{tx.notes && (
						<div className='col-12'>
							<div className='text-muted small fw-semibold text-uppercase'>Notes</div>
							<p className='mb-0'>{tx.notes}</p>
						</div>
					)}
					<div className='col-12'>
						<div className='text-muted small fw-semibold text-uppercase'>Date</div>
						<p className='mb-0 text-muted'>
							{getTransactionDate(tx)
								? new Date(getTransactionDate(tx)).toLocaleString()
								: '—'}
						</p>
					</div>
					{tx.createdBy && (
						<div className='col-12'>
							<div className='text-muted small fw-semibold text-uppercase'>
								Created By
							</div>
							<p className='mb-0'>{tx.createdBy}</p>
						</div>
					)}
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const StockLedgerPage = () => {
	const [viewTx, setViewTx] = useState<InventoryTransaction | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<'stock' | 'transactions' | 'lowStock'>('stock');
	// A Showroom is itself a Warehouse row (see ShowroomController), so the
	// same /inventory/stock/... endpoints work unchanged for either — this
	// just decides which location list feeds the selector below.
	const [locationType, setLocationType] = useState<'WAREHOUSE' | 'SHOWROOM'>('WAREHOUSE');
	const [warehouseId, setWarehouseId] = useState('');
	const [stockSearch, setStockSearch] = useState('');
	const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

	const toggleProduct = (productId: number) => {
		setExpandedProducts((prev) => {
			const next = new Set(prev);
			if (next.has(productId)) next.delete(productId);
			else next.add(productId);
			return next;
		});
	};

	const {
		data: warehouses = [],
		isLoading: warehousesLoading,
		error: warehousesError,
	} = useQuery({
		queryKey: ['warehouses'],
		queryFn: getWarehousesApi,
	});
	const { data: showrooms = [] } = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const availableWarehouses = warehouses.filter(
		(warehouse) => !warehouse.status || warehouse.status === 'ACTIVE',
	);
	const availableLocations = locationType === 'WAREHOUSE' ? availableWarehouses : showrooms;
	// Combined, for resolving a transaction/alert's warehouseName when the
	// API response itself doesn't already carry one.
	const allLocationsForLabel = [...warehouses, ...showrooms];
	const effectiveWarehouseId =
		warehouseId || (availableLocations[0]?.id ? String(availableLocations[0].id) : '');

	const switchLocationType = (type: 'WAREHOUSE' | 'SHOWROOM') => {
		setLocationType(type);
		setWarehouseId('');
	};

	const {
		data: productStock = [],
		isLoading: stockLoading,
		error: stockError,
	} = useQuery<ProductStock[]>({
		queryKey: ['variantStockByProduct', effectiveWarehouseId],
		queryFn: () => getVariantStockByProductApi(Number(effectiveWarehouseId)),
		enabled: activeTab === 'stock' && Boolean(effectiveWarehouseId),
	});

	const filteredProductStock = useMemo(() => {
		const term = stockSearch.trim().toLowerCase();
		if (!term) return productStock;
		return productStock
			.map((product) => {
				const productMatches =
					product.productName.toLowerCase().includes(term) ||
					(product.styleCode ?? '').toLowerCase().includes(term);
				const matchingVariants = product.variants.filter(
					(v) =>
						v.sku.toLowerCase().includes(term) ||
						(v.size ?? '').toLowerCase().includes(term) ||
						(v.color ?? '').toLowerCase().includes(term),
				);
				if (productMatches) return product;
				if (matchingVariants.length > 0) return { ...product, variants: matchingVariants };
				return null;
			})
			.filter((p): p is ProductStock => p !== null);
	}, [productStock, stockSearch]);

	const {
		data: transactions = [],
		isLoading: txLoading,
		error: txError,
	} = useQuery<InventoryTransaction[]>({
		queryKey: ['inventoryTransactions', effectiveWarehouseId],
		queryFn: () => getInventoryTransactionsApi(Number(effectiveWarehouseId)),
		enabled: activeTab === 'transactions' && Boolean(effectiveWarehouseId),
	});

	const {
		data: lowStock = [],
		isLoading: lsLoading,
		error: lsError,
	} = useQuery<LowStockAlert[]>({
		queryKey: ['lowStockAlerts'],
		queryFn: getLowStockApi,
		enabled: activeTab === 'lowStock',
	});

	const lowStockRows: LowStockRow[] = lowStock.map((row) => ({
		...row,
		rowKey: `${row.itemType}-${row.itemId}-${row.warehouseId}`,
	}));

	const txColumns: DataTableColumn<InventoryTransaction>[] = [
		{
			key: 'id',
			label: 'Tx No',
			accessor: (row) => row.transactionNo || `TX-${row.id}`,
			render: (row) => (
				<span className='fw-bold text-primary'>{row.transactionNo || `TX-${row.id}`}</span>
			),
			exportValue: (row) => row.transactionNo || `TX-${row.id}`,
		},
		{
			key: 'referenceType',
			label: 'Type',
			align: 'center',
			accessor: getTransactionType,
			render: (row) => (
				<Badge color={txColor(getTransactionType(row))} isLight>
					{getTransactionType(row)}
				</Badge>
			),
			exportValue: getTransactionType,
		},
		{
			key: 'itemType',
			label: 'Item',
			accessor: (row) => getItemLabel(row.itemName, row.itemType),
			render: (row) => <span>{getItemLabel(row.itemName, row.itemType)}</span>,
			exportValue: (row) => getItemLabel(row.itemName, row.itemType),
		},
		{
			key: 'warehouseId',
			label: 'Warehouse',
			accessor: (row) => getWarehouseLabel(row.warehouseId, row.warehouseName, allLocationsForLabel),
			render: (row) => (
				<span>{getWarehouseLabel(row.warehouseId, row.warehouseName, allLocationsForLabel)}</span>
			),
			exportValue: (row) => getWarehouseLabel(row.warehouseId, row.warehouseName, allLocationsForLabel),
		},
		{
			key: 'qtyIn',
			label: 'Stock In',
			align: 'right',
			accessor: (row) => numberValue(row.qtyIn),
			render: (row) => (
				<span
					className={numberValue(row.qtyIn) > 0 ? 'fw-bold text-success' : 'text-muted'}>
					{numberValue(row.qtyIn) > 0 ? `+${numberValue(row.qtyIn)}` : '—'}
				</span>
			),
			exportValue: (row) => numberValue(row.qtyIn),
		},
		{
			key: 'qtyOut',
			label: 'Stock Out',
			align: 'right',
			accessor: (row) => numberValue(row.qtyOut),
			render: (row) => (
				<span
					className={numberValue(row.qtyOut) > 0 ? 'fw-bold text-danger' : 'text-muted'}>
					{numberValue(row.qtyOut) > 0 ? `-${numberValue(row.qtyOut)}` : '—'}
				</span>
			),
			exportValue: (row) => numberValue(row.qtyOut),
		},
		{
			key: 'referenceId',
			label: 'Reference',
			accessor: getReference,
			render: (row) => <span>{getReference(row)}</span>,
			exportValue: getReference,
		},
		{
			key: 'transactionDate',
			label: 'Date',
			accessor: getTransactionDate,
			render: (row) => (
				<span className='text-muted small'>
					{getTransactionDate(row)
						? new Date(getTransactionDate(row)).toLocaleString()
						: '—'}
				</span>
			),
			exportValue: getTransactionDate,
		},
	];

	const lsColumns: DataTableColumn<LowStockRow>[] = [
		{
			key: 'itemType',
			label: 'Item Type',
			render: (row) => <span className='fw-bold'>{row.itemType}</span>,
		},
		{
			key: 'itemId',
			label: 'Item',
			render: (row) => <span>{getItemLabel(row.itemName, row.itemType)}</span>,
		},
		{
			key: 'warehouseId',
			label: 'Warehouse',
			accessor: (row) => getWarehouseLabel(row.warehouseId, row.warehouseName, allLocationsForLabel),
			render: (row) => (
				<span>{getWarehouseLabel(row.warehouseId, row.warehouseName, allLocationsForLabel)}</span>
			),
		},
		{
			key: 'currentQty',
			label: 'Current Qty',
			align: 'center',
			render: (row) => <span className='fw-bold text-danger'>{row.currentQty}</span>,
		},
		{
			key: 'reorderLevel',
			label: 'Reorder Level',
			align: 'center',
			render: (row) => <span className='text-muted'>{row.reorderLevel}</span>,
		},
		{
			key: 'rowKey',
			label: 'Alert',
			align: 'center',
			render: () => (
				<Badge color='danger' isLight>
					Low Stock
				</Badge>
			),
		},
	];

	return (
		<PageWrapper
			title='Stock Ledger'
			requiredPermission={PERMISSIONS.SHOW_INVENTORY_TRANSACTION}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='MenuBook' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Stock Ledger</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<div className='mb-3'>
							<div className='d-flex flex-wrap justify-content-between align-items-end gap-3'>
								<div className='btn-group'>
									<button
										className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-outline-primary'}`}
										onClick={() => setActiveTab('stock')}>
										<i className='ti ti-boxes me-1' />
										Stock Quantity
									</button>
									<button
										className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-outline-primary'}`}
										onClick={() => setActiveTab('transactions')}>
										<i className='ti ti-list me-1' />
										Transactions
									</button>
									<button
										className={`btn ${activeTab === 'lowStock' ? 'btn-danger' : 'btn-outline-danger'}`}
										onClick={() => setActiveTab('lowStock')}>
										<i className='ti ti-alert-triangle me-1' />
										Low Stock Alerts
									</button>
								</div>
								<div className='d-flex flex-wrap align-items-end gap-3'>
									{activeTab === 'stock' && (
										<div style={{ minWidth: '220px' }}>
											<label
												className='form-label small fw-semibold mb-1'
												htmlFor='stockSearch'>
												Search
											</label>
											<input
												id='stockSearch'
												type='text'
												className='form-control'
												placeholder='Product, SKU, size or color...'
												value={stockSearch}
												onChange={(event) => setStockSearch(event.target.value)}
											/>
										</div>
									)}
									{(activeTab === 'transactions' || activeTab === 'stock') && (
										<>
											<div>
												<label className='form-label small fw-semibold mb-1'>
													Location Type
												</label>
												<div className='btn-group d-block'>
													<button
														type='button'
														className={`btn btn-sm ${locationType === 'WAREHOUSE' ? 'btn-primary' : 'btn-outline-primary'}`}
														onClick={() => switchLocationType('WAREHOUSE')}>
														Warehouses
													</button>
													<button
														type='button'
														className={`btn btn-sm ${locationType === 'SHOWROOM' ? 'btn-primary' : 'btn-outline-primary'}`}
														onClick={() => switchLocationType('SHOWROOM')}>
														Showrooms
													</button>
												</div>
											</div>
											<div style={{ minWidth: '260px' }}>
												<label
													className='form-label small fw-semibold mb-1'
													htmlFor='ledgerWarehouse'>
													{locationType === 'WAREHOUSE' ? 'Warehouse' : 'Showroom'}
												</label>
												<select
													id='ledgerWarehouse'
													className='form-select'
													value={effectiveWarehouseId}
													onChange={(event) => setWarehouseId(event.target.value)}
													disabled={warehousesLoading || availableLocations.length === 0}>
													{availableLocations.length === 0 && (
														<option value=''>
															{locationType === 'WAREHOUSE'
																? 'No warehouse available'
																: 'No showroom available'}
														</option>
													)}
													{availableLocations.map((location) => (
														<option value={location.id} key={location.id}>
															{location.name}
														</option>
													))}
												</select>
											</div>
										</>
									)}
								</div>
							</div>
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								{activeTab === 'stock' ? (
									<div className='table-responsive'>
										<table className='table table-hover align-middle mb-0'>
											<thead>
												<tr>
													<th style={{ width: 40 }} />
													<th>Product</th>
													<th>Style Code</th>
													<th className='text-end'>Total Quantity</th>
												</tr>
											</thead>
											<tbody>
												{filteredProductStock.map((product) => {
													const isExpanded = expandedProducts.has(
														product.productId,
													);
													return (
														<React.Fragment key={product.productId}>
															<tr
																role='button'
																style={{ cursor: 'pointer' }}
																onClick={() =>
																	toggleProduct(product.productId)
																}>
																<td>
																	<Icon
																		icon={
																			isExpanded
																				? 'ExpandMore'
																				: 'ChevronRight'
																		}
																		color='secondary'
																	/>
																</td>
																<td className='fw-bold'>
																	{product.productName}
																</td>
																<td className='text-muted small'>
																	{product.styleCode || '—'}
																</td>
																<td
																	className={`text-end fw-bold ${
																		product.totalQuantity <= 0
																			? 'text-danger'
																			: ''
																	}`}>
																	{product.totalQuantity}
																</td>
															</tr>
															{isExpanded &&
																product.variants.map((variant) => (
																	<tr
																		key={variant.variantId}
																		className='table-light'>
																		<td />
																		<td colSpan={2}>
																			<div className='d-flex align-items-center gap-2 ps-4'>
																				<VariantThumb
																					variantId={
																						variant.variantId
																					}
																					sku={variant.sku}
																				/>
																				<div>
																					<div className='fw-semibold small'>
																						{variant.sku}
																					</div>
																					<div className='text-muted small'>
																						{[
																							variant.size,
																							variant.color,
																						]
																							.filter(
																								Boolean,
																							)
																							.join(
																								' / ',
																							) ||
																							'—'}
																					</div>
																				</div>
																			</div>
																		</td>
																		<td
																			className={`text-end ${
																				variant.quantity <= 0
																					? 'text-danger'
																					: ''
																			}`}>
																			{variant.quantity}
																		</td>
																	</tr>
																))}
															{isExpanded &&
																product.variants.length === 0 && (
																	<tr>
																		<td />
																		<td
																			colSpan={3}
																			className='text-muted small ps-4'>
																			No variants match.
																		</td>
																	</tr>
																)}
														</React.Fragment>
													);
												})}
												{filteredProductStock.length === 0 &&
													!stockLoading && (
														<tr>
															<td
																colSpan={4}
																className='text-center text-muted py-4'>
																{stockSearch
																	? 'No products match your search.'
																	: 'No stock data for this warehouse.'}
															</td>
														</tr>
													)}
											</tbody>
										</table>
										{(stockLoading || warehousesLoading) && (
											<div className='text-center text-muted py-4'>
												Loading...
											</div>
										)}
										{Boolean(stockError) && (
											<div className='text-center text-danger py-4'>
												Failed to load stock quantities.
											</div>
										)}
									</div>
								) : activeTab === 'transactions' ? (
									<DataTable
										columns={[
											...txColumns,
											{
												key: 'actions',
												label: '',
												align: 'right' as any,
												sortable: false,
												searchable: false,
												render: (row) => (
													<DataTableActionMenu
														actions={[
															{
																key: 'view',
																label: 'View Details',
																icon: 'ti ti-eye',
																className: 'text-info',
																onClick: () => {
																	setViewTx(row);
																	setIsViewModalOpen(true);
																},
															},
														]}
													/>
												),
											},
										]}
										data={transactions}
										rowKey='id'
										loading={txLoading || warehousesLoading}
										error={txError || warehousesError}
										fileName='stock-ledger'
										showActions={false}
									/>
								) : (
									<DataTable
										columns={lsColumns}
										data={lowStockRows}
										rowKey='rowKey'
										loading={lsLoading}
										error={lsError}
										fileName='low-stock-alerts'
										showActions={false}
									/>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<TxViewModal
				tx={viewTx}
				isOpen={isViewModalOpen}
				setIsOpen={setIsViewModalOpen}
				warehouses={allLocationsForLabel}
			/>
		</PageWrapper>
	);
};

export default StockLedgerPage;

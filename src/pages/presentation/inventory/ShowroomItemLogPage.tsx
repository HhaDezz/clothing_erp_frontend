import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import {
	getInventoryTransactionsApi,
	getVariantStockByProductApi,
	InventoryTransaction,
	ProductStock,
} from '../../../api/inventory.api';
import { getShowroomsApi } from '../../../api/showrooms.api';

const numberValue = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

// A "sold" line is any ledger entry issued out of the showroom against a
// sale — POS checkout writes these as stock-out transactions referencing
// the sale (see CheckoutService). Older rows before qtyIn/qtyOut existed
// fall back to the signed legacy `qty` field, same as StockLedgerPage does.
const isSaleTransaction = (transaction: InventoryTransaction) => {
	const type = (transaction.referenceType || transaction.transactionType || '').toUpperCase();
	return type === 'SALE';
};

const saleQuantity = (transaction: InventoryTransaction) => {
	const qtyOut = numberValue(transaction.qtyOut);
	if (qtyOut > 0) return qtyOut;
	return Math.abs(numberValue(transaction.qty));
};

// variantId -> total units sold out of this showroom, from every SALE
// transaction in its ledger.
const buildSoldByVariant = (transactions: InventoryTransaction[]): Record<number, number> => {
	const sold: Record<number, number> = {};
	transactions.filter(isSaleTransaction).forEach((transaction) => {
		sold[transaction.itemId] = (sold[transaction.itemId] ?? 0) + saleQuantity(transaction);
	});
	return sold;
};

const ShowroomItemLogPage = () => {
	const [showroomId, setShowroomId] = useState('');
	const [search, setSearch] = useState('');
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
		data: showrooms = [],
		isLoading: showroomsLoading,
		error: showroomsError,
	} = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const effectiveShowroomId = showroomId || (showrooms[0]?.id ? String(showrooms[0].id) : '');

	const {
		data: productStock = [],
		isLoading: stockLoading,
		error: stockError,
	} = useQuery<ProductStock[]>({
		queryKey: ['variantStockByProduct', effectiveShowroomId],
		queryFn: () => getVariantStockByProductApi(Number(effectiveShowroomId)),
		enabled: Boolean(effectiveShowroomId),
	});

	const {
		data: transactions = [],
		isLoading: transactionsLoading,
		error: transactionsError,
	} = useQuery<InventoryTransaction[]>({
		queryKey: ['inventoryTransactions', effectiveShowroomId],
		queryFn: () => getInventoryTransactionsApi(Number(effectiveShowroomId)),
		enabled: Boolean(effectiveShowroomId),
	});

	const soldByVariant = useMemo(() => buildSoldByVariant(transactions), [transactions]);

	// Same product -> variants shape the Stock Ledger uses, with a `sold`
	// figure joined onto every variant (and summed onto the product row) from
	// the showroom's transaction ledger.
	const rows = useMemo(
		() =>
			productStock.map((product) => {
				const variants = product.variants.map((variant) => ({
					...variant,
					sold: soldByVariant[variant.variantId] ?? 0,
				}));
				return {
					...product,
					variants,
					totalSold: variants.reduce((sum, variant) => sum + variant.sold, 0),
				};
			}),
		[productStock, soldByVariant],
	);

	const filteredRows = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return rows;
		return rows
			.map((product) => {
				const productMatches =
					product.productName.toLowerCase().includes(term) ||
					(product.styleCode ?? '').toLowerCase().includes(term);
				const matchingVariants = product.variants.filter(
					(variant) =>
						variant.sku.toLowerCase().includes(term) ||
						(variant.size ?? '').toLowerCase().includes(term) ||
						(variant.color ?? '').toLowerCase().includes(term),
				);
				if (productMatches) return product;
				if (matchingVariants.length > 0) return { ...product, variants: matchingVariants };
				return null;
			})
			.filter((product): product is (typeof rows)[number] => product !== null);
	}, [rows, search]);

	const totals = useMemo(
		() =>
			filteredRows.reduce(
				(acc, product) => ({
					inStock: acc.inStock + product.totalQuantity,
					sold: acc.sold + product.totalSold,
				}),
				{ inStock: 0, sold: 0 },
			),
		[filteredRows],
	);

	const selectedShowroomName =
		showrooms.find((showroom) => showroom.id === Number(effectiveShowroomId))?.name ?? '';

	const isLoading = stockLoading || transactionsLoading || showroomsLoading;
	const hasError = stockError || transactionsError || showroomsError;

	return (
		<PageWrapper title='Showroom Item Log' requiredPermission={PERMISSIONS.SHOW_INVENTORY_TRANSACTION}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Storefront' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Showroom Item Log</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<div className='mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3'>
							<div className='d-flex flex-wrap align-items-end gap-3'>
								<div style={{ minWidth: '260px' }}>
									<label className='form-label small fw-semibold mb-1' htmlFor='showroomPicker'>
										Showroom
									</label>
									<select
										id='showroomPicker'
										className='form-select'
										value={effectiveShowroomId}
										onChange={(event) => setShowroomId(event.target.value)}
										disabled={showroomsLoading || showrooms.length === 0}>
										{showrooms.length === 0 && <option value=''>No showroom available</option>}
										{showrooms.map((showroom) => (
											<option value={showroom.id} key={showroom.id}>
												{showroom.name}
											</option>
										))}
									</select>
								</div>
								<div style={{ minWidth: '240px' }}>
									<label className='form-label small fw-semibold mb-1' htmlFor='itemLogSearch'>
										Search
									</label>
									<input
										id='itemLogSearch'
										type='text'
										className='form-control'
										placeholder='Product, SKU, size or color...'
										value={search}
										onChange={(event) => setSearch(event.target.value)}
									/>
								</div>
							</div>
							<div className='d-flex gap-4 text-end'>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>In Stock</div>
									<div className='fs-4 fw-bold text-success'>{totals.inStock}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Sold</div>
									<div className='fs-4 fw-bold text-primary'>{totals.sold}</div>
								</div>
							</div>
						</div>

						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								{selectedShowroomName && (
									<div className='mb-2 text-muted small'>
										Showing items for <strong>{selectedShowroomName}</strong> — a snapshot of
										current stock and everything sold from this showroom to date.
									</div>
								)}
								<div className='table-responsive'>
									<table className='table table-hover align-middle mb-0'>
										<thead>
											<tr>
												<th style={{ width: 40 }} />
												<th>Product</th>
												<th>Style Code</th>
												<th className='text-end'>In Stock</th>
												<th className='text-end'>Sold</th>
											</tr>
										</thead>
										<tbody>
											{filteredRows.map((product) => {
												const isExpanded = expandedProducts.has(product.productId);
												return (
													<React.Fragment key={product.productId}>
														<tr
															role='button'
															style={{ cursor: 'pointer' }}
															onClick={() => toggleProduct(product.productId)}>
															<td>
																<Icon
																	icon={isExpanded ? 'ExpandMore' : 'ChevronRight'}
																	color='secondary'
																/>
															</td>
															<td className='fw-bold'>{product.productName}</td>
															<td className='text-muted small'>
																{product.styleCode || '—'}
															</td>
															<td
																className={`text-end fw-bold ${
																	product.totalQuantity <= 0 ? 'text-danger' : ''
																}`}>
																{product.totalQuantity}
															</td>
															<td className='text-end fw-bold text-primary'>
																{product.totalSold}
															</td>
														</tr>
														{isExpanded &&
															product.variants.map((variant) => (
																<tr key={variant.variantId} className='table-light'>
																	<td />
																	<td colSpan={2}>
																		<div className='ps-4'>
																			<div className='fw-semibold small'>
																				{variant.sku}
																			</div>
																			<div className='text-muted small'>
																				{[variant.size, variant.color]
																					.filter(Boolean)
																					.join(' / ') || '—'}
																			</div>
																		</div>
																	</td>
																	<td
																		className={`text-end ${
																			variant.quantity <= 0 ? 'text-danger' : ''
																		}`}>
																		{variant.quantity}
																	</td>
																	<td className='text-end text-primary'>
																		{variant.sold}
																	</td>
																</tr>
															))}
														{isExpanded && product.variants.length === 0 && (
															<tr>
																<td />
																<td colSpan={4} className='text-muted small ps-4'>
																	No variants match.
																</td>
															</tr>
														)}
													</React.Fragment>
												);
											})}
											{filteredRows.length === 0 && !isLoading && (
												<tr>
													<td colSpan={5} className='text-center text-muted py-4'>
														{search
															? 'No products match your search.'
															: 'No stock data for this showroom.'}
													</td>
												</tr>
											)}
										</tbody>
									</table>
									{isLoading && (
										<div className='text-center text-muted py-4'>Loading...</div>
									)}
									{Boolean(hasError) && (
										<div className='text-center text-danger py-4'>
											Failed to load the showroom item log.
										</div>
									)}
								</div>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>
		</PageWrapper>
	);
};

export default ShowroomItemLogPage;

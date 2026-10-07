import React from 'react';
import { useQueries } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../bootstrap/Modal';
import Button from '../bootstrap/Button';
import Icon from '../icon/Icon';
import Badge from '../bootstrap/Badge';
import { getProductByIdApi, getVariantByIdApi, Product, Variant } from '../../api/products.api';
import {
	SalesOrder,
	SalesOrderItem,
	getSalesOrderLineTotal,
	getSalesOrderPaidAmount,
	getSalesOrderTenders,
} from '../../api/salesOrders.api';
import { formatCurrency } from '../../helpers/currency';
import PrintSalesOrderReceiptButton from './PrintSalesOrderReceiptButton';

// Shared by the Sales Orders list page ("View Details") and the Barcode
// Item Log ("Sales Order" column) — both open the exact same modal for a
// given order, so its formatting stays in sync in one place.

export const statusColor = (status: string): any => {
	const map: Record<string, any> = {
		PENDING: 'warning',
		CONFIRMED: 'primary',
		CANCELLED: 'danger',
		COMPLETED: 'success',
		READY_FOR_DISPATCH: 'info',
	};
	return map[status] ?? 'secondary';
};

export const paymentColor = (status: string): any => {
	const map: Record<string, any> = {
		UNPAID: 'danger',
		PARTIAL: 'warning',
		PAID: 'success',
	};
	return map[status] ?? 'secondary';
};

export const getCustomerLabel = (order: SalesOrder) => order.customerName || '—';
export const getShowroomLabel = (order: SalesOrder) => order.showroomName || '—';

const getVariantOptionLabel = (variant?: Partial<Variant> | null) =>
	[variant?.size, variant?.color].filter(Boolean).join(' / ');

const SalesOrderViewModal = ({
	order,
	isOpen,
	setIsOpen,
}: {
	order: SalesOrder | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}) => {
	const variantQueries = useQueries({
		queries: (order?.items ?? []).map((item) => ({
			queryKey: ['variant', item.variantId],
			queryFn: () => getVariantByIdApi(item.variantId),
			enabled: isOpen && Boolean(item.variantId) && !item.variant,
		})),
	});
	const productQueries = useQueries({
		queries: (order?.items ?? []).map((item, index) => {
			const variant = item.variant || (variantQueries[index]?.data as Variant | undefined);
			const productId = variant?.productId;
			return {
				queryKey: ['product', productId],
				queryFn: () => getProductByIdApi(productId as number),
				enabled:
					isOpen &&
					Boolean(productId) &&
					!item.productName &&
					!item.product?.name &&
					!item.variant?.productName &&
					!item.variant?.product?.name,
			};
		}),
	});
	const getItemLabel = (item: SalesOrderItem, index: number) => {
		const variant = item.variant || (variantQueries[index]?.data as Variant | undefined);
		const product = productQueries[index]?.data as Product | undefined;
		const productName =
			item.productName ||
			item.product?.name ||
			item.variant?.productName ||
			item.variant?.product?.name ||
			product?.name;
		const sku = item.variantSku || item.sku || variant?.sku;
		const options = getVariantOptionLabel(variant);
		if (productName)
			return [productName, sku ? `(${sku})` : '', options].filter(Boolean).join(' ');
		return [sku, options].filter(Boolean).join(' ') || '—';
	};
	if (!order) return null;

	const itemCount = order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) ?? 0;

	// "sales order view ... should be recorded as -100 pts and paid amount
	// 1500" (V89). Net Amount stays what the goods sold for; points are shown
	// as their own deduction, and Paid Amount is what was actually collected.
	// Same for store credit, an account charge and a gift card (V90): one
	// tile and one footer row per tender actually used on the sale.
	const tenders = getSalesOrderTenders(order);
	const hasTenders = tenders.length > 0;
	const paidAmount = getSalesOrderPaidAmount(order);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='sales-order-view-title'>
					<Icon icon='Receipt' className='me-2 text-primary' />
					Order — {order.orderNo}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{/* Top stat strip — the three headline numbers at a glance */}
				<div className='row g-3 mb-4'>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>
								Total
							</div>
							<div className='fs-5 fw-bold'>{formatCurrency(order.totalAmount || 0)}</div>
						</div>
					</div>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>
								Discount
							</div>
							<div className='fs-5 fw-bold text-danger'>
								-{formatCurrency(order.totalDiscount || 0)}
							</div>
						</div>
					</div>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>
								Net Amount
							</div>
							<div className='fs-5 fw-bold text-success'>
								{formatCurrency(order.netAmount || 0)}
							</div>
						</div>
					</div>
				</div>

				{hasTenders && (
					<div className='row g-3 mb-4'>
						{tenders.map((tender) => (
							<div className='col' key={tender.key}>
								<div className='bg-light rounded-3 p-3 text-center h-100'>
									<div className='text-muted small text-uppercase fw-semibold mb-1'>
										{tender.key === 'points' && (
											<Icon icon='Stars' size='sm' className='me-1' />
										)}
										{tender.label}
									</div>
									<div className='fs-5 fw-bold text-danger'>
										-{formatCurrency(tender.amount)}
									</div>
								</div>
							</div>
						))}
						<div className='col'>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>
									Paid Amount
								</div>
								<div className='fs-5 fw-bold text-success'>{formatCurrency(paidAmount)}</div>
								<div className='small text-muted'>cash / card collected</div>
							</div>
						</div>
					</div>
				)}

				{/* Order details */}
				<h6 className='fw-bold text-muted small text-uppercase mb-3'>Order Details</h6>
				<div className='row g-3 mb-4'>
					<div className='col-md-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Customer
						</label>
						<p className='fw-bold mb-0'>{getCustomerLabel(order)}</p>
					</div>
					<div className='col-md-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							<Icon icon='Storefront' size='sm' className='me-1' />
							Showroom
						</label>
						<p className='fw-bold mb-0'>{getShowroomLabel(order)}</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Type</label>
						<p className='mb-0'>
							<Badge color='info' isLight>
								{order.orderType}
							</Badge>
						</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Status
						</label>
						<p className='mb-0'>
							<Badge color={statusColor(order.status)} isLight>
								{order.status}
							</Badge>
						</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Payment
						</label>
						<p className='mb-0'>
							<Badge color={paymentColor(order.paymentStatus)} isLight>
								{order.paymentStatus}
							</Badge>
						</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Date</label>
						<p className='mb-0 text-muted'>
							{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
						</p>
					</div>
					{/* Cash handed over and how the change was split (V91/V92). Orders
					    made before the tendered/change figures were stored only know
					    the store-credit part, so they fall back to that one line. */}
					{(order.cashTendered ?? 0) > 0 ? (
						<>
							<div className='col-md-3'>
								<label className='text-muted small fw-semibold text-uppercase'>
									Cash Tendered
								</label>
								<p className='mb-0 fw-bold'>{formatCurrency(order.cashTendered || 0)}</p>
							</div>
							<div className='col-md-3'>
								<label className='text-muted small fw-semibold text-uppercase'>
									Change
								</label>
								<p className='mb-0 fw-bold'>{formatCurrency(order.changeAmount || 0)}</p>
							</div>
							<div className='col-md-3'>
								<label className='text-muted small fw-semibold text-uppercase'>
									Change to Store Credit
								</label>
								<p className='mb-0 fw-bold text-success'>
									{(order.changeToStoreCredit ?? 0) > 0
										? `+${formatCurrency(order.changeToStoreCredit || 0)}`
										: '—'}
								</p>
							</div>
							<div className='col-md-3'>
								<label className='text-muted small fw-semibold text-uppercase'>
									Cash Returned
								</label>
								<p className='mb-0 fw-bold'>
									{formatCurrency(
										Math.max(0, (order.changeAmount || 0) - (order.changeToStoreCredit || 0)),
									)}
								</p>
							</div>
						</>
					) : (
						(order.changeToStoreCredit ?? 0) > 0 && (
							<div className='col-12'>
								<label className='text-muted small fw-semibold text-uppercase'>
									Change Kept as Store Credit
								</label>
								<p className='mb-0 fw-bold text-success'>
									+{formatCurrency(order.changeToStoreCredit || 0)}
								</p>
							</div>
						)
					)}
					{order.notes && (
						<div className='col-12'>
							<label className='text-muted small fw-semibold text-uppercase'>
								Notes
							</label>
							<p className='mb-0'>{order.notes}</p>
						</div>
					)}
				</div>

				{order.items?.length > 0 && (
					<>
						<hr />
						<div className='d-flex justify-content-between align-items-center mb-3'>
							<h6 className='fw-bold mb-0'>Order Items</h6>
							<span className='text-muted small'>
								{order.items.length} line{order.items.length === 1 ? '' : 's'} ·{' '}
								{itemCount} unit{itemCount === 1 ? '' : 's'}
							</span>
						</div>
						<div className='table-responsive'>
							<table className='table table-sm table-hover mb-0'>
								<thead className='table-light'>
									<tr>
										<th>Variant</th>
										<th className='text-center'>Qty</th>
										<th className='text-end'>Unit Price</th>
										<th className='text-end'>Discount</th>
										<th className='text-end'>Line Total</th>
									</tr>
								</thead>
								<tbody>
									{order.items.map((item, index) => (
										<tr key={item.id}>
											<td>{getItemLabel(item, index)}</td>
											<td className='text-center'>{item.qty}</td>
											<td className='text-end'>
												{formatCurrency(item.unitPrice || 0)}
											</td>
											<td className='text-end text-danger'>
												-{formatCurrency(item.discount || 0)}
											</td>
											<td className='text-end fw-bold'>
												{formatCurrency(getSalesOrderLineTotal(item))}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className='table-light'>
										<td colSpan={4} className='text-end fw-bold'>
											Net Amount
										</td>
										<td className={`text-end fw-bold ${hasTenders ? '' : 'text-success'}`}>
											{formatCurrency(order.netAmount || 0)}
										</td>
									</tr>
									{hasTenders && (
										<>
											{tenders.map((tender) => (
												<tr className='table-light' key={tender.key}>
													<td colSpan={4} className='text-end text-danger'>
														{tender.label}
													</td>
													<td className='text-end text-danger'>
														-{formatCurrency(tender.amount)}
													</td>
												</tr>
											))}
											<tr className='table-light'>
												<td colSpan={4} className='text-end fw-bold'>
													Paid Amount
												</td>
												<td className='text-end fw-bold text-success'>
													{formatCurrency(paidAmount)}
												</td>
											</tr>
										</>
									)}
								</tfoot>
							</table>
						</div>
					</>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
				<PrintSalesOrderReceiptButton order={order} size={undefined} />
			</ModalFooter>
		</Modal>
	);
};

export default SalesOrderViewModal;

import { generateInvoicePdf } from './generateInvoicePdf';
import { PosReceiptItem } from '../api/pos.api';
import { getProductByIdApi, getVariantByIdApi, Product, Variant } from '../api/products.api';
import { SalesOrder, SalesOrderItem, getSalesOrderLineTotal } from '../api/salesOrders.api';

/**
 * Resolves one order line into the shape generateInvoicePdf needs, using the
 * exact same fallback chain SalesOrderViewModal's getItemLabel uses (inline
 * fields first — most orders carry productName/sku/variant already — falling
 * back to a live variant/product lookup only for older orders that don't).
 * Done with plain awaited API calls rather than react-query hooks, since this
 * runs from a one-off click (a DataTableActionMenu row action or a plain
 * button), not from a component that's mounted for the query's lifetime.
 */
const resolveReceiptItem = async (item: SalesOrderItem): Promise<PosReceiptItem> => {
	let variant = item.variant as Variant | undefined;
	if (!variant && item.variantId) {
		try {
			variant = await getVariantByIdApi(item.variantId);
		} catch {
			// Older/deleted variant, or a transient error — fall back to
			// whatever the order line itself carries below.
		}
	}

	let productName =
		item.productName ||
		item.product?.name ||
		item.variant?.productName ||
		item.variant?.product?.name;
	if (!productName && variant?.productId) {
		try {
			const product = await getProductByIdApi(variant.productId);
			productName = (product as Product | undefined)?.name;
		} catch {
			// Leave productName unset — the sku/fallback below still gives a
			// usable line rather than failing the whole receipt.
		}
	}

	// generateInvoicePdf's own table-row builder already joins
	// detail/size/color/barcode together (`[item.detail, item.size,
	// item.color, item.barcode].filter(Boolean).join(' · ')`) — pass sku as
	// `detail` and size/color/barcode separately rather than pre-joining
	// them here, or they'd end up duplicated in the printed row.
	const sku = item.variantSku || item.sku || variant?.sku;

	return {
		name: productName || sku || 'Item',
		detail: sku,
		size: variant?.size,
		color: variant?.color,
		barcode: variant?.barcode,
		qty: item.qty,
		price: item.unitPrice,
		total: getSalesOrderLineTotal(item),
	};
};

/**
 * Prints/downloads a PDF receipt for an existing Sales Order — reuses the
 * exact same generateInvoicePdf() the POS Checkout success screen's "Print
 * Invoice" button already calls (POS redesign implementation plan, Phase 6),
 * so a receipt reprinted from the Sales Orders page looks identical to the
 * one printed at the till, just without the cash breakdown (amount tendered
 * / change): those are only known at checkout time and aren't stored on the
 * order, so generateInvoicePdf simply omits that section when paymentMethod
 * isn't passed. Loyalty points redeemed ARE stored on the order (V89), so
 * the "Loyalty Points Redeemed" / "Amount Paid" lines print here too.
 */
export const printSalesOrderReceipt = async (order: SalesOrder) => {
	const items = await Promise.all((order.items ?? []).map(resolveReceiptItem));

	await generateInvoicePdf({
		invoiceNo: order.orderNo,
		items,
		grossTotal: order.totalAmount || 0,
		discount: order.totalDiscount || 0,
		netTotal: order.netAmount || 0,
		showroomName: order.showroomName ?? undefined,
		customerReference: order.customerName,
		saleMode: order.orderType === 'SEW_AND_SELL' ? 'SEW_AND_SELL' : 'READY_MADE',
		date: order.createdAt ? new Date(order.createdAt) : undefined,
		...((order.redeemedValue ?? 0) > 0
			? { redeemedValue: order.redeemedValue, pointsApplied: order.pointsRedeemed }
			: {}),
		// Store credit / account charge / gift card are stored on the order
		// too (V90), so the reprint shows them exactly as the till copy did.
		...((order.storeCreditApplied ?? 0) > 0 ? { storeCreditApplied: order.storeCreditApplied } : {}),
		...((order.accountCharge ?? 0) > 0 ? { accountCharge: order.accountCharge } : {}),
		...((order.giftCardApplied ?? 0) > 0
			? { giftCardApplied: order.giftCardApplied, giftCardCode: order.giftCardCode ?? undefined }
			: {}),
		...((order.changeToStoreCredit ?? 0) > 0 ? { changeToStoreCredit: order.changeToStoreCredit } : {}),
		// Cash tendered / change are stored on the order from V92 on (and only
		// for cash sales), so the reprint can show the same "Paid via Cash /
		// Tendered / Change / split" block the till copy had.
		...((order.cashTendered ?? 0) > 0
			? {
					paymentMethod: 'CASH',
					amountTendered: order.cashTendered,
					change: order.changeAmount ?? 0,
				}
			: {}),
	});
};

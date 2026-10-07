import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import useDarkMode from '../../../hooks/useDarkMode';
import { usePermission } from '../../../hooks/usePermission';
import {
	CashierShiftPayload,
	CartItemPayload,
	CheckoutPayload,
	InvoiceResponse,
	PosUnitTag,
	PosVariantResponse,
	checkoutCartApi,
	createOrUpdateCartApi,
	getActiveShiftApi,
	getPosVariantsApi,
	getVariantByBarcodeApi,
	getVariantByUnitBarcodeApi,
	openShiftApi,
} from '../../../api/pos.api';
import { getShowroomsApi } from '../../../api/showrooms.api';
import { Customer, getCustomersApi } from '../../../api/customers.api';
import PosCustomerBar from './PosCustomerBar';
import api from '../../../lib/axios';
import { formatCurrency } from '../../../helpers/currency';
import CheckoutModal from './CheckoutModal';
import { usePosPalette } from './posPalette';
import UnitTagPickerModal from './UnitTagPickerModal';
import VariantImageThumbnail from '../../../components/common/VariantImageThumbnail';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Select from '../../../components/bootstrap/forms/Select';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Alert from '../../../components/bootstrap/Alert';
import showNotification from '../../../components/extras/showNotification';
import { PERMISSIONS } from '../../../constants/permissions';

type TApiErrorData = {
	message?: string;
	errors?: Record<string, string | string[]>;
};

type SaleMode = 'READY_MADE' | 'SEW_AND_SELL';

type SewAndSellOrder = {
	id: number;
	salesOrderId?: number;
	sales_order_id?: number;
	orderId?: number;
	order_id?: number;
	salesOrder?: { id?: number };
	order?: { id?: number };
	orderNo: string;
	order_no?: string;
	orderType: 'SEW_AND_SELL';
	order_type?: 'SEW_AND_SELL';
	customerId: number;
	customer_id?: number;
	customerName?: string;
	customer_name?: string;
	status: string;
	paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | string;
	payment_status?: 'UNPAID' | 'PARTIAL' | 'PAID' | string;
	totalAmount?: number;
	total_amount?: number;
	netAmount?: number;
	net_amount?: number;
	advancePayment?: number;
	advance_payment?: number;
	paidAmount?: number;
	paid_amount?: number;
	amountPaid?: number;
	amount_paid?: number;
	totalPaid?: number;
	total_paid?: number;
	advanceAmount?: number;
	advance_amount?: number;
	remainingAmount?: number;
	remaining_amount?: number;
	balanceAmount?: number;
	balance_amount?: number;
	balanceDue?: number;
	balance_due?: number;
	amountDue?: number;
	amount_due?: number;
	dueAmount?: number;
	due_amount?: number;
	outstandingAmount?: number;
	outstanding_amount?: number;
	expectedDate?: string;
};

export type PosCartItem = {
	key: string;
	lineType: CartItemPayload['lineType'];
	referenceId: number;
	name: string;
	detail?: string;
	qty: number;
	price: number;
	total: number;
	discount: number;
	balanceBefore?: number;
	paymentStatusBefore?: string;
	customerId?: number;
	variantId?: number;
	variantSku?: string;
	size?: string;
	color?: string;
	barcode?: string;
	// Set when this line came from scanning one physical garment's own
	// unique tag (a Goods Transfer barcode unit) rather than the shared
	// variant barcode or the product grid — this exact garment gets flagged
	// SOLD at checkout instead of just decrementing the shared stock count.
	// Always qty 1 and not steppable. See POS redesign implementation plan,
	// Phase 6.
	barcodeUnitId?: number;
	unitBarcode?: string;
};

class PaymentVerificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PaymentVerificationError';
	}
}

const getPosErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof PaymentVerificationError) return error.message;
	if (error instanceof Error && !axios.isAxiosError(error)) return error.message;
	if (!axios.isAxiosError<TApiErrorData>(error)) return fallback;

	if (!error.response) {
		return `Cannot reach the ERP API at ${import.meta.env.VITE_API_BASE_URL}. Check that the backend server is running.`;
	}

	const validationMessage = error.response.data?.errors
		? Object.values(error.response.data.errors)
				.flatMap((value) => (Array.isArray(value) ? value : [value]))
				.join(' ')
		: '';
	if (validationMessage) return validationMessage;
	if (error.response.data?.message) return error.response.data.message;
	if (error.response.status === 404) {
		return 'The cart API endpoint was not found. Confirm that the clothing ERP cart routes are installed on the configured backend.';
	}
	if (error.response.status === 403) return 'You do not have permission to process this sale.';
	if (error.response.status === 422) {
		return 'The cart was rejected. Check the cashier shift, order balance, stock and prices.';
	}
	return fallback;
};

const getApiList = <T,>(response: unknown): T[] => {
	let value = response;
	for (let depth = 0; depth < 4; depth += 1) {
		if (Array.isArray(value)) return value as T[];
		if (!value || typeof value !== 'object') return [];
		const row = value as Record<string, unknown>;
		for (const key of ['data', 'content', 'items', 'rows', 'salesOrders']) {
			if (Array.isArray(row[key])) return row[key] as T[];
		}
		if (!('data' in row)) return [];
		value = row.data;
	}
	return [];
};

const optionalNumber = (value: unknown) => {
	if (value === null || value === undefined || value === '') return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};

const getOrderNo = (order: SewAndSellOrder) => order.orderNo ?? order.order_no ?? 'Sales order';
const getSalesOrderId = (order: SewAndSellOrder) =>
	optionalNumber(order.salesOrderId) ??
	optionalNumber(order.sales_order_id) ??
	optionalNumber(order.orderId) ??
	optionalNumber(order.order_id) ??
	optionalNumber(order.salesOrder?.id) ??
	optionalNumber(order.order?.id) ??
	order.id;
const getInvoiceSalesOrderId = (invoice: InvoiceResponse) =>
	optionalNumber(invoice.salesOrderId) ??
	optionalNumber(invoice.sales_order_id) ??
	optionalNumber(invoice.orderId) ??
	optionalNumber(invoice.order_id) ??
	optionalNumber(invoice.salesOrder?.id) ??
	optionalNumber(invoice.sales_order?.id) ??
	optionalNumber(invoice.order?.id);
const getInvoiceOrderNo = (invoice: InvoiceResponse) =>
	invoice.salesOrderNo ??
	invoice.sales_order_no ??
	invoice.orderNo ??
	invoice.order_no ??
	invoice.salesOrder?.orderNo ??
	invoice.salesOrder?.order_no ??
	invoice.sales_order?.orderNo ??
	invoice.sales_order?.order_no ??
	invoice.order?.orderNo ??
	invoice.order?.order_no;
const getOrderType = (order: SewAndSellOrder) => order.orderType ?? order.order_type;
const getCustomerId = (order: SewAndSellOrder) => order.customerId ?? order.customer_id;
const getCustomerName = (order: SewAndSellOrder) => order.customerName ?? order.customer_name;
const getPaymentStatus = (order: SewAndSellOrder) =>
	(order.paymentStatus ?? order.payment_status ?? 'UNPAID').toUpperCase();

const getOrderTotal = (order: SewAndSellOrder) =>
	optionalNumber(order.netAmount) ??
	optionalNumber(order.net_amount) ??
	optionalNumber(order.totalAmount) ??
	optionalNumber(order.total_amount) ??
	0;

const getOrderBalance = (order: SewAndSellOrder): number | null => {
	const explicitBalance =
		optionalNumber(order.remainingAmount) ??
		optionalNumber(order.remaining_amount) ??
		optionalNumber(order.balanceAmount) ??
		optionalNumber(order.balance_amount) ??
		optionalNumber(order.balanceDue) ??
		optionalNumber(order.balance_due) ??
		optionalNumber(order.amountDue) ??
		optionalNumber(order.amount_due) ??
		optionalNumber(order.dueAmount) ??
		optionalNumber(order.due_amount) ??
		optionalNumber(order.outstandingAmount) ??
		optionalNumber(order.outstanding_amount);
	if (explicitBalance !== null) return Math.max(0, explicitBalance);

	const total = getOrderTotal(order);
	const paid =
		optionalNumber(order.paidAmount) ??
		optionalNumber(order.paid_amount) ??
		optionalNumber(order.amountPaid) ??
		optionalNumber(order.amount_paid) ??
		optionalNumber(order.totalPaid) ??
		optionalNumber(order.total_paid) ??
		optionalNumber(order.advanceAmount) ??
		optionalNumber(order.advance_amount) ??
		optionalNumber(order.advancePayment) ??
		optionalNumber(order.advance_payment);
	if (paid !== null) return Math.max(0, total - paid);
	if (getPaymentStatus(order) === 'UNPAID') return total;
	if (getPaymentStatus(order) === 'PAID') return 0;
	return null;
};

const extractApiData = (response: unknown): unknown =>
	response && typeof response === 'object' && 'data' in response
		? (response as { data?: unknown }).data
		: response;

const getSalesOrderFromResponse = (response: unknown): SewAndSellOrder | null => {
	const firstLayer = extractApiData(response);
	const secondLayer = extractApiData(firstLayer);
	if (secondLayer && typeof secondLayer === 'object' && !Array.isArray(secondLayer)) {
		return secondLayer as SewAndSellOrder;
	}
	return null;
};

const getCustomerFullName = (customer?: Customer | null) =>
	customer
		? `${customer.first_name ?? customer.firstName ?? ''} ${
				customer.last_name ?? customer.lastName ?? ''
			}`.trim()
		: '';

const PosPage = () => {
	const [saleMode, setSaleMode] = useState<SaleMode>('READY_MADE');
	const [isOpenShiftModalVisible, setIsOpenShiftModalVisible] = useState(false);
	const [openingCash, setOpeningCash] = useState(0);
	const [showroomId, setShowroomId] = useState<number | ''>('');
	const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
	const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
	const [cartId, setCartId] = useState(0);
	const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
	// The items actually sold on the invoice currently shown — captured at
	// checkout time since cartItems is cleared right after (see
	// checkoutMutation.onSuccess). Used only for the printable invoice/PDF.
	const [checkedOutItems, setCheckedOutItems] = useState<PosCartItem[]>([]);
	const [isCreatingCart, setIsCreatingCart] = useState(false);

	// Who this sale belongs to. Null is a walk-in, which stays the default —
	// a cashier should never have to dismiss anything to take a cash sale.
	// For a Sew & Sell order the customer comes from the order itself (see
	// the effect below), so it is shown but not changeable there.
	const [posCustomer, setPosCustomer] = useState<Customer | null>(null);
	const [taxExempt, setTaxExempt] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	// The product card whose barcode-tag picker is open — manual adds always
	// go through it so the exact garment being sold is chosen (and flagged
	// SOLD at checkout). See UnitTagPickerModal.
	const [tagPickerVariant, setTagPickerVariant] = useState<PosVariantResponse | null>(null);
	// Collapsible cart panel — collapses to a slim tab on the right so the
	// cashier can reclaim grid space while browsing, then reopen it for
	// checkout. Defaults open since a live sale should show its cart
	// immediately; see PosPage discussion for the collapsed-by-default option.
	const [isCartCollapsed, setIsCartCollapsed] = useState(false);
	const [manualBalanceOrder, setManualBalanceOrder] = useState<SewAndSellOrder | null>(null);
	const [manualBalance, setManualBalance] = useState('');
	// Selling a gift card across the counter — a cart line like any other
	// (SERVICE/ADVANCE/BALANCE already work this way), minted into a real,
	// spendable GiftCard by CheckoutService once the sale clears. See the
	// GIFT_CARD lineType and CheckoutModal's success screen, which is where
	// the cashier actually sees the code to hand over.
	const [isSellGiftCardOpen, setIsSellGiftCardOpen] = useState(false);
	const [giftCardValueInput, setGiftCardValueInput] = useState('');

	// Measured (not guessed) available height for this page. The old
	// `calc(100vh - 100px)` assumed a fixed header/footer size that didn't
	// match the app's real chrome (7rem header + 3rem footer), so the panel
	// ran taller than the viewport and the Pay button ended up below the
	// fold. Instead, measure exactly where this element's top actually sits
	// and how tall the footer actually is, and size to fit precisely — self-
	// correcting for any theme/breakpoint/dark-mode difference.
	const pageWrapperRef = useRef<HTMLDivElement>(null);
	const [availableHeight, setAvailableHeight] = useState<number | null>(null);

	useLayoutEffect(() => {
		const computeAvailableHeight = () => {
			const el = pageWrapperRef.current;
			if (!el) return;
			const top = el.getBoundingClientRect().top;
			const footerEl = document.querySelector('footer.footer') as HTMLElement | null;
			const footerHeight = footerEl?.getBoundingClientRect().height ?? 0;
			setAvailableHeight(Math.max(300, Math.floor(window.innerHeight - top - footerHeight)));
		};
		computeAvailableHeight();
		// The header/footer measure themselves asynchronously (react-use's
		// useMeasure), so re-check shortly after mount in case this ran before
		// they settled, and again on resize/orientation change.
		const settleTimeout = setTimeout(computeAvailableHeight, 150);
		window.addEventListener('resize', computeAvailableHeight);
		return () => {
			clearTimeout(settleTimeout);
			window.removeEventListener('resize', computeAvailableHeight);
		};
	}, []);

	const { darkModeStatus } = useDarkMode();
	// Current Sale panel colours — light or dark to match the app theme.
	const pal = usePosPalette();
	const { hasPermission, canActOnWarehouse } = usePermission();
	const queryClient = useQueryClient();
	const canCheckout = hasPermission(PERMISSIONS.CHECKOUT_CART);
	const bgPanel = darkModeStatus ? '' : 'bg-white';
	const bgBody = darkModeStatus ? '' : 'bg-light';
	const textMain = darkModeStatus ? 'text-white' : 'text-dark';
	const borderClass = darkModeStatus ? 'border-dark' : 'border-light';

	const { data: activeShift, isLoading: isLoadingShift } = useQuery({
		queryKey: ['activeShift'],
		queryFn: getActiveShiftApi,
		retry: false,
	});

	// Light debounce so the barcode-scan input (a fast burst of keystrokes
	// ending in Enter) doesn't fire a POS-variant search request per
	// keystroke — see POS redesign implementation plan, Phase 4.
	useEffect(() => {
		const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
		return () => clearTimeout(handle);
	}, [searchTerm]);

	const activeShowroomId = activeShift?.showroomId;

	// Variant-level grid, stock-aware for the shift's locked showroom — no
	// more "pick a product, then a variant" modal step. See POS redesign
	// implementation plan, Phase 2/4.
	const {
		data: posVariants = [],
		isLoading: isLoadingVariants,
		error: posVariantsError,
	} = useQuery({
		queryKey: ['posVariants', activeShowroomId, debouncedSearch],
		queryFn: () => getPosVariantsApi(activeShowroomId as number, debouncedSearch),
		enabled: saleMode === 'READY_MADE' && Boolean(activeShowroomId),
	});

	const { data: showrooms = [] } = useQuery({
		queryKey: ['showrooms'],
		queryFn: getShowroomsApi,
	});
	// "Only a showroom-assigned user can start a cashier shift for that
	// specific showroom" — canActOnWarehouse already returns true for every
	// showroom when the user is unassigned everywhere or SUPER_ADMIN, so no
	// separate isRestricted check is needed here.
	const openableShowrooms = showrooms.filter((s) => canActOnWarehouse(s.id));
	const isShiftModalOpen = isOpenShiftModalVisible || (!isLoadingShift && !activeShift);

	const {
		data: salesOrders = [],
		isLoading: isLoadingOrders,
		error: salesOrdersError,
	} = useQuery<SewAndSellOrder[]>({
		queryKey: ['salesOrders'],
		queryFn: async () => getApiList<SewAndSellOrder>((await api.get('/sales-orders')).data),
	});
	const { data: customers = [] } = useQuery<Customer[]>({
		queryKey: ['customers'],
		queryFn: getCustomersApi,
	});
	const getOrderCustomerLabel = (order: SewAndSellOrder) =>
		getCustomerName(order) ||
		getCustomerFullName(customers.find((customer) => customer.id === getCustomerId(order))) ||
		'—';

	const openShiftMutation = useMutation({
		mutationFn: (payload: CashierShiftPayload) => openShiftApi(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['activeShift'] });
			setIsOpenShiftModalVisible(false);
			setOpeningCash(0);
			setShowroomId('');
		},
		onError: (error) => {
			showNotification(
				'Unable to open shift',
				getPosErrorMessage(error, 'The cashier shift could not be opened.'),
				'danger',
			);
		},
	});

	// Reset the picker when the modal closes, and auto-pick the only
	// available showroom when there's just one — same convenience
	// GoodsTransferIssueModal already offers for its single-warehouse case.
	useEffect(() => {
		if (!isShiftModalOpen) {
			setShowroomId('');
			return;
		}
		if (openableShowrooms.length === 1) {
			setShowroomId(openableShowrooms[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isShiftModalOpen, openableShowrooms]);

	const fetchSalesOrder = async (orderId: number) => {
		try {
			const orderResponse = await api.get(`/sales-orders/${orderId}`);
			const order = getSalesOrderFromResponse(orderResponse.data);
			if (order) return order;
		} catch {
			// Some backends only expose the list endpoint for sales orders.
		}

		const listResponse = await api.get('/sales-orders');
		return getApiList<SewAndSellOrder>(listResponse.data).find(
			(order) => getSalesOrderId(order) === orderId,
		);
	};

	const fetchSalesOrderByNo = async (orderNo: string) => {
		const listResponse = await api.get('/sales-orders');
		return getApiList<SewAndSellOrder>(listResponse.data).find(
			(order) => getOrderNo(order) === orderNo,
		);
	};

	const checkoutMutation = useMutation({
		mutationFn: async (payload: CheckoutPayload) => {
			const sewAndSellPayment = cartItems.find((item) => item.lineType === 'BALANCE');
			const paymentTotal = cartItems.reduce((total, item) => total + item.total, 0);
			const checkoutInvoice = await checkoutCartApi(payload);

			if (sewAndSellPayment) {
				const invoiceOrderId = getInvoiceSalesOrderId(checkoutInvoice);
				const invoiceOrderNo = getInvoiceOrderNo(checkoutInvoice);
				let orderToRefresh: SewAndSellOrder | undefined;
				if (invoiceOrderId && invoiceOrderId !== sewAndSellPayment.referenceId) {
					let invoiceOrder: SewAndSellOrder | undefined;
					try {
						invoiceOrder = (await fetchSalesOrder(invoiceOrderId)) ?? undefined;
					} catch {
						invoiceOrder = undefined;
					}
					const invoiceBelongsToSelectedOrder =
						(invoiceOrder && getOrderNo(invoiceOrder) === sewAndSellPayment.name) ||
						invoiceOrderNo === sewAndSellPayment.name;
					if (!invoiceBelongsToSelectedOrder) {
						throw new PaymentVerificationError(
							`Payment was not linked to ${sewAndSellPayment.name}. The invoice belongs to a different sales order.`,
						);
					}
					orderToRefresh = invoiceOrder;
				}

				const updatedOrder =
					orderToRefresh ??
					(await fetchSalesOrder(sewAndSellPayment.referenceId)) ??
					(await fetchSalesOrderByNo(sewAndSellPayment.name));
				const updatedBalance = updatedOrder ? getOrderBalance(updatedOrder) : null;
				const updatedPaymentStatus = updatedOrder ? getPaymentStatus(updatedOrder) : '';
				const expectedBalance =
					sewAndSellPayment.balanceBefore !== undefined
						? Math.max(0, sewAndSellPayment.balanceBefore - paymentTotal)
						: null;
				const paymentLooksApplied =
					updatedPaymentStatus === 'PAID' ||
					(updatedPaymentStatus !== sewAndSellPayment.paymentStatusBefore &&
						['PARTIAL', 'PAID'].includes(updatedPaymentStatus)) ||
					(expectedBalance !== null &&
						updatedBalance !== null &&
						updatedBalance <= expectedBalance + 0.01);

				if (!paymentLooksApplied) {
					throw new PaymentVerificationError(
						`The checkout returned an invoice, but ${sewAndSellPayment.name} still looks unpaid. Please check Sales Orders/Invoices before trying again.`,
					);
				}
			}

			return checkoutInvoice;
		},
		onSuccess: (data) => {
			setInvoice(data);
			// Snapshot the sold lines before the cart clears — the printable
			// invoice/PDF needs the actual items, which the checkout response
			// itself doesn't echo back.
			setCheckedOutItems(cartItems);
			setCartItems([]);
			setCartId(0);
			// The next customer through the door is not this one. Leaving them
			// attached would quietly credit the following sale — points,
			// history and all — to whoever happened to be served before.
			setPosCustomer(null);
			queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
			// Their points and balances have just moved.
			queryClient.invalidateQueries({ queryKey: ['customer-summary'] });
			queryClient.invalidateQueries({ queryKey: ['sewAndSellOrders'] });
			queryClient.invalidateQueries({ queryKey: ['invoices'] });
			// Tags just sold must drop out of the picker and show SOLD in the log.
			queryClient.invalidateQueries({ queryKey: ['sellableUnitTags'] });
			queryClient.invalidateQueries({ queryKey: ['barcodeUnitLog'] });
		},
		onError: (error) => {
			showNotification(
				error instanceof PaymentVerificationError
					? 'Payment not applied'
					: 'Checkout failed',
				getPosErrorMessage(error, 'Payment could not be completed.'),
				'danger',
			);
		},
	});

	const filteredSewAndSellOrders = salesOrders.filter((order) => {
		const searchable = `${getOrderNo(order)} ${getOrderCustomerLabel(order)}`;
		return (
			getOrderType(order) === 'SEW_AND_SELL' &&
			order.status !== 'CANCELLED' &&
			getPaymentStatus(order) !== 'PAID' &&
			searchable.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	const cartTotal = cartItems.reduce((total, item) => total + item.total, 0);
	const selectedCustomOrder = cartItems.find((item) => item.lineType === 'BALANCE');

	// A Sew & Sell balance line already knows whose order it is, so show that
	// customer on the bar rather than making the cashier attach someone who
	// is already named on the order. Resolved from the customer list already
	// loaded above; if they are not in it, the bar simply stays empty and the
	// order's own customerId is still what reaches the cart.
	useEffect(() => {
		const orderCustomerId = selectedCustomOrder?.customerId;
		if (!orderCustomerId) return;
		if (posCustomer?.id === orderCustomerId) return;
		const match = customers.find((c) => c.id === orderCustomerId);
		if (match) setPosCustomer(match);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCustomOrder?.customerId, customers]);

	const changeSaleMode = (nextMode: SaleMode) => {
		if (nextMode === saleMode) return;
		if (
			cartItems.length > 0 &&
			!window.confirm('Switching the sale type will clear the current cart. Continue?')
		) {
			return;
		}
		setSaleMode(nextMode);
		setCartItems([]);
		setCartId(0);
		setPosCustomer(null);
		setSearchTerm('');
		setTaxExempt(false);
	};

	// Every ready-made cart line is one specific physical garment, identified
	// by its own barcode tag — "tag is a must". A tag reaches here either by
	// scanning it (unit-barcode lookup below) or by picking it in
	// UnitTagPickerModal from a product card / shared variant barcode. Each
	// tag is its own qty-1 line and is flagged SOLD at checkout. Phase 7/8.
	const addVariantToCart = (variant: PosVariantResponse) => {
		if (!variant.barcodeUnitId) {
			// Nothing in the UI adds an untagged line any more; guard anyway so
			// an untagged sale can never slip through.
			setTagPickerVariant(variant);
			return;
		}
		const alreadyInCart = cartItems.some((item) => item.barcodeUnitId === variant.barcodeUnitId);
		if (alreadyInCart) {
			showNotification(
				'Already in cart',
				`This exact item (${variant.unitBarcode ?? variant.barcode}) is already in the cart.`,
				'info',
			);
			return;
		}
		setCartItems((current) => [
			...current,
			{
				key: `UNIT-${variant.barcodeUnitId}`,
				lineType: 'FINISHED_GOOD',
				referenceId: variant.id,
				variantId: variant.id,
				variantSku: variant.sku,
				name: variant.productName ?? variant.sku,
				detail: variant.sku,
				size: variant.size,
				color: variant.color,
				barcode: variant.unitBarcode ?? variant.barcode,
				barcodeUnitId: variant.barcodeUnitId,
				unitBarcode: variant.unitBarcode,
				qty: 1,
				price: Number(variant.sellingPrice),
				total: Number(variant.sellingPrice),
				discount: 0,
			},
		]);
	};

	// Tags chosen in the picker — one qty-1 line per tag, added in one update.
	const addPickedTagsToCart = (variant: PosVariantResponse, tags: PosUnitTag[]) => {
		const inCart = new Set(cartItems.map((item) => item.barcodeUnitId).filter(Boolean));
		const fresh = tags.filter((tag) => !inCart.has(tag.id));
		if (fresh.length === 0) return;
		setCartItems((current) => [
			...current,
			...fresh.map((tag) => ({
				key: `UNIT-${tag.id}`,
				lineType: 'FINISHED_GOOD' as const,
				referenceId: variant.id,
				variantId: variant.id,
				variantSku: variant.sku,
				name: variant.productName ?? variant.sku,
				detail: variant.sku,
				size: variant.size,
				color: variant.color,
				barcode: tag.barcode,
				barcodeUnitId: tag.id,
				unitBarcode: tag.barcode,
				qty: 1,
				price: Number(variant.sellingPrice),
				total: Number(variant.sellingPrice),
				discount: 0,
			})),
		]);
		showNotification(
			'Added to cart',
			`${fresh.length} × ${variant.productName ?? variant.sku} (${fresh.map((t) => t.barcode).join(', ')})`,
			'success',
		);
	};

	// Barcode scan/lookup — a keyboard-wedge USB scanner (or a typed code
	// followed by Enter) resolves straight to a variant at the shift's
	// showroom and adds one unit to the cart. See Phase 4; the camera-based
	// scan fallback described in the plan is being tracked as a fast-follow
	// rather than shipped in this pass (see the report at the end).
	const barcodeLookupMutation = useMutation({
		mutationFn: (barcode: string) => getVariantByBarcodeApi(barcode, activeShowroomId as number),
		onSuccess: (variant) => {
			// The shared product/SKU barcode doesn't say WHICH garment this is,
			// so ask for the exact tag instead of adding an untagged line.
			setSearchTerm('');
			setTagPickerVariant(variant);
		},
		onError: (error) => {
			showNotification(
				'Barcode not found',
				getPosErrorMessage(error, 'No variant matches that barcode at this showroom.'),
				'danger',
			);
		},
	});

	// A scan is tried against one physical garment's own unique tag FIRST —
	// "customer bring cloths to cashier ... that bar coded cloth flagged
	// sold" — and only falls back to the shared variant barcode (above,
	// unchanged) when the code isn't a unit tag at all (404). If it IS a
	// unit tag but can't be sold right now (wrong showroom / not yet issued
	// / already sold — a 409 from GoodsTransferService#findSellableUnit),
	// that's a hard stop with the specific reason, not a silent fallback, so
	// a cashier can't accidentally ring up an already-sold garment's shared
	// variant barcode instead. See POS redesign implementation plan, Phase 6.
	const unitBarcodeLookupMutation = useMutation({
		mutationFn: (barcode: string) => getVariantByUnitBarcodeApi(barcode, activeShowroomId as number),
		onSuccess: (variant) => {
			addVariantToCart(variant);
			setSearchTerm('');
			showNotification(
				'Added to cart',
				`${variant.productName ?? variant.sku} — tag ${variant.unitBarcode} scanned.`,
				'success',
			);
		},
		onError: (error: any, barcode) => {
			const status = error?.response?.status;
			if (status && status !== 404) {
				setSearchTerm('');
				showNotification(
					'Cannot add this item',
					getPosErrorMessage(error, 'This tagged item cannot be sold here right now.'),
					'danger',
				);
				return;
			}
			// Not a unit tag — fall back to the shared variant barcode, same
			// as every untagged item has always worked.
			barcodeLookupMutation.mutate(barcode);
		},
	});

	const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || saleMode !== 'READY_MADE') return;
		const code = searchTerm.trim();
		if (!code || !activeShowroomId) return;
		event.preventDefault();
		unitBarcodeLookupMutation.mutate(code);
	};

	const addBalanceToCart = (order: SewAndSellOrder, balance: number) => {
		if (balance <= 0) {
			showNotification('Nothing to collect', `${getOrderNo(order)} is already paid.`, 'info');
			return;
		}
		const salesOrderId = getSalesOrderId(order);
		setCartItems([
			{
				key: `BALANCE-${salesOrderId}`,
				lineType: 'BALANCE',
				referenceId: salesOrderId,
				name: getOrderNo(order),
				detail: getOrderCustomerLabel(order),
				customerId: getCustomerId(order),
				qty: 1,
				price: balance,
				total: balance,
				discount: 0,
				balanceBefore: balance,
				paymentStatusBefore: getPaymentStatus(order),
			},
		]);
	};

	// One line per card sold, so a cashier selling two cards in one ticket
	// just does this twice — CheckoutService mints one real GiftCard per
	// line (see its qty loop), so qty always stays 1 here rather than
	// letting one line stand for "N cards" ambiguously.
	const addGiftCardToCart = (value: number) => {
		if (value <= 0) return;
		setCartItems((current) => [
			...current,
			{
				key: `GIFTCARD-${Date.now()}`,
				lineType: 'GIFT_CARD',
				referenceId: 0,
				name: 'Gift Card',
				detail: `Loaded with ${formatCurrency(value)}`,
				qty: 1,
				price: value,
				total: value,
				discount: 0,
			},
		]);
		setIsSellGiftCardOpen(false);
		setGiftCardValueInput('');
	};

	const handleOrderSelect = (order: SewAndSellOrder) => {
		const balance = getOrderBalance(order);
		if (balance === null) {
			setManualBalanceOrder(order);
			setManualBalance('');
			return;
		}
		addBalanceToCart(order, balance);
	};

	const changeReadyMadeQuantity = (item: PosCartItem, increment: number) => {
		if (item.lineType !== 'FINISHED_GOOD') return;
		// A tagged unit is exactly one physical garment — it's removed via
		// the delete button, never stepped up/down. See addVariantToCart.
		if (item.barcodeUnitId) return;
		setCartItems((current) =>
			current
				.map((currentItem) => {
					if (currentItem.key !== item.key) return currentItem;
					const qty = currentItem.qty + increment;
					return { ...currentItem, qty, total: qty * currentItem.price };
				})
				.filter((currentItem) => currentItem.qty > 0),
		);
	};

	const handlePayClick = async () => {
		if (!activeShift) {
			setIsOpenShiftModalVisible(true);
			showNotification(
				'Cashier shift required',
				'Open an active cashier shift before creating a cart.',
				'warning',
			);
			return;
		}

		try {
			setIsCreatingCart(true);
			const cartRes = await createOrUpdateCartApi({
				// A Sew & Sell order already names its customer and that wins;
				// otherwise it is whoever the cashier attached, and undefined
				// for a walk-in.
				customerId: selectedCustomOrder?.customerId ?? posCustomer?.id,
				items: cartItems.map((item) => ({
					lineType: item.lineType,
					referenceId: item.referenceId,
					qty: item.qty,
					unitPrice: item.price,
					discount: item.discount,
					barcodeUnitId: item.barcodeUnitId,
				})),
			});
			if (!cartRes?.id) throw new Error('The cart API did not return a cart ID.');
			setCartId(cartRes.id);
			setIsCheckoutVisible(true);
		} catch (error) {
			showNotification(
				'Unable to create cart',
				getPosErrorMessage(error, 'The server did not create the cart.'),
				'danger',
			);
		} finally {
			setIsCreatingCart(false);
		}
	};

	const handleCloseCheckout = (isOpen: boolean) => {
		setIsCheckoutVisible(isOpen);
		if (!isOpen && invoice) {
			setInvoice(null);
			setCheckedOutItems([]);
		}
	};

	return (
		<PageWrapper
			ref={pageWrapperRef}
			className='p-0 overflow-hidden'
			// Sized from the measured `availableHeight` above (this element's
			// real top position vs. the actual footer height) so the panel is
			// pixel-exact regardless of theme/breakpoint. The CSS-var calc is
			// only a same-frame fallback for the instant before that measurement
			// runs, so there's no flash of an oversized panel on first paint.
			style={{
				height:
					availableHeight !== null
						? `${availableHeight}px`
						: 'calc(100vh - var(--header-height, 112px) - var(--footer-height, 48px))',
			}}
			requiredPermission={PERMISSIONS.CREATE_CART}>
			<Page className='p-0 m-0 h-100' container='fluid'>
				<div className='d-flex h-100' style={{ minWidth: 0 }}>
					<div
						className={`h-100 d-flex flex-column ${bgBody} border-end ${borderClass} overflow-hidden flex-grow-1`}
						style={{ minWidth: 0 }}>
						<div
							className={`${bgPanel} border-bottom ${borderClass} p-4 shadow-sm position-sticky top-0 z-1`}>
							<div className='d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3'>
								<div>
									<h4 className='mb-0 fw-bold d-flex align-items-center text-primary'>
										<Icon icon='PointOfSale' className='me-2' />
										Point of Sale
									</h4>
									<p className='small text-muted mb-0'>
										Sell finished goods or collect a custom-order balance
									</p>
								</div>
								<div
									className={`input-group shadow-sm rounded-pill overflow-hidden border ${borderClass}`}
									style={{ maxWidth: '430px' }}>
									<span
										className={`input-group-text ${bgPanel} border-0 text-muted`}>
										<Icon icon='Search' />
									</span>
									<input
										type='search'
										className={`form-control border-0 ${bgPanel} ${textMain}`}
										placeholder={
											saleMode === 'READY_MADE'
												? 'Scan or type a barcode, or search by name/SKU...'
												: 'Search order number or customer...'
										}
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
										onKeyDown={handleSearchKeyDown}
									/>
								</div>
							</div>

							<div className='d-flex flex-wrap gap-2'>
								<Button
									color={saleMode === 'READY_MADE' ? 'primary' : 'light'}
									isLight={saleMode !== 'READY_MADE'}
									icon='Checkroom'
									onClick={() => changeSaleMode('READY_MADE')}>
									Ready-Made Sale
								</Button>
								<Button
									color={saleMode === 'SEW_AND_SELL' ? 'primary' : 'light'}
									isLight={saleMode !== 'SEW_AND_SELL'}
									icon='ContentCut'
									onClick={() => changeSaleMode('SEW_AND_SELL')}>
									Sew &amp; Sell Payment
								</Button>
							</div>
						</div>

						<div className='flex-grow-1 overflow-auto p-4'>
							{saleMode === 'READY_MADE' ? (
								<div className='row g-3'>
									{!activeShowroomId && !isLoadingShift && (
										<div className='col-12 text-center text-muted py-5'>
											<Icon
												icon='Storefront'
												size='3x'
												className='mb-2 opacity-50'
											/>
											<p>Open a cashier shift to start selling.</p>
										</div>
									)}
									{isLoadingVariants && (
										<div className='col-12 text-center text-muted py-5'>
											Loading products...
										</div>
									)}
									{posVariantsError && (
										<div className='col-12'>
											<div className='alert alert-danger'>
												Unable to load products for this showroom.
											</div>
										</div>
									)}
									{!isLoadingVariants &&
										!posVariantsError &&
										posVariants.map((variant) => {
											const outOfStock = Number(variant.availableQty) <= 0;
											return (
												<div
													className='col-xl-3 col-lg-4 col-md-6'
													key={variant.id}>
													<div
														className={`card h-100 border-0 shadow-sm overflow-hidden ${bgPanel} ${textMain}`}
														style={{ borderRadius: '12px' }}>
														<div className='card-body p-3 d-flex flex-column'>
															<div className='d-flex justify-content-between align-items-start mb-2'>
																<VariantImageThumbnail
																	variantId={variant.id}
																	size={64}
																/>
																<Badge
																	color={
																		outOfStock ? 'danger' : 'success'
																	}
																	isLight>
																	{outOfStock
																		? 'Out of stock'
																		: `${variant.availableQty} left`}
																</Badge>
															</div>
															<span
																className='d-block fw-bold text-truncate'
																title={variant.productName}>
																{variant.productName ?? variant.sku}
															</span>
															<small className='text-muted d-block text-truncate'>
																{variant.sku}
															</small>
															<div className='d-flex gap-1 mt-1 flex-wrap'>
																{variant.size && (
																	<Badge color='secondary' isLight>
																		{variant.size}
																	</Badge>
																)}
																{variant.color && (
																	<Badge color='info' isLight>
																		{variant.color}
																	</Badge>
																)}
															</div>
															{variant.barcode && (
																<small className='text-muted font-monospace d-block mt-1'>
																	{variant.barcode}
																</small>
															)}
															<strong className='text-primary fs-5 d-block mt-2 mb-2'>
																{formatCurrency(variant.sellingPrice)}
															</strong>
															<div className='mt-auto'>
																{/* No qty stepper: each unit sold is one specific tagged
																    garment, chosen in the tag picker (UnitTagPickerModal). */}
																<Button
																	color='primary'
																	className='w-100'
																	icon='QrCode'
																	isDisable={outOfStock}
																	onClick={() => setTagPickerVariant(variant)}>
																	Pick barcode
																</Button>
															</div>
														</div>
													</div>
												</div>
											);
										})}
									{!isLoadingVariants &&
										!posVariantsError &&
										activeShowroomId &&
										posVariants.length === 0 && (
											<div className='col-12 text-center text-muted py-5'>
												<Icon
													icon='Inventory2'
													size='3x'
													className='mb-2 opacity-50'
												/>
												<p>No products match this search.</p>
											</div>
										)}
								</div>
							) : (
								<div className='row g-3'>
									{isLoadingOrders && (
										<div className='col-12 text-center text-muted py-5'>
											Loading orders...
										</div>
									)}
									{salesOrdersError && (
										<div className='col-12'>
											<div className='alert alert-danger'>
												Unable to load sales orders.
											</div>
										</div>
									)}
									{!isLoadingOrders &&
										!salesOrdersError &&
										filteredSewAndSellOrders.map((order) => {
											const total = getOrderTotal(order);
											const balance = getOrderBalance(order);
											const isSelected =
												selectedCustomOrder?.referenceId ===
												getSalesOrderId(order);
											return (
												<div className='col-xl-4 col-lg-6' key={order.id}>
													<button
														type='button'
														className={`card w-100 h-100 text-start shadow-sm ${
															isSelected
																? 'border-primary border-2'
																: `border ${borderClass}`
														} ${bgPanel} ${textMain}`}
														onClick={() => handleOrderSelect(order)}>
														<span className='card-body'>
															<span className='d-flex justify-content-between align-items-start mb-3'>
																<span>
																	<strong className='d-block fs-5 text-primary'>
																		{getOrderNo(order)}
																	</strong>
																	<small className='text-muted'>
																		{getOrderCustomerLabel(
																			order,
																		)}
																	</small>
																</span>
																<Badge
																	color={
																		getPaymentStatus(order) ===
																		'PARTIAL'
																			? 'warning'
																			: 'danger'
																	}
																	isLight>
																	{getPaymentStatus(order)}
																</Badge>
															</span>
															<span className='d-flex justify-content-between small text-muted mb-1'>
																<span>Order total</span>
																<span>{formatCurrency(total)}</span>
															</span>
															<span className='d-flex justify-content-between align-items-end'>
																<span className='small text-muted'>
																	{order.status}
																</span>
																<span className='text-end'>
																	<small className='d-block text-muted'>
																		Balance due
																	</small>
																	<strong
																		className={
																			balance === null
																				? 'text-warning'
																				: 'text-success'
																		}>
																		{balance === null
																			? 'Unavailable'
																			: formatCurrency(balance)}
																	</strong>
																</span>
															</span>
														</span>
													</button>
												</div>
											);
										})}
									{!isLoadingOrders &&
										!salesOrdersError &&
										filteredSewAndSellOrders.length === 0 && (
											<div className='col-12 text-center text-muted py-5'>
												<Icon
													icon='TaskAlt'
													size='3x'
													className='mb-2 opacity-50'
												/>
												<p>
													No unpaid Sew &amp; Sell orders match this
													search.
												</p>
											</div>
										)}
								</div>
							)}
						</div>
					</div>

					<div
						className='h-100 d-flex flex-column shadow-sm z-2'
						style={{
							width: isCartCollapsed ? 72 : 400,
							flexShrink: 0,
							transition: 'width 0.25s ease',
							overflow: 'hidden',
						}}>
					{isCartCollapsed ? (
						<button
							type='button'
							onClick={() => setIsCartCollapsed(false)}
							aria-label={`Show ${saleMode === 'READY_MADE' ? 'current sale' : 'order payment'} — ${cartItems.length} item${cartItems.length === 1 ? '' : 's'}, total ${formatCurrency(cartTotal)}`}
							className='h-100 w-100 d-flex flex-column align-items-center border-0'
							style={{
								background: '#1A1917',
								color: '#FAF8F5',
								paddingTop: 20,
								paddingBottom: 20,
								gap: 14,
								cursor: 'pointer',
							}}>
							<Icon icon='ChevronLeft' />
							<Icon
								icon={saleMode === 'READY_MADE' ? 'ShoppingCart' : 'ReceiptLong'}
								size='lg'
							/>
							{cartItems.length > 0 && (
								<span
									className='fw-bold small'
									style={{
										background: '#B5502E',
										color: '#FFFFFF',
										borderRadius: 999,
										padding: '2px 8px',
										fontSize: 11,
										minWidth: 20,
										textAlign: 'center',
									}}>
									{cartItems.reduce((sum, item) => sum + item.qty, 0)}
								</span>
							)}
							<span
								className='fw-bold small mt-auto mb-3'
								style={{
									writingMode: 'vertical-rl',
									transform: 'rotate(180deg)',
									letterSpacing: '0.02em',
								}}>
								{formatCurrency(cartTotal)}
							</span>
						</button>
					) : (
						<>
						<div
							style={{
								background: pal.surface,
								borderBottom: `1px solid ${pal.border}`,
								padding: '20px 24px',
							}}>
							<div className='d-flex justify-content-between align-items-start gap-2'>
								<div style={{ minWidth: 0 }}>
									<h5
										className='mb-0 d-flex align-items-center gap-2'
										style={{
											fontWeight: 600,
											fontSize: 19,
											color: pal.text,
										}}>
										<Icon
											icon={
												saleMode === 'READY_MADE'
													? 'ShoppingCart'
													: 'ReceiptLong'
											}
										/>
										{saleMode === 'READY_MADE' ? 'Current Sale' : 'Order Payment'}
									</h5>
									{activeShift && (
										<div
											className='d-flex align-items-center flex-wrap gap-2'
											style={{ marginTop: 8 }}>
											<span
												style={{
													fontSize: 11,
													fontWeight: 600,
													color: pal.success,
													background: 'rgba(31,111,76,0.12)',
													borderRadius: 999,
													padding: '3px 10px',
												}}>
												Shift Active
											</span>
											{activeShift.showroomName && (
												<span
													className='d-flex align-items-center gap-1'
													style={{ fontSize: 12, color: pal.muted }}>
													<Icon icon='Storefront' size='sm' />
													{activeShift.showroomName}
												</span>
											)}
										</div>
									)}
								</div>
								<button
									type='button'
									onClick={() => setIsCartCollapsed(true)}
									aria-label='Collapse cart panel'
									className='d-flex align-items-center justify-content-center border-0 flex-shrink-0'
									style={{
										width: 30,
										height: 30,
										borderRadius: '50%',
										background: pal.chip,
										color: pal.text,
										cursor: 'pointer',
									}}>
									<Icon icon='ChevronRight' size='sm' />
								</button>
							</div>

							{/* Who this sale belongs to. Without it a ready-made
							    sale goes through with nobody attached, which is
							    no points, no purchase history and nothing to
							    tell the cashier who they are serving. */}
							<PosCustomerBar
								customer={posCustomer}
								onSelect={setPosCustomer}
								locked={Boolean(selectedCustomOrder?.customerId)}
								earnsLoyalty={saleMode === 'READY_MADE'}
							/>

							{saleMode === 'READY_MADE' && (
								<button
									type='button'
									role='switch'
									aria-checked={taxExempt}
									onClick={() => setTaxExempt(!taxExempt)}
									className='d-flex align-items-center border-0 bg-transparent p-0'
									style={{ gap: 8, marginTop: 14, cursor: 'pointer' }}>
									<span
										style={{
											width: 34,
											height: 19,
											borderRadius: 999,
											background: taxExempt ? '#B5502E' : pal.toggleOff,
											position: 'relative',
											transition: 'background 0.15s ease',
											flexShrink: 0,
										}}>
										<span
											style={{
												position: 'absolute',
												top: 2,
												left: taxExempt ? 17 : 2,
												width: 15,
												height: 15,
												borderRadius: '50%',
												background: '#FFFFFF',
												transition: 'left 0.15s ease',
												boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
											}}
										/>
									</span>
									<span style={{ fontSize: 13, color: pal.muted, fontWeight: 500 }}>
										Tax Exempt
									</span>
								</button>
							)}

							{saleMode === 'READY_MADE' && (
								<button
									type='button'
									onClick={() => setIsSellGiftCardOpen(true)}
									className='d-flex align-items-center border-0 bg-transparent p-0'
									style={{ gap: 6, marginTop: 10, cursor: 'pointer' }}>
									<Icon icon='CardGiftcard' size='sm' style={{ color: '#B5502E' }} />
									<span style={{ fontSize: 13, color: '#B5502E', fontWeight: 600 }}>
										Sell a gift card
									</span>
								</button>
							)}
						</div>

						<div
							className='flex-grow-1 overflow-auto'
							style={{ padding: 16, background: pal.surfaceAlt }}>
							{cartItems.length === 0 ? (
								<div
									className='h-100 d-flex flex-column justify-content-center align-items-center text-center px-4'
									style={{ color: pal.faint }}>
									<Icon icon='RemoveShoppingCart' size='4x' className='mb-3' />
									<h5 style={{ fontWeight: 600, color: pal.muted }}>
										Nothing selected
									</h5>
									<p className='small' style={{ color: pal.faint }}>
										{saleMode === 'READY_MADE'
											? 'Select products from the catalogue.'
											: 'Select an unpaid custom order.'}
									</p>
								</div>
							) : (
								<div className='d-flex flex-column' style={{ gap: 10 }}>
									{cartItems.map((item) => (
										<div
											key={item.key}
											style={{
												background: pal.surface,
												border: `1px solid ${pal.border}`,
												borderRadius: 12,
												padding: 14,
											}}>
											<div className='d-flex justify-content-between gap-3'>
												<div className='overflow-hidden' style={{ minWidth: 0 }}>
													<div
														className='text-truncate'
														style={{
															fontWeight: 600,
															fontSize: 14,
															color: pal.text,
														}}>
														{item.name}
													</div>
													{item.detail && (
														<div
															className='text-truncate'
															style={{ fontSize: 12, color: pal.muted }}>
															{item.detail}
														</div>
													)}
													<div
														className='d-flex flex-wrap gap-1'
														style={{ marginTop: 6 }}>
														{item.size && (
															<span
																style={{
																	fontSize: 11,
																	color: pal.muted,
																	background: pal.chip,
																	borderRadius: 999,
																	padding: '2px 9px',
																}}>
																{item.size}
															</span>
														)}
														{item.color && (
															<span
																style={{
																	fontSize: 11,
																	color: pal.muted,
																	background: pal.chip,
																	borderRadius: 999,
																	padding: '2px 9px',
																}}>
																{item.color}
															</span>
														)}
													</div>
													{item.barcode && (
														<div
															className='font-monospace'
															style={{
																fontSize: 11,
																color: pal.muted,
																marginTop: 4,
															}}>
															{item.barcode}
														</div>
													)}
												</div>
												<button
													type='button'
													aria-label={`Remove ${item.name}`}
													onClick={() =>
														setCartItems((current) =>
															current.filter(
																(row) => row.key !== item.key,
															),
														)
													}
													className='d-flex align-items-center justify-content-center border-0 flex-shrink-0'
													style={{
														width: 28,
														height: 28,
														borderRadius: '50%',
														background: 'rgba(181,80,46,0.1)',
														color: '#B5502E',
														cursor: 'pointer',
													}}>
													<Icon icon='Delete' size='sm' />
												</button>
											</div>
											<div
												className='d-flex justify-content-between align-items-center'
												style={{ marginTop: 10 }}>
												{item.lineType === 'FINISHED_GOOD' && item.barcodeUnitId ? (
													// One unique tag = exactly one physical garment —
													// no +/- stepper, just a marker that this line is
													// locked to that one item. Remove via the delete
													// button above to scan a different unit instead.
													<div
														className='d-flex align-items-center gap-1'
														style={{
															border: `1px solid ${pal.border}`,
															borderRadius: 999,
															padding: '4px 10px',
															fontSize: 11,
															color: pal.muted,
														}}>
														<Icon icon='Sell' size='sm' />
														Tagged item
													</div>
												) : item.lineType === 'FINISHED_GOOD' ? (
													<div
														className='d-flex align-items-center'
														style={{
															border: `1px solid ${pal.border}`,
															borderRadius: 999,
														}}>
														<button
															type='button'
															aria-label='Decrease quantity'
															onClick={() =>
																changeReadyMadeQuantity(item, -1)
															}
															className='border-0 bg-transparent'
															style={{
																width: 28,
																height: 28,
																color: pal.text,
																cursor: 'pointer',
															}}>
															−
														</button>
														<strong
															style={{
																fontSize: 13,
																minWidth: 20,
																textAlign: 'center',
																color: pal.text,
															}}>
															{item.qty}
														</strong>
														<button
															type='button'
															aria-label='Increase quantity'
															onClick={() =>
																changeReadyMadeQuantity(item, 1)
															}
															className='border-0 bg-transparent'
															style={{
																width: 28,
																height: 28,
																color: pal.text,
																cursor: 'pointer',
															}}>
															+
														</button>
													</div>
												) : (
													<span
														style={{
															fontSize: 11,
															fontWeight: 600,
															color: '#2454A6',
															background: 'rgba(36,84,166,0.1)',
															borderRadius: 999,
															padding: '3px 10px',
														}}>
														Remaining balance
													</span>
												)}
												<strong style={{ color: pal.text, fontSize: 14 }}>
													{formatCurrency(item.total)}
												</strong>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div
							style={{
								padding: '18px 20px',
								background: pal.surface,
								borderTop: `1px solid ${pal.border}`,
							}}>
							<div
								className='d-flex justify-content-between'
								style={{ fontSize: 13, color: pal.muted, marginBottom: 6 }}>
								<span>Subtotal</span>
								<strong style={{ color: pal.text }}>
									{formatCurrency(cartTotal)}
								</strong>
							</div>
							{saleMode === 'READY_MADE' && (
								<div
									className='d-flex justify-content-between'
									style={{ fontSize: 13, color: pal.muted, marginBottom: 10 }}>
									<span>Tax {taxExempt ? '(exempt)' : '(0%)'}</span>
									<strong style={{ color: pal.text }}>Rs. 0.00</strong>
								</div>
							)}
							<div style={{ borderTop: `1px solid ${pal.borderSoft}`, margin: '10px 0' }} />
							<div
								className='d-flex justify-content-between align-items-baseline'
								style={{ marginBottom: 14 }}>
								<span style={{ fontSize: 15, fontWeight: 600, color: pal.text }}>
									{saleMode === 'READY_MADE' ? 'Total' : 'Balance Due'}
								</span>
								<span
									style={{
										fontSize: 26,
										fontWeight: 600,
										color: pal.text,
									}}>
									{formatCurrency(cartTotal)}
								</span>
							</div>
							{!canCheckout && (
								<div
									style={{
										fontSize: 12,
										color: pal.warnText,
										background: pal.warnBg,
										borderRadius: 8,
										padding: '8px 12px',
										marginBottom: 12,
									}}>
									Checkout permission is required.
								</div>
							)}
							<button
								type='button'
								onClick={handlePayClick}
								disabled={
									cartItems.length === 0 ||
									isCreatingCart ||
									!activeShift ||
									!canCheckout
								}
								className='w-100 border-0 d-flex align-items-center justify-content-center gap-2'
								style={{
									padding: '14px',
									borderRadius: 12,
									background:
										cartItems.length === 0 ||
										isCreatingCart ||
										!activeShift ||
										!canCheckout
											? pal.disabled
											: '#B5502E',
									color: '#FFFFFF',
									fontSize: 15,
									fontWeight: 600,
									cursor:
										cartItems.length === 0 ||
										isCreatingCart ||
										!activeShift ||
										!canCheckout
											? 'default'
											: 'pointer',
								}}>
								<Icon icon={isCreatingCart ? 'HourglassTop' : 'Payment'} />
								{isCreatingCart
									? 'Creating Cart...'
									: saleMode === 'READY_MADE'
										? 'Proceed to Pay'
										: 'Collect Balance'}
							</button>
						</div>
						</>
					)}
					</div>
				</div>

				<Modal
					isOpen={Boolean(manualBalanceOrder)}
					setIsOpen={(isOpen) => {
						if (!isOpen) setManualBalanceOrder(null);
					}}
					isCentered>
					<ModalHeader setIsOpen={() => setManualBalanceOrder(null)}>
						<ModalTitle id='manual-balance-title'>
							<Icon icon='Payments' className='me-2 text-primary' />
							Enter Remaining Balance
						</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<p className='text-muted'>
							The sales-order list does not include the paid amount for{' '}
							<strong>
								{manualBalanceOrder ? getOrderNo(manualBalanceOrder) : ''}
							</strong>
							. Enter the confirmed outstanding balance from the order record.
						</p>
						{manualBalanceOrder && getOrderTotal(manualBalanceOrder) > 0 && (
							<div className='alert alert-info py-2'>
								Order total: {formatCurrency(getOrderTotal(manualBalanceOrder))}
							</div>
						)}
						<label className='form-label fw-bold' htmlFor='manualBalance'>
							Balance to collect
						</label>
						<div className='input-group input-group-lg'>
							<span className='input-group-text'>Rs.</span>
							<input
								id='manualBalance'
								type='number'
								min={0.01}
								step='0.01'
								className='form-control fw-bold'
								value={manualBalance}
								onChange={(event) => setManualBalance(event.target.value)}
								autoFocus
							/>
						</div>
					</ModalBody>
					<ModalFooter>
						<Button color='light' onClick={() => setManualBalanceOrder(null)}>
							Cancel
						</Button>
						<Button
							color='primary'
							icon='AddShoppingCart'
							isDisable={!manualBalanceOrder || Number(manualBalance) <= 0}
							onClick={() => {
								if (!manualBalanceOrder) return;
								addBalanceToCart(manualBalanceOrder, Number(manualBalance));
								setManualBalanceOrder(null);
							}}>
							Add Payment
						</Button>
					</ModalFooter>
				</Modal>

				<Modal
					isOpen={isSellGiftCardOpen}
					setIsOpen={(isOpen) => {
						if (!isOpen) {
							setIsSellGiftCardOpen(false);
							setGiftCardValueInput('');
						}
					}}
					isCentered>
					<ModalHeader
						setIsOpen={() => {
							setIsSellGiftCardOpen(false);
							setGiftCardValueInput('');
						}}>
						<ModalTitle id='sell-gift-card-title'>
							<Icon icon='CardGiftcard' className='me-2 text-primary' />
							Sell a Gift Card
						</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<p className='text-muted'>
							Adds a gift card line to this ticket. Once the sale is paid
							for, a new card is minted with this value — the code appears
							on the receipt screen, so the customer can walk away with it.
						</p>
						<label className='form-label fw-bold' htmlFor='giftCardValueInput'>
							Card value
						</label>
						<div className='input-group input-group-lg'>
							<span className='input-group-text'>Rs.</span>
							<input
								id='giftCardValueInput'
								type='number'
								min={0.01}
								step='0.01'
								className='form-control fw-bold'
								value={giftCardValueInput}
								onChange={(event) => setGiftCardValueInput(event.target.value)}
								autoFocus
							/>
						</div>
					</ModalBody>
					<ModalFooter>
						<Button
							color='light'
							onClick={() => {
								setIsSellGiftCardOpen(false);
								setGiftCardValueInput('');
							}}>
							Cancel
						</Button>
						<Button
							color='primary'
							icon='CardGiftcard'
							isDisable={!giftCardValueInput || Number(giftCardValueInput) <= 0}
							onClick={() => addGiftCardToCart(Number(giftCardValueInput))}>
							Add to Cart
						</Button>
					</ModalFooter>
				</Modal>

				<Modal isOpen={isShiftModalOpen} setIsOpen={setIsOpenShiftModalVisible} isCentered>
					<ModalHeader
						className='bg-primary text-white border-0'
						setIsOpen={setIsOpenShiftModalVisible}>
						<ModalTitle id='open-shift-title'>
							<Icon icon='Timer' className='me-2' />
							Open Cashier Shift
						</ModalTitle>
					</ModalHeader>
					<ModalBody className='p-5 text-center bg-light'>
						<Icon
							icon='Storefront'
							size='4x'
							className='text-primary mb-3 opacity-75'
						/>
						<h3 className='fw-bold mb-2'>Start Your Shift</h3>
						<p className='text-muted mb-4'>
							Open a shift before processing sales or payments.
						</p>
						{openableShowrooms.length === 0 ? (
							<Alert color='warning' isLight className='text-start'>
								You aren&apos;t assigned to any showroom yet. Ask an admin to
								assign you one on the Showroom Access page before opening a
								shift.
							</Alert>
						) : (
							<div className='text-start mb-3'>
								<FormGroup id='showroomId' label='Showroom'>
									<Select
										name='showroomId'
										value={showroomId}
										onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
											setShowroomId(
												event.target.value ? Number(event.target.value) : '',
											)
										}
										ariaLabel='Showroom'>
										<option value=''>Select a showroom...</option>
										{openableShowrooms.map((showroom) => (
											<option key={showroom.id} value={showroom.id}>
												{showroom.name}
											</option>
										))}
									</Select>
								</FormGroup>
							</div>
						)}
						<div className='text-start'>
							<label className='form-label fw-bold text-muted' htmlFor='openingCash'>
								Opening Cash Float
							</label>
							<div className='input-group input-group-lg shadow-sm'>
								<span className='input-group-text bg-white'>Rs.</span>
								<input
									id='openingCash'
									type='number'
									min={0}
									step='0.01'
									className='form-control fw-bold'
									value={openingCash || ''}
									onChange={(event) => setOpeningCash(Number(event.target.value))}
								/>
							</div>
						</div>
					</ModalBody>
					<ModalFooter>
						<Button
							color='primary'
							className='w-100'
							onClick={() =>
								showroomId &&
								openShiftMutation.mutate({ openingCash, showroomId: Number(showroomId) })
							}
							isDisable={openShiftMutation.isPending || !showroomId}
							icon={openShiftMutation.isPending ? 'HourglassTop' : 'PlayArrow'}>
							{openShiftMutation.isPending ? 'Opening Shift...' : 'Open Shift'}
						</Button>
					</ModalFooter>
				</Modal>

				<UnitTagPickerModal
					isOpen={tagPickerVariant !== null}
					setIsOpen={(open) => {
						if (!open) setTagPickerVariant(null);
					}}
					variant={tagPickerVariant}
					showroomId={activeShowroomId}
					inCartUnitIds={cartItems
						.map((item) => item.barcodeUnitId)
						.filter((id): id is number => typeof id === 'number')}
					onAdd={addPickedTagsToCart}
				/>

				{/* Always mounted — only isOpen changes — so the shared Modal can
				    animate it in and out like every other dialog. */}
				<CheckoutModal
					total={cartTotal}
					cartId={cartId}
					isOpen={isCheckoutVisible}
					setIsOpen={handleCloseCheckout}
					isPending={checkoutMutation.isPending}
					invoice={invoice}
					onCheckout={(payload) => checkoutMutation.mutate(payload)}
					items={checkedOutItems}
					showroomName={activeShift?.showroomName}
					cashierName={activeShift?.cashierName}
					saleMode={saleMode}
					customerReference={
						checkedOutItems.find((item) => item.lineType === 'BALANCE')?.detail
					}
					customerId={posCustomer?.id ?? null}
					customerName={
						posCustomer
							? `${posCustomer.first_name ?? posCustomer.firstName ?? ''} ${
									posCustomer.last_name ?? posCustomer.lastName ?? ''
								}`.trim()
							: undefined
					}
				/>
			</Page>
		</PageWrapper>
	);
};

export default PosPage;

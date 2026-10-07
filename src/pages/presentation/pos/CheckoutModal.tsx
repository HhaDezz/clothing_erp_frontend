import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckoutPayload, InvoiceResponse, PosReceiptItem } from '../../../api/pos.api';
import { quoteLoyaltyApi } from '../../../api/loyalty.api';
import { getWalletSummaryApi, WalletSummary } from '../../../api/wallet.api';
import { getGiftCardByCodeApi, getGiftCardsForSalesOrderApi, GiftCard } from '../../../api/giftCard.api';
import { formatCurrency } from '../../../helpers/currency';
import { generateInvoicePdf } from '../../../helpers/generateInvoicePdf';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Icon from '../../../components/icon/Icon';
import Input from '../../../components/bootstrap/forms/Input';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { usePosPalette } from './posPalette';

// Same defensive field-name matching PosPage.tsx uses for an invoice's
// order id (the shape InvoiceResponse actually returns is not fully
// pinned down) — duplicated locally rather than imported since PosPage's
// helper is not exported. Used to fetch any gift card(s) minted on this
// sale for the success screen.
const optionalNumber = (value: number | string | undefined | null): number | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
};

const getSalesOrderIdFromInvoice = (invoice: InvoiceResponse | null): number | undefined =>
	invoice
		? (optionalNumber(invoice.salesOrderId) ??
			optionalNumber(invoice.sales_order_id) ??
			optionalNumber(invoice.orderId) ??
			optionalNumber(invoice.order_id) ??
			optionalNumber(invoice.salesOrder?.id) ??
			optionalNumber(invoice.order?.id) ??
			optionalNumber(invoice.sales_order?.id))
		: undefined;

interface CheckoutModalProps {
	total: number;
	cartId: number;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onCheckout: (payload: CheckoutPayload) => void;
	isPending: boolean;
	invoice: InvoiceResponse | null;
	// Everything below is only used to print/download the customer's bill —
	// none of it affects checkout behavior.
	items?: PosReceiptItem[];
	showroomName?: string;
	cashierName?: string;
	saleMode?: 'READY_MADE' | 'SEW_AND_SELL';
	customerReference?: string;
	/** Attached customer, if any. Without one there is no loyalty on this sale. */
	customerId?: number | null;
	customerName?: string;
}

interface PaymentMethodCardProps {
	method: CheckoutPayload['paymentMethod'];
	icon: string;
	label: string;
	selectedMethod: CheckoutPayload['paymentMethod'];
	onSelect: (method: CheckoutPayload['paymentMethod']) => void;
}

// Payment tile: ember accent on selection, app's default font/modal chrome
// otherwise — the tile layout/colors are kept, only the one-off ivory
// typography and modal backgrounds from the earlier pass were dropped.
const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
	method,
	icon,
	label,
	selectedMethod,
	onSelect,
}) => {
	const isSelected = selectedMethod === method;
	const pal = usePosPalette();
	return (
		<button
			type='button'
			onClick={() => onSelect(method)}
			aria-pressed={isSelected}
			className='w-100 h-100 border-0'
			style={{
				borderRadius: 12,
				border: isSelected ? '1.5px solid #B5502E' : `1px solid ${pal.border}`,
				background: isSelected ? 'rgba(181,80,46,0.07)' : pal.surface,
				transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
				transform: isSelected ? 'scale(1.02)' : 'scale(1)',
				boxShadow: isSelected ? '0 4px 14px rgba(181,80,46,0.12)' : 'none',
			}}>
			<span className='d-flex flex-column align-items-center gap-2 py-4 position-relative'>
				{isSelected && (
					<span
						className='position-absolute top-0 end-0 m-2 d-flex align-items-center justify-content-center rounded-circle'
						style={{ width: 20, height: 20, background: '#B5502E' }}>
						<Icon icon='Check' size='sm' style={{ color: '#FFFFFF' }} />
					</span>
				)}
				<Icon icon={icon} size='2x' style={{ color: isSelected ? '#B5502E' : pal.muted }} />
				<span
					className='fw-semibold small'
					style={{ color: isSelected ? '#B5502E' : pal.text }}>
					{label}
				</span>
			</span>
		</button>
	);
};

// Everything inside the modal. Kept as its own component so that it mounts
// when the modal opens and unmounts when it closes — every tender, tick box
// and snapshot below is plain component state and has to start clean for
// each sale — while the <Modal> shell around it (see CheckoutModal at the
// bottom of this file) stays mounted and can play its open/close animation.
const CheckoutModalContent: React.FC<CheckoutModalProps> = ({
	total,
	cartId,
	isOpen,
	setIsOpen,
	onCheckout,
	isPending,
	invoice,
	items = [],
	showroomName,
	cashierName,
	saleMode,
	customerReference,
	customerId,
	customerName,
}) => {
	// Dialog colours — light or dark to match the app theme.
	const pal = usePosPalette();
	const [paymentMethod, setPaymentMethod] =
		React.useState<CheckoutPayload['paymentMethod']>('CASH');
	const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
	const [amountTendered, setAmountTendered] = React.useState<number>(total);
	const [chequeDetails, setChequeDetails] = React.useState({
		chequeNo: '',
		bank: '',
		branch: '',
		chequeDate: '',
		payerName: '',
	});
	const [paymentReference, setPaymentReference] = React.useState('');

	// ─── Loyalty ───────────────────────────────────────────────────────
	// How many points the cashier wants to put against this bill. Re-quoted
	// (debounced) rather than worked out here: the backend engine is the
	// authority on caps and tier multipliers, so asking it is the only way
	// the figures on screen are guaranteed to be the figures committed.
	const [pointsToRedeem, setPointsToRedeem] = React.useState(0);
	const [debouncedPoints, setDebouncedPoints] = React.useState(0);

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedPoints(pointsToRedeem), 300);
		return () => clearTimeout(timer);
	}, [pointsToRedeem]);

	const { data: loyalty } = useQuery({
		queryKey: ['loyaltyQuote', cartId, customerId, debouncedPoints],
		queryFn: () =>
			quoteLoyaltyApi({
				customerId: customerId as number,
				cartId,
				pointsToRedeem: debouncedPoints,
			}),
		enabled: isOpen && !invoice && Boolean(customerId) && cartId > 0,
	});

	const loyaltyOn = Boolean(loyalty?.loyaltyEnabled);
	const pointsApplied = loyaltyOn ? (loyalty?.pointsApplied ?? 0) : 0;
	const redeemedValue = loyaltyOn ? (loyalty?.redeemedValue ?? 0) : 0;
	const maxRedeemable = loyaltyOn ? (loyalty?.maxRedeemablePoints ?? 0) : 0;
	const pointsToEarn = loyaltyOn ? (loyalty?.pointsToEarn ?? 0) : 0;

	// ─── Split tender: store credit, account, gift card ───────────────────
	// Each is a cashier-entered amount rather than a quoted maximum like
	// points, so each is capped client-side to the lesser of "what's
	// available" and "what's left on the bill" — the backend re-validates
	// against the live balance regardless, this is just so the cashier
	// isn't told the sale failed after typing a number that was always too
	// big.
	const { data: wallet } = useQuery<WalletSummary>({
		queryKey: ['walletSummary', customerId],
		queryFn: () => getWalletSummaryApi(customerId as number),
		enabled: isOpen && !invoice && Boolean(customerId),
	});

	const [storeCreditApplied, setStoreCreditApplied] = React.useState(0);
	const [accountCharge, setAccountCharge] = React.useState(0);

	const [giftCardCodeInput, setGiftCardCodeInput] = React.useState('');
	const [resolvedGiftCard, setResolvedGiftCard] = React.useState<GiftCard | null>(null);
	const [giftCardApplied, setGiftCardApplied] = React.useState(0);

	const giftCardLookup = useMutation({
		mutationFn: (code: string) => getGiftCardByCodeApi(code),
		onSuccess: (card) => {
			if (!card.spendable) {
				showNotification(
					'Gift card not spendable',
					`${card.code} has ${
						card.status === 'ACTIVE' ? 'no balance left' : card.status.toLowerCase().replace('_', ' ')
					}.`,
					'danger',
				);
				return;
			}
			setResolvedGiftCard(card);
			setGiftCardApplied(0);
		},
		onError: (error) =>
			showNotification(
				'Gift card not found',
				getApiErrorMessage(error, 'No gift card with that code.'),
				'danger',
			),
	});

	const clearGiftCard = () => {
		setResolvedGiftCard(null);
		setGiftCardApplied(0);
		setGiftCardCodeInput('');
	};

	// What the customer actually hands over, once every other tender has
	// paid its part.
	const balanceDue = Math.max(
		0,
		total - redeemedValue - storeCreditApplied - accountCharge - giftCardApplied,
	);

	// Re-cap store credit / account / gift card whenever the bill they're
	// chasing shrinks — e.g. the cashier just applied points on top of an
	// already-maxed store credit amount. Capping here (not just on entry)
	// is what keeps three independent inputs from summing past the bill.
	//
	// All three stop once the sale has gone through (`invoice` set): at that
	// moment PosPage clears the cart, so `total` drops to 0 and these would
	// "re-cap" every tender down to zero — which is exactly what wiped store
	// credit / account / gift card off the success screen and the printed
	// invoice, leaving only points and an unexplained "Amount Paid Rs. 0.00".
	React.useEffect(() => {
		if (invoice) return;
		const ceiling = Math.max(0, total - redeemedValue);
		setStoreCreditApplied((current) => Math.min(current, ceiling, wallet?.storeCreditBalance ?? current));
	}, [invoice, total, redeemedValue, wallet?.storeCreditBalance]);

	React.useEffect(() => {
		if (invoice) return;
		const ceiling = Math.max(0, total - redeemedValue - storeCreditApplied);
		setAccountCharge((current) => Math.min(current, ceiling, wallet?.availableCredit ?? current));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [invoice, total, redeemedValue, storeCreditApplied, wallet?.availableCredit]);

	React.useEffect(() => {
		if (invoice) return;
		const ceiling = Math.max(0, total - redeemedValue - storeCreditApplied - accountCharge);
		setGiftCardApplied((current) =>
			Math.min(current, ceiling, resolvedGiftCard?.balance ?? current),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [invoice, total, redeemedValue, storeCreditApplied, accountCharge, resolvedGiftCard?.balance]);

	// Points earned is snapshotted when the sale goes through, because the
	// quote query is disabled the moment an invoice exists — the success
	// screen still needs to show what was earned.
	const [earnedOnSale, setEarnedOnSale] = React.useState(0);
	React.useEffect(() => {
		if (invoice) return;
		setEarnedOnSale(pointsToEarn);
	}, [invoice, pointsToEarn]);

	// Same problem, same fix, for what was REDEEMED. PosPage's checkout
	// success handler resets both cartId (to 0) and the attached customer
	// (to null) the instant checkout succeeds, so by the time this
	// component re-renders with `invoice` set, the loyaltyQuote query above
	// is keyed on a cart/customer that no longer match what the sale was
	// actually quoted against — `pointsApplied`/`redeemedValue` silently
	// read back as 0 even on a sale that genuinely redeemed points. Snapshot
	// them the same way `earnedOnSale` already is, and use the snapshot
	// (not the live, now-stale query values) everywhere the success screen
	// and the printed invoice need to show what was redeemed.
	const [pointsRedeemedOnSale, setPointsRedeemedOnSale] = React.useState(0);
	const [redeemedValueOnSale, setRedeemedValueOnSale] = React.useState(0);
	React.useEffect(() => {
		if (invoice) return;
		setPointsRedeemedOnSale(pointsApplied);
		setRedeemedValueOnSale(redeemedValue);
	}, [invoice, pointsApplied, redeemedValue]);

	// `balanceDue` below is live-computed from `total`, which is PosPage's
	// `cartTotal` — also zeroed the instant checkout succeeds (the cart is
	// cleared in the same handler that resets cartId/customer above). Left
	// unguarded, that collapses `balanceDue` to 0 right as the success
	// screen mounts, which in turn makes `change` (amountTendered minus
	// balanceDue) come out as the full tendered amount instead of 0 — e.g.
	// a cash tender that exactly covered a points-reduced bill printed as
	// "Change: Rs. 1,500.00" instead of "Change: Rs. 0.00". Same snapshot
	// fix as above, one render earlier than the point of failure.
	const [balanceDueOnSale, setBalanceDueOnSale] = React.useState(0);
	React.useEffect(() => {
		if (invoice) return;
		setBalanceDueOnSale(balanceDue);
	}, [invoice, balanceDue]);

	// Any gift card(s) just sold on this ticket — checked for once an
	// invoice exists, using the order id it carries. This is the ONLY place
	// the code a customer just paid for is shown; losing it here loses the
	// money, so the success screen below makes a point of not hiding it.
	const soldOrderId = getSalesOrderIdFromInvoice(invoice);
	const { data: soldGiftCards = [] } = useQuery({
		queryKey: ['giftCardsForSalesOrder', soldOrderId],
		queryFn: () => getGiftCardsForSalesOrderApi(soldOrderId as number),
		enabled: Boolean(invoice) && Boolean(soldOrderId),
	});

	// Keep the cash field in step with what is actually owed: a cashier who
	// applies points and then sees the old, higher figure sitting in the box
	// will key it in.
	React.useEffect(() => {
		if (!invoice) setAmountTendered(balanceDue);
	}, [balanceDue, invoice]);

	// Use the frozen balanceDue once the sale has gone through — see
	// balanceDueOnSale above — and the live figure beforehand, while the
	// cashier is still adjusting tenders against the real cart total.
	const change = Math.max(0, amountTendered - (invoice ? balanceDueOnSale : balanceDue));

	// "Send change to store credit if customer agreed": ticked by the
	// cashier, cash sales with a customer only. The tick is plain state, so
	// unlike the query-derived figures above it survives checkout and the
	// success screen / printed invoice can read it directly.
	const [keepChangeAsCredit, setKeepChangeAsCredit] = React.useState(false);
	// Split: how much of the change to keep as credit. Blank means all of it;
	// anything typed is capped to the change actually due, and the rest is
	// handed back in cash.
	const [creditPortion, setCreditPortion] = React.useState<number | ''>('');
	const changeToStoreCredit =
		keepChangeAsCredit && paymentMethod === 'CASH'
			? Math.min(change, creditPortion === '' ? change : Math.max(0, Number(creditPortion)))
			: 0;
	const cashReturned = Math.max(0, change - changeToStoreCredit);
	const invoiceNo = invoice?.invoiceNo ?? invoice?.invoice_number ?? '—';
	const invoiceGrossTotal = invoice?.grossTotal ?? invoice?.gross_total ?? 0;
	const invoiceDiscount = invoice?.totalDiscount ?? invoice?.total_discount ?? 0;
	const invoiceNetTotal = invoice?.netTotal ?? invoice?.net_total ?? 0;
	const isChequeValid = Object.values(chequeDetails).every((value) => value.trim());
	const isValid =
		paymentMethod === 'CASH'
			? amountTendered >= balanceDue
			: paymentMethod === 'CHEQUE'
				? isChequeValid
				: true;

	const handleCheckout = () => {
		onCheckout({
			cartId,
			paymentMethod,
			amount: paymentMethod === 'CASH' ? amountTendered : balanceDue,
			...(pointsApplied > 0 ? { pointsToRedeem: pointsApplied } : {}),
			...(storeCreditApplied > 0 ? { storeCreditApplied } : {}),
			...(accountCharge > 0 ? { accountCharge } : {}),
			...(giftCardApplied > 0 && resolvedGiftCard
				? { giftCardCode: resolvedGiftCard.code, giftCardApplied }
				: {}),
			...(changeToStoreCredit > 0
				? { changeToStoreCredit: true, changeToStoreCreditAmount: changeToStoreCredit }
				: {}),
			...(paymentMethod === 'CHEQUE' ? chequeDetails : {}),
			...(paymentReference.trim()
				? { notes: `${paymentMethod} reference: ${paymentReference.trim()}` }
				: {}),
		});
	};

	const updateChequeDetail = (field: keyof typeof chequeDetails, value: string) => {
		setChequeDetails((current) => ({ ...current, [field]: value }));
	};

	const handlePrintInvoice = async () => {
		if (!invoice) return;
		setIsGeneratingPdf(true);
		try {
			await generateInvoicePdf({
				invoiceNo,
				items,
				grossTotal: invoiceGrossTotal,
				discount: invoiceDiscount,
				netTotal: invoiceNetTotal,
				paymentMethod,
				amountTendered: paymentMethod === 'CASH' ? amountTendered : undefined,
				change: paymentMethod === 'CASH' ? change : undefined,
				...(changeToStoreCredit > 0 ? { changeToStoreCredit } : {}),
				showroomName,
				cashierName,
				saleMode,
				customerReference,
				// Same tenders this sale actually went through at checkout —
				// without these the printed invoice showed the full item
				// total next to a smaller amount tendered with no
				// explanation of where the rest went. See generateInvoicePdf's
				// otherTenders/"Balance Due" section.
				// Uses the snapshot, not the live loyalty-query values — see
				// the pointsRedeemedOnSale/redeemedValueOnSale comment above;
				// by the time this success-screen button exists, the live
				// values have already gone stale to 0.
				...(redeemedValueOnSale > 0
					? { redeemedValue: redeemedValueOnSale, pointsApplied: pointsRedeemedOnSale }
					: {}),
				...(storeCreditApplied > 0 ? { storeCreditApplied } : {}),
				...(accountCharge > 0 ? { accountCharge } : {}),
				...(giftCardApplied > 0
					? { giftCardApplied, giftCardCode: resolvedGiftCard?.code }
					: {}),
			});
		} catch (error) {
			showNotification(
				'Could not generate invoice',
				'The PDF could not be created. Please try again.',
				'danger',
			);
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	// Shared styling for native text/date inputs — ivory panel colors kept,
	// no custom font.
	const fieldStyle: React.CSSProperties = {
		border: `1px solid ${pal.border}`,
		borderRadius: 8,
		background: pal.surface,
		color: pal.text,
	};

	const quickAmountButton = (label: string, onClick: () => void) => (
		<button
			key={label}
			type='button'
			onClick={onClick}
			className='border-0'
			style={{
				padding: '8px 16px',
				borderRadius: 999,
				background: pal.chip,
				color: pal.text,
				fontSize: 13,
				fontWeight: 600,
			}}>
			{label}
		</button>
	);

	return (
		<>
			{!invoice && (
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='checkout-title'>
						<Icon icon='PointOfSale' className='me-2 text-primary' />
						Secure Checkout
					</ModalTitle>
				</ModalHeader>
			)}
			<ModalBody className={invoice ? 'p-0' : 'p-4'}>
				{invoice ? (
					<div
						className='text-center rounded p-5 shadow-sm'
						style={{
							minHeight: '500px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
						}}>
						<div className='mb-4'>
							<Icon icon='CheckCircle' size='4x' style={{ color: pal.success }} />
						</div>
						<h2 className='mb-3 fw-bold' style={{ color: pal.success }}>
							Payment Successful!
						</h2>
						<p className='fs-5 text-muted mb-4'>
							Invoice No: <strong style={{ color: pal.text }}>{invoiceNo}</strong>
						</p>

						<div className='row justify-content-center'>
							<div className='col-md-8 col-lg-6'>
								{items.length > 0 && (
									<div
										className='text-start mb-3 p-3'
										style={{
											background: pal.surface,
											border: `1px solid ${pal.border}`,
											borderRadius: 16,
										}}>
										{items.map((item, index) => {
											const detailParts = [item.detail, item.size, item.color].filter(
												Boolean,
											);
											return (
												<div
													key={`${item.name}-${index}`}
													className={`d-flex justify-content-between align-items-start ${
														index < items.length - 1 ? 'mb-2 pb-2 border-bottom' : ''
													}`}
													style={{ borderColor: pal.border }}>
													<div className='text-start'>
														<div className='fw-semibold small' style={{ color: pal.text }}>
															{item.name}
														</div>
														<div className='text-muted' style={{ fontSize: 12 }}>
															{detailParts.length ? `${detailParts.join(' · ')} · ` : ''}
															Qty {item.qty}
														</div>
													</div>
													<strong className='small' style={{ color: pal.text }}>
														{formatCurrency(item.total)}
													</strong>
												</div>
											);
										})}
									</div>
								)}
								<div
									className='p-4'
									style={{
										background: pal.surface,
										border: `1px solid ${pal.border}`,
										borderRadius: 16,
									}}>
									<div
										className='d-flex justify-content-between fs-5 mb-3'
										style={{ color: pal.muted }}>
										<span>Gross Total</span>
										<span>{formatCurrency(invoiceGrossTotal)}</span>
									</div>
									<div
										className='d-flex justify-content-between fs-5 mb-3'
										style={{ color: '#B5502E' }}>
										<span>Discount</span>
										<span>-{formatCurrency(invoiceDiscount)}</span>
									</div>
									<div style={{ borderTop: `1px solid ${pal.border}`, margin: '12px 0' }} />
									<div
										className='d-flex justify-content-between align-items-center'
										style={{ color: pal.text }}>
										<span className='fs-4 fw-semibold'>Total</span>
										<span className='fw-bold' style={{ fontSize: 30 }}>
											{formatCurrency(invoiceNetTotal)}
										</span>
									</div>
									{/* "this page should clearly show 100 points redeemed" — every
									    non-cash tender as its own deduction under the Total, then what
									    was actually paid. Points and the paid figure come from
									    snapshots: their live values have gone stale by the time this
									    screen renders. */}
									{(redeemedValueOnSale > 0 ||
										storeCreditApplied > 0 ||
										accountCharge > 0 ||
										giftCardApplied > 0) && (
										<>
											{redeemedValueOnSale > 0 && (
												<div
													className='d-flex justify-content-between fs-5 mt-3'
													style={{ color: pal.success }}>
													<span>Loyalty Points Redeemed (-{pointsRedeemedOnSale} pts)</span>
													<span>-{formatCurrency(redeemedValueOnSale)}</span>
												</div>
											)}
											{storeCreditApplied > 0 && (
												<div
													className='d-flex justify-content-between fs-5 mt-3'
													style={{ color: pal.success }}>
													<span>Store Credit</span>
													<span>-{formatCurrency(storeCreditApplied)}</span>
												</div>
											)}
											{accountCharge > 0 && (
												<div
													className='d-flex justify-content-between fs-5 mt-3'
													style={{ color: pal.success }}>
													<span>Charged to Account</span>
													<span>-{formatCurrency(accountCharge)}</span>
												</div>
											)}
											{giftCardApplied > 0 && (
												<div
													className='d-flex justify-content-between fs-5 mt-3'
													style={{ color: pal.success }}>
													<span>Gift Card{resolvedGiftCard?.code ? ` (${resolvedGiftCard.code})` : ''}</span>
													<span>-{formatCurrency(giftCardApplied)}</span>
												</div>
											)}
											<div style={{ borderTop: `1px solid ${pal.border}`, margin: '12px 0' }} />
											<div
												className='d-flex justify-content-between align-items-center'
												style={{ color: pal.text }}>
												<span className='fs-4 fw-semibold'>Amount Paid</span>
												<span className='fw-bold' style={{ fontSize: 30, color: pal.success }}>
													{formatCurrency(balanceDueOnSale)}
												</span>
											</div>
										</>
									)}
								</div>

								{/* Any gift card(s) just sold on this ticket. This is
								    the one and only place the code is shown — nothing
								    else about a gift card is worth anything without
								    it, so it gets its own loud, unmissable card rather
								    than a line of small print. */}
								{soldGiftCards.length > 0 && (
									<div
										className='text-start mt-3 p-3'
										style={{
											background: 'rgba(31,111,76,0.08)',
											border: '1.5px dashed #1F6F4C',
											borderRadius: 16,
										}}>
										<div
											className='text-uppercase mb-2'
											style={{
												color: pal.success,
												fontWeight: 700,
												fontSize: 12,
												letterSpacing: '0.06em',
											}}>
											<Icon icon='CardGiftcard' size='sm' className='me-1' />
											Gift card{soldGiftCards.length > 1 ? 's' : ''} sold — write this down
										</div>
										{soldGiftCards.map((card) => (
											<div
												key={card.id}
												className='d-flex align-items-center justify-content-between mb-1'>
												<span
													className='fw-bold'
													style={{
														fontSize: 20,
														letterSpacing: '0.04em',
														color: pal.text,
														fontFamily: 'monospace',
													}}>
													{card.code}
												</span>
												<span style={{ fontSize: 14, color: pal.success, fontWeight: 600 }}>
													{formatCurrency(card.balance)}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className='mt-5 d-flex justify-content-center gap-2'>
							<button
								type='button'
								onClick={handlePrintInvoice}
								disabled={isGeneratingPdf}
								className='border-0 d-inline-flex align-items-center gap-2'
								style={{
									padding: '14px 24px',
									borderRadius: 12,
									background: pal.chip,
									color: pal.text,
									fontSize: 15,
									fontWeight: 600,
									opacity: isGeneratingPdf ? 0.7 : 1,
								}}>
								<Icon icon={isGeneratingPdf ? 'HourglassTop' : 'Print'} />
								{isGeneratingPdf ? 'Preparing...' : 'Print Invoice'}
							</button>
							<button
								type='button'
								onClick={() => setIsOpen(false)}
								className='border-0 d-inline-flex align-items-center gap-2'
								style={{
									padding: '14px 32px',
									borderRadius: 12,
									background: '#B5502E',
									color: '#FFFFFF',
									fontSize: 15,
									fontWeight: 600,
								}}>
								<Icon icon='AddShoppingCart' />
								Start New Sale
							</button>
							{(earnedOnSale > 0 || pointsRedeemedOnSale > 0 || changeToStoreCredit > 0) && (
								<div
									className='mt-3'
									style={{ fontSize: 13, color: pal.muted }}>
									{earnedOnSale > 0 && (
										<span>
											{customerName ? `${customerName} earned ` : 'Earned '}
											<strong>{earnedOnSale}</strong> point
											{earnedOnSale === 1 ? '' : 's'}
										</span>
									)}
									{earnedOnSale > 0 && pointsRedeemedOnSale > 0 && <span> · </span>}
									{pointsRedeemedOnSale > 0 && (
										<span>
											<strong>{pointsRedeemedOnSale}</strong> point
											{pointsRedeemedOnSale === 1 ? '' : 's'} redeemed
											{redeemedValueOnSale > 0
												? ` (${formatCurrency(redeemedValueOnSale)})`
												: ''}
										</span>
									)}
									{changeToStoreCredit > 0 && (
										<span>
											{earnedOnSale > 0 || pointsRedeemedOnSale > 0 ? ' · ' : ''}
											<strong>{formatCurrency(changeToStoreCredit)}</strong> of the change added to store
											credit
											{cashReturned > 0 ? ` · ${formatCurrency(cashReturned)} returned in cash` : ''}
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className='row g-5'>
						<div className='col-lg-6'>
							{/* Loyalty. Shown only when the scheme is on AND a
							    customer is attached — a walk-in sale should not
							    be cluttered with a panel that can do nothing. */}
							{loyaltyOn && (
								<div
									className='mb-4 p-3'
									style={{ background: pal.chip, borderRadius: 12 }}>
									<div className='d-flex align-items-center justify-content-between mb-2'>
										<span
											className='text-uppercase'
											style={{
												color: pal.muted,
												fontWeight: 700,
												fontSize: 12,
												letterSpacing: '0.06em',
											}}>
											Loyalty
										</span>
										{loyalty?.tierName && (
											<span
												style={{
													fontSize: 11,
													fontWeight: 700,
													color: '#B5502E',
													background: 'rgba(181,80,46,0.10)',
													borderRadius: 999,
													padding: '3px 10px',
												}}>
												{loyalty.tierName}
											</span>
										)}
									</div>

									<div
										className='d-flex align-items-baseline gap-2 mb-2'
										style={{ fontSize: 13, color: pal.text }}>
										<span style={{ fontWeight: 700, fontSize: 20 }}>
											{loyalty?.pointsBalance ?? 0}
										</span>
										<span style={{ color: pal.muted }}>
											points available
											{loyalty?.pointsBalanceValue
												? ` · worth ${formatCurrency(loyalty.pointsBalanceValue)}`
												: ''}
										</span>
									</div>

									{maxRedeemable > 0 ? (
										<>
											<label
												htmlFor='pointsToRedeem'
												className='d-block mb-1'
												style={{ fontSize: 12, color: pal.muted }}>
												Apply points — up to {maxRedeemable} on this bill
											</label>
											<div className='d-flex align-items-center gap-2'>
												<input
													id='pointsToRedeem'
													type='number'
													min={0}
													max={maxRedeemable}
													value={pointsToRedeem || ''}
													placeholder='0'
													onChange={(e) =>
														setPointsToRedeem(
															Math.max(
																0,
																Math.min(
																	maxRedeemable,
																	Number(e.target.value) || 0,
																),
															),
														)
													}
													className='form-control'
													style={fieldStyle}
												/>
												<button
													type='button'
													onClick={() => setPointsToRedeem(maxRedeemable)}
													className='border-0 flex-shrink-0'
													style={{
														padding: '8px 16px',
														borderRadius: 999,
														background: '#1F6F4C',
														color: '#FFFFFF',
														fontSize: 13,
														fontWeight: 600,
													}}>
													Use max
												</button>
												{pointsToRedeem > 0 && (
													<button
														type='button'
														onClick={() => setPointsToRedeem(0)}
														className='border-0 flex-shrink-0'
														style={{
															padding: '8px 14px',
															borderRadius: 999,
															background: pal.border,
															color: pal.text,
															fontSize: 13,
															fontWeight: 600,
														}}>
														Clear
													</button>
												)}
											</div>
											{pointsApplied > 0 && (
												<div
													className='mt-2'
													style={{ fontSize: 13, color: pal.success, fontWeight: 600 }}>
													{pointsApplied} points applied ·{' '}
													{formatCurrency(redeemedValue)} off
												</div>
											)}
										</>
									) : (
										<div style={{ fontSize: 12, color: pal.muted }}>
											Nothing can be redeemed on this bill.
										</div>
									)}

									{/* The engine's own reasons — why a cap bit, why a
									    line earned nothing. Better from the source than
									    guessed at here. */}
									{loyalty?.notes?.length ? (
										<ul
											className='mb-0 mt-2 ps-3'
											style={{ fontSize: 11, color: pal.muted }}>
											{loyalty.notes.map((note) => (
												<li key={note}>{note}</li>
											))}
										</ul>
									) : null}

									{pointsToEarn > 0 && (
										<div
											className='mt-2 pt-2'
											style={{
												borderTop: `1px solid ${pal.border}`,
												fontSize: 13,
												color: pal.text,
											}}>
											Earns <strong>{pointsToEarn}</strong> point
											{pointsToEarn === 1 ? '' : 's'} on this sale
										</div>
									)}
								</div>
							)}

							{/* Split tender: store credit, account, gift card. Store
							    credit and account only make sense with a customer
							    attached (both belong to someone); a gift card is a
							    bearer instrument and works on any sale — so this panel
							    is always shown. It used to be hidden unless the
							    customer had store credit / an account or a card was
							    ALREADY resolved, but the code box that resolves a card
							    lives inside it, so on most sales there was no way to
							    redeem a gift card at all. */}
							{!invoice && (
								<div
									className='mb-4 p-3'
									style={{ background: pal.chip, borderRadius: 12 }}>
									<span
										className='d-block mb-2 text-uppercase'
										style={{
											color: pal.muted,
											fontWeight: 700,
											fontSize: 12,
											letterSpacing: '0.06em',
										}}>
										Store Credit &amp; Gift Cards
									</span>

									{customerId && wallet && wallet.storeCreditBalance > 0 && (
										<div className='mb-3'>
											<label
												htmlFor='storeCreditApplied'
												className='d-block mb-1'
												style={{ fontSize: 12, color: pal.muted }}>
												Store credit — {formatCurrency(wallet.storeCreditBalance)} available
											</label>
											<div className='d-flex align-items-center gap-2'>
												<input
													id='storeCreditApplied'
													type='number'
													min={0}
													max={Math.min(wallet.storeCreditBalance, total - redeemedValue)}
													value={storeCreditApplied || ''}
													placeholder='0'
													onChange={(e) =>
														setStoreCreditApplied(
															Math.max(
																0,
																Math.min(
																	wallet.storeCreditBalance,
																	total - redeemedValue,
																	Number(e.target.value) || 0,
																),
															),
														)
													}
													className='form-control'
													style={fieldStyle}
												/>
												<button
													type='button'
													onClick={() =>
														setStoreCreditApplied(
															Math.min(wallet.storeCreditBalance, total - redeemedValue),
														)
													}
													className='border-0 flex-shrink-0'
													style={{
														padding: '8px 16px',
														borderRadius: 999,
														background: '#1F6F4C',
														color: '#FFFFFF',
														fontSize: 13,
														fontWeight: 600,
													}}>
													Use max
												</button>
												{storeCreditApplied > 0 && (
													<button
														type='button'
														onClick={() => setStoreCreditApplied(0)}
														className='border-0 flex-shrink-0'
														style={{
															padding: '8px 14px',
															borderRadius: 999,
															background: pal.border,
															color: pal.text,
															fontSize: 13,
															fontWeight: 600,
														}}>
														Clear
													</button>
												)}
											</div>
										</div>
									)}

									{customerId && wallet && wallet.hasAccountFacility && (
										<div className='mb-3'>
											<label
												htmlFor='accountCharge'
												className='d-block mb-1'
												style={{ fontSize: 12, color: pal.muted }}>
												Charge to account — {formatCurrency(wallet.availableCredit)}{' '}
												headroom left
											</label>
											<div className='d-flex align-items-center gap-2'>
												<input
													id='accountCharge'
													type='number'
													min={0}
													max={Math.min(
														wallet.availableCredit,
														total - redeemedValue - storeCreditApplied,
													)}
													value={accountCharge || ''}
													placeholder='0'
													onChange={(e) =>
														setAccountCharge(
															Math.max(
																0,
																Math.min(
																	wallet.availableCredit,
																	total - redeemedValue - storeCreditApplied,
																	Number(e.target.value) || 0,
																),
															),
														)
													}
													className='form-control'
													style={fieldStyle}
												/>
												<button
													type='button'
													onClick={() =>
														setAccountCharge(
															Math.min(
																wallet.availableCredit,
																total - redeemedValue - storeCreditApplied,
															),
														)
													}
													className='border-0 flex-shrink-0'
													style={{
														padding: '8px 16px',
														borderRadius: 999,
														background: '#1F6F4C',
														color: '#FFFFFF',
														fontSize: 13,
														fontWeight: 600,
													}}>
													Use max
												</button>
												{accountCharge > 0 && (
													<button
														type='button'
														onClick={() => setAccountCharge(0)}
														className='border-0 flex-shrink-0'
														style={{
															padding: '8px 14px',
															borderRadius: 999,
															background: pal.border,
															color: pal.text,
															fontSize: 13,
															fontWeight: 600,
														}}>
														Clear
													</button>
												)}
											</div>
										</div>
									)}

									<div>
										<label
											className='d-block mb-1'
											style={{ fontSize: 12, color: pal.muted }}>
											Gift card
										</label>
										{!resolvedGiftCard ? (
											<div className='d-flex align-items-center gap-2'>
												<input
													type='text'
													placeholder='Scan or type the card code'
													value={giftCardCodeInput}
													onChange={(e) => setGiftCardCodeInput(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' && giftCardCodeInput.trim()) {
															giftCardLookup.mutate(giftCardCodeInput.trim());
														}
													}}
													className='form-control'
													style={fieldStyle}
												/>
												<button
													type='button'
													disabled={!giftCardCodeInput.trim() || giftCardLookup.isPending}
													onClick={() => giftCardLookup.mutate(giftCardCodeInput.trim())}
													className='border-0 flex-shrink-0'
													style={{
														padding: '8px 16px',
														borderRadius: 999,
														background: '#1F6F4C',
														color: '#FFFFFF',
														fontSize: 13,
														fontWeight: 600,
														opacity: !giftCardCodeInput.trim() ? 0.6 : 1,
													}}>
													{giftCardLookup.isPending ? '...' : 'Apply'}
												</button>
											</div>
										) : (
											<>
												<div
													className='d-flex align-items-center justify-content-between mb-2'
													style={{ fontSize: 13, color: pal.text }}>
													<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
														{resolvedGiftCard.code}
													</span>
													<span style={{ color: pal.muted }}>
														{formatCurrency(resolvedGiftCard.balance)} on card
													</span>
												</div>
												<div className='d-flex align-items-center gap-2'>
													<input
														type='number'
														min={0}
														max={Math.min(
															resolvedGiftCard.balance,
															total - redeemedValue - storeCreditApplied - accountCharge,
														)}
														value={giftCardApplied || ''}
														placeholder='0'
														onChange={(e) =>
															setGiftCardApplied(
																Math.max(
																	0,
																	Math.min(
																		resolvedGiftCard.balance,
																		total -
																			redeemedValue -
																			storeCreditApplied -
																			accountCharge,
																		Number(e.target.value) || 0,
																	),
																),
															)
														}
														className='form-control'
														style={fieldStyle}
													/>
													<button
														type='button'
														onClick={() =>
															setGiftCardApplied(
																Math.min(
																	resolvedGiftCard.balance,
																	total -
																		redeemedValue -
																		storeCreditApplied -
																		accountCharge,
																),
															)
														}
														className='border-0 flex-shrink-0'
														style={{
															padding: '8px 16px',
															borderRadius: 999,
															background: '#1F6F4C',
															color: '#FFFFFF',
															fontSize: 13,
															fontWeight: 600,
														}}>
														Use max
													</button>
													<button
														type='button'
														onClick={clearGiftCard}
														className='border-0 flex-shrink-0'
														style={{
															padding: '8px 14px',
															borderRadius: 999,
															background: pal.border,
															color: pal.text,
															fontSize: 13,
															fontWeight: 600,
														}}>
														Remove
													</button>
												</div>
											</>
										)}
									</div>

									{(storeCreditApplied > 0 || accountCharge > 0 || giftCardApplied > 0) && (
										<div
											className='mt-2 pt-2'
											style={{
												borderTop: `1px solid ${pal.border}`,
												fontSize: 13,
												color: pal.success,
												fontWeight: 600,
											}}>
											{formatCurrency(storeCreditApplied + accountCharge + giftCardApplied)}{' '}
											off this bill
										</div>
									)}
								</div>
							)}

							<h6
								className='mb-3 text-uppercase'
								style={{ color: pal.muted, fontWeight: 700, fontSize: 12, letterSpacing: '0.06em' }}>
								Select Payment Method
							</h6>
							<div className='row row-cols-2 g-2 mb-4'>
								<div className='col'>
									<PaymentMethodCard
										method='CASH'
										icon='Payments'
										label='Cash'
										selectedMethod={paymentMethod}
										onSelect={setPaymentMethod}
									/>
								</div>
								<div className='col'>
									<PaymentMethodCard
										method='CARD'
										icon='CreditCard'
										label='Card'
										selectedMethod={paymentMethod}
										onSelect={setPaymentMethod}
									/>
								</div>
								<div className='col'>
									<PaymentMethodCard
										method='CHEQUE'
										icon='RequestQuote'
										label='Cheque'
										selectedMethod={paymentMethod}
										onSelect={setPaymentMethod}
									/>
								</div>
								<div className='col'>
									<PaymentMethodCard
										method='TRANSFER'
										icon='AccountBalance'
										label='Bank Transfer'
										selectedMethod={paymentMethod}
										onSelect={setPaymentMethod}
									/>
								</div>
							</div>

							{paymentMethod === 'CASH' && (
								<div
									className='p-4'
									style={{ background: pal.surface, border: `1px solid ${pal.border}`, borderRadius: 12 }}>
									<label
										className='form-label fw-bold text-uppercase small'
										htmlFor='amountTendered'
										style={{ color: pal.muted, letterSpacing: '0.04em' }}>
										Amount Tendered
									</label>
									<div
										className='d-flex align-items-center mb-3'
										style={{
											background: pal.surfaceAlt,
											border: `1px solid ${pal.border}`,
											borderRadius: 10,
											padding: '4px 16px',
										}}>
										<span className='fs-4 me-2' style={{ color: pal.muted }}>
											Rs.
										</span>
										<input
											id='amountTendered'
											type='number'
											className='form-control border-0 fs-3 fw-bold p-0'
											style={{ background: 'transparent', color: pal.text, boxShadow: 'none' }}
											value={amountTendered || ''}
											onChange={(e) => setAmountTendered(Number(e.target.value))}
											placeholder='0.00'
											autoFocus
										/>
									</div>
									<div className='d-flex gap-2 justify-content-end'>
										{quickAmountButton('Exact', () => setAmountTendered(balanceDue))}
										{quickAmountButton('+Rs. 100', () => setAmountTendered(total + 100))}
										{quickAmountButton('+Rs. 500', () => setAmountTendered(total + 500))}
									</div>
								</div>
							)}

							{paymentMethod === 'CHEQUE' && (
								<div
									className='p-4'
									style={{ background: pal.surface, border: `1px solid ${pal.border}`, borderRadius: 12 }}>
									<div
										className='d-flex align-items-start gap-2 mb-3'
										style={{
											background: pal.warnBg,
											color: pal.warnText,
											borderRadius: 8,
											padding: '10px 14px',
											fontSize: 13,
										}}>
										<Icon icon='Info' size='sm' className='mt-1' />
										<span>
											The cheque will be recorded as received/pending until it is
											realized.
										</span>
									</div>
									<div className='row g-3'>
										{[
											['chequeNo', 'Cheque Number', 'text'],
											['bank', 'Bank', 'text'],
											['branch', 'Branch', 'text'],
											['chequeDate', 'Cheque Date', 'date'],
											['payerName', 'Payer Name', 'text'],
										].map(([field, label, type]) => (
											<div
												className={field === 'payerName' ? 'col-12' : 'col-md-6'}
												key={field}>
												<label
													className='form-label fw-semibold small'
													htmlFor={`cheque-${field}`}
													style={{ color: pal.text }}>
													{label}
												</label>
												<input
													id={`cheque-${field}`}
													type={type}
													className='form-control'
													style={fieldStyle}
													value={chequeDetails[field as keyof typeof chequeDetails]}
													onChange={(event) =>
														updateChequeDetail(
															field as keyof typeof chequeDetails,
															event.target.value,
														)
													}
													required
												/>
											</div>
										))}
									</div>
								</div>
							)}

							{(paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') && (
								<div
									className='p-4'
									style={{ background: pal.surface, border: `1px solid ${pal.border}`, borderRadius: 12 }}>
									<label
										className='form-label fw-bold text-uppercase small'
										htmlFor='paymentReference'
										style={{ color: pal.muted, letterSpacing: '0.04em' }}>
										Payment Reference (optional)
									</label>
									<input
										id='paymentReference'
										type='text'
										className='form-control form-control-lg'
										style={fieldStyle}
										placeholder='Transaction or approval reference'
										value={paymentReference}
										onChange={(event) => setPaymentReference(event.target.value)}
									/>
								</div>
							)}
						</div>
						<div className='col-lg-6'>
							<div
								className='h-100 position-relative overflow-hidden'
								style={{
									background: '#1A1917',
									color: '#FAF8F5',
									borderRadius: 16,
									padding: 40,
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'center',
								}}>
								<div className='position-absolute top-0 end-0 p-4' style={{ opacity: 0.12 }}>
									<Icon icon='ReceiptLong' size='5x' />
								</div>
								<div className='position-relative' style={{ zIndex: 1 }}>
									<div className='mb-5'>
										<p
											className='text-uppercase mb-2'
											style={{ color: '#B7AD9B', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em' }}>
											Total Due
										</p>
										<h1 className='fw-bold mb-0' style={{ fontSize: 48 }}>
											{formatCurrency(balanceDue)}
										</h1>
										{/* When points, store credit, account or a gift
										    card have paid part of the bill, show the
										    arithmetic rather than a figure that silently
										    disagrees with the cart total. */}
										{(redeemedValue > 0 ||
											storeCreditApplied > 0 ||
											accountCharge > 0 ||
											giftCardApplied > 0) && (
											<div
												className='mt-2'
												style={{ fontSize: 13, color: '#B7AD9B' }}>
												{formatCurrency(total)} bill less{' '}
												{[
													redeemedValue > 0
														? `${formatCurrency(redeemedValue)} (${pointsApplied} points)`
														: null,
													storeCreditApplied > 0
														? `${formatCurrency(storeCreditApplied)} store credit`
														: null,
													accountCharge > 0
														? `${formatCurrency(accountCharge)} on account`
														: null,
													giftCardApplied > 0
														? `${formatCurrency(giftCardApplied)} gift card`
														: null,
												]
													.filter(Boolean)
													.join(' + ')}
											</div>
										)}
									</div>

									{paymentMethod === 'CASH' && (
										<div className='p-4' style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
											<div className='d-flex justify-content-between align-items-center mb-2'>
												<span className='fs-6' style={{ color: '#B7AD9B' }}>
													Tendered:
												</span>
												<span className='fs-5 fw-semibold'>{formatCurrency(amountTendered)}</span>
											</div>
											<div
												style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', margin: '12px 0' }}
											/>
											<div className='d-flex justify-content-between align-items-center'>
												<span className='fs-5 fw-semibold'>Change:</span>
												<span
													className='fw-bold'
													style={{
														fontSize: 24,
														color: isValid ? '#FAF8F5' : '#E88A6B',
													}}>
													{formatCurrency(change)}
												</span>
											</div>
											{customerId && change > 0 && (
												<div className='mt-3'>
													<label
														htmlFor='keepChangeAsCredit'
														className='d-flex align-items-start gap-2 mb-0'
														style={{ cursor: 'pointer', color: '#FAF8F5', fontSize: 14 }}>
														<input
															id='keepChangeAsCredit'
															type='checkbox'
															className='form-check-input mt-1 flex-shrink-0'
															checked={keepChangeAsCredit}
															onChange={(e) => setKeepChangeAsCredit(e.target.checked)}
														/>
														<span>
															Add change to {customerName || 'the customer'}&apos;s store credit
															<span className='d-block' style={{ color: '#B7AD9B', fontSize: 12 }}>
																Only tick this if the customer has agreed.
															</span>
														</span>
													</label>
													{keepChangeAsCredit && (
														<div className='mt-3'>
															<div className='d-flex align-items-center gap-2'>
																<input
																	id='creditPortion'
																	type='number'
																	min={0}
																	max={change}
																	step='any'
																	aria-label='Amount of change to add to store credit'
																	placeholder={String(change)}
																	className='form-control'
																	style={{ maxWidth: 160 }}
																	value={creditPortion}
																	onChange={(e) =>
																		setCreditPortion(
																			e.target.value === ''
																				? ''
																				: Math.min(change, Math.max(0, Number(e.target.value))),
																		)
																	}
																/>
																<button
																	type='button'
																	className='btn btn-sm btn-light'
																	onClick={() => setCreditPortion('')}>
																	All of it
																</button>
															</div>
															<div
																className='d-flex justify-content-between mt-2'
																style={{ fontSize: 14, color: '#B7AD9B' }}>
																<span>To store credit</span>
																<span style={{ color: '#FAF8F5' }}>
																	{formatCurrency(changeToStoreCredit)}
																</span>
															</div>
															<div
																className='d-flex justify-content-between'
																style={{ fontSize: 14, color: '#B7AD9B' }}>
																<span>Hand back in cash</span>
																<span style={{ color: '#FAF8F5', fontWeight: 700 }}>
																	{formatCurrency(cashReturned)}
																</span>
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</ModalBody>
			{!invoice && (
				<ModalFooter>
					<button
						type='button'
						onClick={() => setIsOpen(false)}
						disabled={isPending}
						className='border-0'
						style={{
							padding: '12px 28px',
							borderRadius: 10,
							background: pal.chip,
							color: pal.text,
							fontWeight: 600,
							fontSize: 14,
							opacity: isPending ? 0.6 : 1,
						}}>
						Cancel
					</button>
					<button
						type='button'
						onClick={handleCheckout}
						disabled={!isValid || isPending}
						className='border-0 d-inline-flex align-items-center gap-2'
						style={{
							padding: '12px 32px',
							borderRadius: 10,
							background: !isValid || isPending ? pal.disabled : '#B5502E',
							color: '#FFFFFF',
							fontWeight: 600,
							fontSize: 14,
							cursor: !isValid || isPending ? 'not-allowed' : 'pointer',
						}}>
						<Icon icon={isPending ? 'HourglassTop' : 'ShoppingCartCheckout'} />
						{isPending ? 'Processing...' : 'Confirm Payment'}
					</button>
				</ModalFooter>
			)}
		</>
	);
};

/**
 * The checkout dialog, on the app's standard Modal — same slide-in/fade as
 * every other modal. It used to be mounted by PosPage only while visible
 * (and returned null when closed), so the Modal's own AnimatePresence never
 * saw it go from closed to open or back: it just appeared and vanished.
 * Now the shell is always mounted and only `isOpen` changes.
 */
const CheckoutModal: React.FC<CheckoutModalProps> = (props) => {
	const { isOpen, setIsOpen } = props;
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isCentered titleId='checkout-title'>
			<CheckoutModalContent {...props} />
		</Modal>
	);
};

export default CheckoutModal;

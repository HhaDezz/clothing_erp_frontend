import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// Mirrors PurchasingInquiryReportResponse / its nested ReportLine on the
// backend (PurchasingReportService) — "view ordered items and their
// locations: how many bar coded, how many in warehouses and which, how many
// in showrooms and which, how many sold".
export type PurchasingReportLine = {
	itemId: number;
	variantId?: number | null;
	sku?: string | null;
	productName?: string | null;
	size?: string | null;
	color?: string | null;
	orderedQty: number;
	unitPrice: number;
	totalPrice: number;
	receivedQty: number;
	inWarehouseQty: number;
	warehouseBreakdown: Record<string, number>;
	barcodedQty: number;
	awaitingIssueQty: number;
	inShowroomQty: number;
	showroomBreakdown: Record<string, number>;
	soldQty: number;
	unitCostExVat?: number | null;
	unitCostIncVat?: number | null;
	sellingPrice?: number | null;
	// This line's share of the loyalty points redeemed on the sales orders
	// its sold units went out on, and their cash value — money NOT collected
	// for these goods. Absent on a backend that predates V89.
	pointsRedeemed?: number | null;
	pointsRedeemedValue?: number | null;
};

export type PurchasingInquiryReport = {
	inquiryId: number;
	inquiryNo: string;
	title?: string | null;
	status: string;
	createdAt: string;
	lines: PurchasingReportLine[];
	totalOrderedQty: number;
	totalReceivedQty: number;
	totalBarcodedQty: number;
	totalAwaitingIssueQty: number;
	totalInWarehouseQty: number;
	totalInShowroomQty: number;
	totalSoldQty: number;
	totalPointsRedeemed?: number | null;
	totalPointsRedeemedValue?: number | null;
};

export const getPurchasingInquiryReportApi = () =>
	api
		.get<ApiResponse<PurchasingInquiryReport[]>>('/reports/purchasing-inquiries')
		.then((res) => res.data.data ?? []);

// ---------------------------------------------------------------------------
// Costing / earning / margin — all computed here on the frontend from fields
// the report already returns; no backend change needed for this view.
//
// "Earning" is an ESTIMATE: sold qty × the variant's *current* selling
// price, because nothing on the traceability chain (StockBatch →
// GoodsTransferBarcodeUnit) records the actual price a unit sold for — only
// its landed cost and the variant's live selling price are available. This
// mirrors how the Live Profit report already flags approximate figures;
// discounts or later price changes on the variant are not reflected here.
//
// "Landed cost" is the cost of everything RECEIVED for a line (receivedQty
// × unit cost inc. VAT) — the actual money spent on that inquiry's stock,
// regardless of whether it has sold yet. "Cost of sold" / profit / margin
// use only what's actually sold so far (soldQty), so margin isn't diluted
// by stock that's still sitting in a warehouse or showroom.
// ---------------------------------------------------------------------------

export type LineEconomics = {
	landedCost: number | null;
	costOfSold: number | null;
	earning: number | null;
	profit: number | null;
	marginPct: number | null;
	// Loyalty points customers redeemed against this line's sold units.
	// `earning` above is already NET of pointsRedeemedValue.
	pointsRedeemed: number;
	pointsRedeemedValue: number;
};

export const computeLineEconomics = (line: PurchasingReportLine): LineEconomics => {
	const unitCost = line.unitCostIncVat ?? null;
	const sellingPrice = line.sellingPrice ?? null;

	const landedCost = unitCost !== null ? line.receivedQty * unitCost : null;
	const costOfSold = unitCost !== null ? line.soldQty * unitCost : null;
	const pointsRedeemed = Number(line.pointsRedeemed) || 0;
	const pointsRedeemedValue = Number(line.pointsRedeemedValue) || 0;
	// Net of loyalty points: a sale part-settled with points brought in that
	// much less money, so it earns (and margins) that much less.
	const earning = sellingPrice !== null ? line.soldQty * sellingPrice - pointsRedeemedValue : null;
	const profit = earning !== null && costOfSold !== null ? earning - costOfSold : null;
	const marginPct = profit !== null && earning !== null && earning > 0 ? (profit / earning) * 100 : null;

	return { landedCost, costOfSold, earning, profit, marginPct, pointsRedeemed, pointsRedeemedValue };
};

export type InquiryEconomics = LineEconomics & {
	// False when not one line in this inquiry has cost data yet — e.g. an
	// inquiry whose shipment completed Higher Approval before batch-level
	// tracking shipped (see the implementation plan's "known limitation").
	// Landed cost / earning / margin stay null in that case rather than
	// showing a misleading zero.
	hasCostData: boolean;
};

export const computeInquiryEconomics = (inquiry: PurchasingInquiryReport): InquiryEconomics => {
	let landedCost = 0;
	let costOfSold = 0;
	let earning = 0;
	let pointsRedeemed = 0;
	let pointsRedeemedValue = 0;
	let hasCostData = false;

	inquiry.lines.forEach((line) => {
		const econ = computeLineEconomics(line);
		if (econ.landedCost !== null) {
			landedCost += econ.landedCost;
			hasCostData = true;
		}
		if (econ.costOfSold !== null) costOfSold += econ.costOfSold;
		if (econ.earning !== null) earning += econ.earning;
		pointsRedeemed += econ.pointsRedeemed;
		pointsRedeemedValue += econ.pointsRedeemedValue;
	});

	const profit = hasCostData ? earning - costOfSold : null;
	const marginPct = profit !== null && earning > 0 ? (profit / earning) * 100 : null;

	return {
		landedCost: hasCostData ? landedCost : null,
		costOfSold: hasCostData ? costOfSold : null,
		earning: hasCostData || earning > 0 ? earning : null,
		profit,
		marginPct,
		pointsRedeemed,
		pointsRedeemedValue,
		hasCostData,
	};
};

// ---------------------------------------------------------------------------
// Small shared display helpers used by both the report table and its detail
// modal, kept here so the two never drift apart.
// ---------------------------------------------------------------------------

export const formatQty = (value?: number | null): string =>
	value === null || value === undefined ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const formatBreakdown = (breakdown: Record<string, number>): string =>
	Object.entries(breakdown)
		.filter(([, qty]) => qty > 0)
		.map(([name, qty]) => `${name}: ${formatQty(qty)}`)
		.join(' · ');

// Non-zero (location, qty) pairs, for rendering one chip/badge per location
// instead of a single joined string — so an item sitting in several
// warehouses or showrooms at once is visibly several distinct locations,
// not one blob of text.
export const breakdownEntries = (breakdown: Record<string, number>): [string, number][] =>
	Object.entries(breakdown).filter(([, qty]) => qty > 0);

// Sums several lines' per-location breakdowns into one — used at the
// inquiry level (across every item on that inquiry) to show how many
// distinct warehouses/showrooms currently hold this inquiry's stock, even
// though each individual item might only be in one or two of them.
export const mergeBreakdowns = (breakdowns: Record<string, number>[]): Record<string, number> => {
	const merged: Record<string, number> = {};
	breakdowns.forEach((breakdown) => {
		Object.entries(breakdown).forEach(([name, qty]) => {
			if (qty > 0) merged[name] = (merged[name] ?? 0) + qty;
		});
	});
	return merged;
};

// "-100 pts (-Rs. 100.00)" style label for redeemed loyalty points; an em
// dash when nothing was redeemed. `money` is the caller's formatCurrency.
export const formatPointsRedeemed = (
	points: number,
	value: number,
	money: (amount: number) => string,
): string => (value > 0 || points > 0 ? `-${formatQty(points)} pts (-${money(value)})` : '—');

export const formatPercent = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)}%`);

// Bootstrap text-* class for a margin value — green for healthy, amber for
// thin, red for a loss, muted when there's nothing to show yet.
export const marginColorClass = (value: number | null): string => {
	if (value === null) return 'text-muted';
	if (value < 0) return 'text-danger';
	if (value < 15) return 'text-warning';
	return 'text-success';
};

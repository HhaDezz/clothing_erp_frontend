import api from '../lib/axios';

/**
 * The loyalty scheme. Every number here is set by an admin — nothing about
 * the scheme is baked into the app.
 */
export type LoyaltySettings = {
	enabled: boolean;

	// Earning
	earnAmountPerPoint: number;
	pointValue: number;
	minBillToEarn: number;

	// Redeeming
	minPointsToRedeem: number;
	maxRedeemPctOfBill: number;
	earnOnRedeemedPortion: boolean;
	/** Null means points never expire. */
	pointsExpiryMonths: number | null;

	// Per-line profit-margin guards, checked against each sale line's landed cost
	minLineMarginPct: number;
	maxLoyaltyCostPctOfMargin: number;
	/** When a line has no recorded cost: true earns anyway, false blocks it. */
	earnOnUnknownCost: boolean;

	updatedByName: string | null;
	updatedAt: string | null;
};

export type LoyaltySettingsPayload = Omit<LoyaltySettings, 'updatedByName' | 'updatedAt'>;

export type LoyaltyTier = {
	id: number;
	name: string;
	minSpend12m: number;
	earnMultiplier: number;
	birthdayBonusPoints: number;
	sortOrder: number;
	color: string | null;
};

export type LoyaltyTierPayload = Omit<LoyaltyTier, 'id'>;

export type LoyaltyLedgerEntryType =
	| 'EARN'
	| 'REDEEM'
	| 'EXPIRE'
	| 'ADJUST'
	| 'BONUS'
	| 'REVERSE';

export type LoyaltyLedgerEntry = {
	id: number;
	entryType: LoyaltyLedgerEntryType;
	/** Signed: positive adds points, negative takes them away. */
	points: number;
	remainingPoints: number;
	expiresAt: string | null;
	salesOrderId: number | null;
	orderNo: string | null;
	createdByName: string | null;
	note: string | null;
	createdAt: string;
};

/**
 * What loyalty would do to one bill. At cart time this is an estimate where
 * line costs are not yet pinned to specific stock — `costIsExact` says which,
 * and `notes` explains any guard that shaped the numbers.
 */
export type LoyaltyQuote = {
	loyaltyEnabled: boolean;
	customerId: number | null;
	tierName: string | null;
	tierMultiplier: number;
	pointsBalance: number;
	pointsBalanceValue: number;
	pointsToEarn: number;
	billNet: number;
	maxRedeemablePoints: number;
	maxRedeemableValue: number;
	pointsRequested: number;
	pointsApplied: number;
	redeemedValue: number;
	balanceDue: number;
	costIsExact: boolean;
	notes: string[];
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// ─── Settings ────────────────────────────────────────────────────────────

export const getLoyaltySettingsApi = () =>
	api.get<ApiResponse<LoyaltySettings>>('/loyalty/settings').then((res) => res.data.data);

export const updateLoyaltySettingsApi = (payload: LoyaltySettingsPayload) =>
	api.put<ApiResponse<LoyaltySettings>>('/loyalty/settings', payload).then((res) => res.data.data);

// ─── Tiers ───────────────────────────────────────────────────────────────

export const getLoyaltyTiersApi = () =>
	api.get<ApiResponse<LoyaltyTier[]>>('/loyalty/tiers').then((res) => res.data.data);

export const createLoyaltyTierApi = (payload: LoyaltyTierPayload) =>
	api.post<ApiResponse<LoyaltyTier>>('/loyalty/tiers', payload).then((res) => res.data.data);

export const updateLoyaltyTierApi = (id: number, payload: LoyaltyTierPayload) =>
	api.put<ApiResponse<LoyaltyTier>>(`/loyalty/tiers/${id}`, payload).then((res) => res.data.data);

export const deleteLoyaltyTierApi = (id: number) =>
	api.delete<ApiResponse<void>>(`/loyalty/tiers/${id}`).then((res) => res.data);

// ─── One customer's points ───────────────────────────────────────────────

export const getLoyaltyLedgerApi = (customerId: number | string) =>
	api
		.get<ApiResponse<LoyaltyLedgerEntry[]>>(`/loyalty/customers/${customerId}/ledger`)
		.then((res) => res.data.data);

export const adjustLoyaltyPointsApi = (
	customerId: number | string,
	payload: { points: number; note: string },
) =>
	api
		.post<ApiResponse<LoyaltyLedgerEntry>>(`/loyalty/customers/${customerId}/adjust`, payload)
		.then((res) => res.data.data);

export const recomputeLoyaltyBalanceApi = (customerId: number | string) =>
	api
		.post<ApiResponse<{ pointsBalance: number }>>(
			`/loyalty/customers/${customerId}/recompute-balance`,
		)
		.then((res) => res.data.data);

// ─── POS quote ───────────────────────────────────────────────────────────

export const quoteLoyaltyApi = (payload: {
	customerId: number;
	cartId: number;
	pointsToRedeem?: number;
}) => api.post<ApiResponse<LoyaltyQuote>>('/loyalty/quote', payload).then((res) => res.data.data);

// ─── Scheduled work, on demand ───────────────────────────────────────────

export const runLoyaltyExpiryApi = () =>
	api
		.post<ApiResponse<{ customersAffected: number }>>('/loyalty/run-expiry')
		.then((res) => res.data);

export const recalculateLoyaltyTiersApi = () =>
	api
		.post<ApiResponse<{ customersChanged: number }>>('/loyalty/recalculate-tiers')
		.then((res) => res.data);

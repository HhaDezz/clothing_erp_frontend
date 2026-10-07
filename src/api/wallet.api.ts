import api from '../lib/axios';

/** The two customer wallets. Point in opposite directions — see WalletType on the backend. */
export type WalletType = 'STORE_CREDIT' | 'ON_ACCOUNT';

export type WalletEntryType = 'ISSUE' | 'SPEND' | 'EXPIRE' | 'CHARGE' | 'SETTLE' | 'ADJUST' | 'REVERSE';

/** Both balances, the credit limit and the headroom left on it. */
export type WalletSummary = {
	customerId: number;
	/** Money we owe them, spendable as a tender. */
	storeCreditBalance: number;
	/** Money they owe us on their pay-later account. */
	accountBalance: number;
	creditLimit: number;
	/** creditLimit minus accountBalance, floored at zero. */
	availableCredit: number;
	/** False when no account facility has been granted (a zero limit). */
	hasAccountFacility: boolean;
};

/** One line of a customer's store-credit or account statement. */
export type WalletEntry = {
	id: number;
	wallet: WalletType;
	entryType: WalletEntryType;
	/** Signed toward this wallet's own balance. */
	amount: number;
	salesOrderId: number | null;
	orderNo: string | null;
	createdByName: string | null;
	note: string | null;
	createdAt: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const getWalletSummaryApi = (customerId: number | string) =>
	api.get<ApiResponse<WalletSummary>>(`/customers/${customerId}/wallet`).then((res) => res.data.data);

export const getWalletStatementApi = (customerId: number | string, wallet: WalletType) =>
	api
		.get<ApiResponse<WalletEntry[]>>(`/customers/${customerId}/wallet/statement`, { params: { wallet } })
		.then((res) => res.data.data);

/** Grants store credit — a refund taken as credit, or a goodwill gesture. Note required. */
export const issueStoreCreditApi = (customerId: number | string, payload: { amount: number; note: string }) =>
	api
		.post<ApiResponse<WalletEntry>>(`/customers/${customerId}/wallet/store-credit/issue`, payload)
		.then((res) => res.data.data);

/** Records a payment against what the customer owes on account. Note required. */
export const settleAccountApi = (customerId: number | string, payload: { amount: number; note: string }) =>
	api
		.post<ApiResponse<WalletEntry>>(`/customers/${customerId}/wallet/account/settle`, payload)
		.then((res) => res.data.data);

/** Sets how much this customer may owe at once. Zero withdraws the facility. */
export const setCreditLimitApi = (customerId: number | string, creditLimit: number) =>
	api
		.put<ApiResponse<unknown>>(`/customers/${customerId}/wallet/credit-limit`, { creditLimit })
		.then((res) => res.data.data);

/** A manager's correction to either wallet. Note required. */
export const adjustWalletApi = (
	customerId: number | string,
	payload: { wallet: WalletType; amount: number; note: string },
) =>
	api
		.post<ApiResponse<WalletEntry>>(`/customers/${customerId}/wallet/adjust`, payload)
		.then((res) => res.data.data);

export const recomputeWalletBalanceApi = (customerId: number | string, wallet: WalletType) =>
	api
		.post<ApiResponse<{ balance: number }>>(`/customers/${customerId}/wallet/recompute-balance`, null, {
			params: { wallet },
		})
		.then((res) => res.data.data);

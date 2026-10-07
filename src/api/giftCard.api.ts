import api from '../lib/axios';

export type GiftCardStatus = 'ACTIVE' | 'USED_UP' | 'VOID' | 'EXPIRED';

export type GiftCard = {
	id: number;
	code: string;
	initialValue: number;
	balance: number;
	status: GiftCardStatus;
	/** Whether it can be spent right now — status, balance and expiry together. */
	spendable: boolean;
	expiresAt: string | null;
	issuedToCustomerId: number | null;
	issuedToCustomerName: string | null;
	issuedByName: string | null;
	/** Set when the card was sold across the counter rather than issued from the admin portal. */
	soldOnOrderNo: string | null;
	note: string | null;
	createdAt: string;
};

export type GiftCardEntryType = 'ISSUE' | 'SPEND' | 'REFUND' | 'VOID' | 'ADJUST' | 'REVERSE';

export type GiftCardTransaction = {
	id: number;
	entryType: GiftCardEntryType;
	/** Signed toward the card's balance. */
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

export const getGiftCardsApi = (status?: GiftCardStatus) =>
	api
		.get<ApiResponse<GiftCard[]>>('/gift-cards', { params: status ? { status } : undefined })
		.then((res) => res.data.data);

export const getGiftCardByIdApi = (id: number | string) =>
	api.get<ApiResponse<GiftCard>>(`/gift-cards/${id}`).then((res) => res.data.data);

/**
 * What the till does with a scanned or typed code. Throws (404) if nothing
 * matches — callers show that as "no card with that code" rather than a
 * generic error.
 */
export const getGiftCardByCodeApi = (code: string) =>
	api.get<ApiResponse<GiftCard>>(`/gift-cards/by-code/${encodeURIComponent(code)}`).then((res) => res.data.data);

export const getGiftCardHistoryApi = (id: number | string) =>
	api.get<ApiResponse<GiftCardTransaction[]>>(`/gift-cards/${id}/transactions`).then((res) => res.data.data);

/** Every card issued to one customer — shown on their 360 page. */
export const getGiftCardsForCustomerApi = (customerId: number | string) =>
	api.get<ApiResponse<GiftCard[]>>(`/gift-cards/customer/${customerId}`).then((res) => res.data.data);

/**
 * Every card sold on one sales order — the POS success screen calls this
 * right after checkout, with the invoice's order id, to find the code(s)
 * it just minted so the cashier can hand them to the customer.
 */
export const getGiftCardsForSalesOrderApi = (salesOrderId: number | string) =>
	api.get<ApiResponse<GiftCard[]>>(`/gift-cards/sales-order/${salesOrderId}`).then((res) => res.data.data);

export const issueGiftCardApi = (payload: {
	initialValue: number;
	code?: string;
	customerId?: number | null;
	expiresAt?: string | null;
	note?: string;
}) => api.post<ApiResponse<GiftCard>>('/gift-cards', payload).then((res) => res.data.data);

/** Cancels a card and writes off whatever is left. Irreversible. Note required. */
export const voidGiftCardApi = (id: number | string, note: string) =>
	api.post<ApiResponse<GiftCard>>(`/gift-cards/${id}/void`, { note }).then((res) => res.data.data);

export const adjustGiftCardApi = (id: number | string, payload: { amount: number; note: string }) =>
	api.post<ApiResponse<GiftCardTransaction>>(`/gift-cards/${id}/adjust`, payload).then((res) => res.data.data);

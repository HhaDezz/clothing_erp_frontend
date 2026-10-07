import api from '../lib/axios';

export type CustomerMeasurementSummary = {
	id: number;
	customerId: number;
	productId: number;
	productName: string;
	measurementTypeId: number;
	measurementTypeName: string;
	version: number;
	status: string;
	takenBy: string;
	createdAt: string;
	updatedAt: string;
};

export type CustomerMeasurementValuePayload = {
	bodyMeasurementId: number;
	value: number | string;
	unit: 'INCHES' | 'CM';
	fitNote?: string;
};

export type CustomerMeasurementPayload = {
	productId: number;
	measurementTypeId: number;
	notes?: string;
	values: CustomerMeasurementValuePayload[];
};

export type Customer = {
	id: number;
	customer_code?: string;
	customerCode?: string;
	first_name?: string;
	firstName?: string;
	last_name?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	date_of_birth?: string;
	dateOfBirth?: string;
	gender?: string;
	notes?: string;
	status: 'ACTIVE' | 'INACTIVE';
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;

	// Customer module Phase 1 (V78). Optional because older responses — and
	// any endpoint whose DTO hasn't been extended yet — simply omit them.
	smsOptIn?: boolean;
	emailOptIn?: boolean;
	preferredSizes?: string | null;
	preferredCategories?: string | null;
	preferenceNotes?: string | null;
	// Cached lifetime totals, for the customer LIST. Anywhere a single
	// customer is on screen, prefer getCustomerSummaryApi below: that one is
	// computed live from the orders and can't be stale.
	totalSpend?: number;
	visitCount?: number;
	lastVisitAt?: string | null;
};

/**
 * "At a glance" figures for one customer — computed from the sales orders
 * themselves rather than the cached columns on the customer row, so this is
 * always current.
 */
export type CustomerSummary = {
	customerId: number;
	customerCode: string;
	fullName: string;
	phone: string | null;
	email: string | null;
	city: string | null;
	preferredSizes: string | null;
	preferredCategories: string | null;
	preferenceNotes: string | null;
	smsOptIn: boolean;
	emailOptIn: boolean;
	totalSpend: number;
	visitCount: number;
	/** Null when the customer has never bought anything — render as an em dash, not 0. */
	averageOrderValue: number | null;
	largestOrderAmount: number | null;
	firstVisitAt: string | null;
	lastVisitAt: string | null;

	// What they hold right now — read from the cached balances, so this stays
	// one fast call on the POS's critical path.
	loyaltyTierName: string | null;
	pointsBalance: number;
	storeCreditBalance: number;
	accountBalance: number;
	availableCredit: number;
};

/** One row of a customer's purchase history. Lighter than a full SalesOrder — no line items. */
export type CustomerOrder = {
	id: number;
	orderNo: string;
	orderType: string;
	status: string;
	paymentStatus: string;
	showroomId: number | null;
	showroomName: string | null;
	totalAmount: number;
	totalDiscount: number;
	netAmount: number;
	// Denormalized on the order at checkout time (V89) — see
	// SalesOrder#pointsRedeemed. Absent/0 means no points were redeemed.
	pointsRedeemed?: number;
	redeemedValue?: number;
	itemCount: number;
	createdAt: string;
};

/** What this customer buys most, rolled up per variant so size and colour survive. */
export type CustomerFavoriteItem = {
	variantId: number | null;
	productId: number | null;
	productName: string | null;
	sku: string | null;
	size: string | null;
	color: string | null;
	totalQty: number;
	totalSpend: number;
	timesBought: number;
	lastBoughtAt: string | null;
};

/** Adding a customer mid-sale — name and phone only. */
export type CustomerQuickCreatePayload = {
	firstName: string;
	lastName?: string;
	phone: string;
	email?: string;
	smsOptIn?: boolean;
	emailOptIn?: boolean;
};

export type CustomerPayload = {
	customer_code: string;
	customerCode?: string;
	first_name: string;
	firstName?: string;
	last_name: string;
	lastName?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	date_of_birth?: string;
	dateOfBirth?: string;
	gender?: string;
	notes?: string;
	status: 'ACTIVE' | 'INACTIVE';

	// Customer module Phase 1 (V78). Note there is deliberately no
	// totalSpend / visitCount / lastVisitAt here: those are derived from the
	// sales orders and the backend ignores them on the way in, so the form
	// can never overwrite a customer's lifetime history.
	smsOptIn?: boolean;
	emailOptIn?: boolean;
	preferredSizes?: string;
	preferredCategories?: string;
	preferenceNotes?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const getCustomersApi = () =>
	api.get<ApiResponse<Customer[]>>('/customers').then((res) => res.data.data);

export const searchCustomersApi = (q: string) =>
	api.get<ApiResponse<Customer[]>>(`/customers/search?q=${q}`).then((res) => res.data.data);

export const getCustomerByIdApi = (id: string | number) =>
	api.get<ApiResponse<Customer>>(`/customers/${id}`).then((res) => res.data.data);

export const createCustomerApi = (payload: CustomerPayload) =>
	api.post<ApiResponse<Customer>>('/customers', payload).then((res) => res.data);

export const updateCustomerApi = (id: string | number, payload: CustomerPayload) =>
	api.put<ApiResponse<Customer>>(`/customers/${id}`, payload).then((res) => res.data);

export const deleteCustomerApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/customers/${id}`).then((res) => res.data);

// ─── Customer 360 + POS lookup (Phase 1) ─────────────────────────────────

export const getCustomerSummaryApi = (id: string | number) =>
	api.get<ApiResponse<CustomerSummary>>(`/customers/${id}/summary`).then((res) => res.data.data);

export const getCustomerOrdersApi = (id: string | number) =>
	api.get<ApiResponse<CustomerOrder[]>>(`/customers/${id}/orders`).then((res) => res.data.data);

export const getCustomerFavoriteItemsApi = (id: string | number) =>
	api
		.get<ApiResponse<CustomerFavoriteItem[]>>(`/customers/${id}/favorite-items`)
		.then((res) => res.data.data);

/**
 * Exact phone lookup for the till. Resolves to null when nobody has that
 * number — the backend answers 404 for "not found", which at the counter
 * means "offer to add them", not "something went wrong". Any other status
 * still rejects so a real failure isn't swallowed.
 */
export const lookupCustomerByPhoneApi = (phone: string) =>
	api
		.get<ApiResponse<Customer>>(`/customers/lookup`, { params: { phone } })
		.then((res) => res.data.data)
		.catch((error) => {
			if (error?.response?.status === 404) return null;
			throw error;
		});

/** Type-ahead search across name, phone, customer code and email. Capped server-side at 20. */
export const searchCustomersForPosApi = (q: string) =>
	api
		.get<ApiResponse<Customer[]>>(`/customers/pos-search`, { params: { q } })
		.then((res) => res.data.data);

export const quickCreateCustomerApi = (payload: CustomerQuickCreatePayload) =>
	api.post<ApiResponse<Customer>>('/customers/quick', payload).then((res) => res.data.data);

/** Rebuilds a customer's cached lifetime totals from their orders. */
export const recomputeCustomerTotalsApi = (id: string | number) =>
	api
		.post<ApiResponse<CustomerSummary>>(`/customers/${id}/recompute-totals`)
		.then((res) => res.data.data);

export const getCustomerMeasurementsApi = (id: string | number) =>
	api
		.get<ApiResponse<CustomerMeasurementSummary[]>>(`/customers/${id}/measurements`)
		.then((res) => res.data.data);

export const createCustomerMeasurementApi = (
	id: string | number,
	payload: CustomerMeasurementPayload,
) =>
	api
		.post<ApiResponse<CustomerMeasurementSummary>>(`/customers/${id}/measurements`, payload)
		.then((res) => res.data.data);

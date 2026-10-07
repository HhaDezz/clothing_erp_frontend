import api from '../lib/axios';

export interface SalesSummaryPayload {
	period: {
		from: string;
		to: string;
	};
	total_orders: number;
	by_status: Record<string, number>;
	invoiced_total: number;
	collected_total: number;
	outstanding_total: number;
}

export interface InventoryReportPayload {
	total_items: number;
	low_stock_items: number;
	stocks: Array<{
		id: number;
		location_type: string;
		location_id: number;
		item: { id: number; name: string; sku: string };
		batch_number?: string;
		expiry_date?: string;
		quantity_available: number;
		quantity_reserved: number;
		reorder_level: number;
		is_low_stock: boolean;
	}>;
}

export interface SalesRepPerformancePayload {
	period: { from: string; to: string };
	reps: Array<{
		id: number;
		name: string;
		total_orders: number;
		approved_orders: number;
		total_invoiced: number;
		total_collected: number;
	}>;
}

export interface StockMovementsPayload {
	current_page: number;
	data: Array<{
		id: number;
		item: { id: number; name: string; sku: string };
		moved_by: { id: number; name: string };
		movement_type: string;
		quantity: number;
		moved_at: string;
		notes?: string;
	}>;
	total: number;
}

export interface OutstandingInvoicesPayload {
	total_outstanding: number;
	invoice_count: number;
	invoices: Array<{
		invoice_number: string;
		distributor?: string;
		issued_at?: string;
		due_date?: string;
		grand_total: number;
		amount_paid: number;
		balance_due: number;
		days_overdue: number;
		status: string;
	}>;
}

export type AuditCategory = 'REQUEST' | 'DATA' | 'BUSINESS' | 'AUTH';

/** One field's before/after on a DATA row. A missing side means "was empty". */
export interface AuditFieldChange {
	old?: string;
	new?: string;
}

export interface AuditLogPayload {
	[key: string]: unknown;
	id: number;
	// REQUEST  = an API call that changed something (automatic)
	// DATA     = a database row inserted / updated / deleted (automatic)
	// BUSINESS = a named event a service recorded on purpose
	// AUTH     = sign-in, failed sign-in, sign-out
	category?: AuditCategory | string;
	userId?: number;
	userName?: string;
	action: string;
	module: string;
	recordId?: string | number;
	details?: string | null;
	/** JSON text: {"field": {"old": "...", "new": "..."}}. Parse with parseAuditChanges. */
	changes?: string | null;
	/** Shared by every row one API call produced. */
	requestId?: string | null;
	ipAddress?: string;
	userAgent?: string | null;
	httpMethod?: string | null;
	path?: string | null;
	statusCode?: number | null;
	durationMs?: number | null;
	createdAt: string;
}

/** Safe parse of a DATA row's changes; a malformed value gives an empty list, never a crash. */
export const parseAuditChanges = (
	changes?: string | null,
): Array<{ field: string } & AuditFieldChange> => {
	if (!changes) return [];
	try {
		const parsed = JSON.parse(changes) as Record<string, AuditFieldChange>;
		return Object.entries(parsed).map(([field, value]) => ({
			field,
			old: value?.old,
			new: value?.new,
		}));
	} catch {
		return [];
	}
};

export type OperationalReportType =
	| 'sales'
	| 'payments'
	| 'inventory'
	| 'purchasing'
	| 'production'
	| 'quality'
	| 'deliveries'
	| 'customers';

export type OperationalReportRow = Record<string, unknown>;

const unwrapReportRows = (payload: unknown): OperationalReportRow[] => {
	if (Array.isArray(payload)) return payload as OperationalReportRow[];
	if (!payload || typeof payload !== 'object') return [];

	const record = payload as Record<string, unknown>;
	if (Array.isArray(record.data)) return record.data as OperationalReportRow[];
	if (Array.isArray(record.stocks)) return record.stocks as OperationalReportRow[];
	if (Array.isArray(record.rows)) return record.rows as OperationalReportRow[];
	return [];
};

const getRowsFromEndpoint = async (
	endpoint: string,
	params?: Record<string, string | undefined>,
) => {
	const response = await api.get(endpoint, { params });
	return unwrapReportRows(response.data?.data ?? response.data);
};

const getRelatedRows = async (
	parentEndpoint: string,
	childEndpoint: (id: number) => string,
	params?: Record<string, string | undefined>,
) => {
	const parents = await getRowsFromEndpoint(parentEndpoint, params);
	const results = await Promise.allSettled(
		parents.map((parent) => getRowsFromEndpoint(childEndpoint(Number(parent.id)), params)),
	);
	return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
};

export const getOperationalReportRows = async (
	reportType: OperationalReportType,
	params?: Record<string, string | undefined>,
): Promise<OperationalReportRow[]> => {
	const endpoints: Record<OperationalReportType, string> = {
		sales: '/sales-orders',
		payments: '/payments',
		inventory: '/reports/inventory',
		purchasing: '/purchase-orders',
		production: '/work-orders',
		quality: '/work-orders',
		deliveries: '/sales-orders',
		customers: '/customer-measurements',
	};

	try {
		if (reportType === 'quality') {
			return getRelatedRows(
				'/work-orders',
				(workOrderId) => `/quality-checks/work-order/${workOrderId}`,
				params,
			);
		}
		if (reportType === 'deliveries') {
			return getRelatedRows(
				'/sales-orders',
				(salesOrderId) => `/deliveries/sales-order/${salesOrderId}`,
				params,
			);
		}
		return await getRowsFromEndpoint(endpoints[reportType], params);
	} catch (error) {
		// These modules may not yet expose dedicated report endpoints. Their master
		// lists still provide a useful, exportable operational report.
		if (reportType === 'payments') return getRowsFromEndpoint('/invoices', params);
		if (reportType === 'customers') return getRowsFromEndpoint('/customers', params);
		throw error;
	}
};

export const getSalesSummary = async (
	params?: Record<string, any>,
): Promise<SalesSummaryPayload> => {
	const res = await api.get('/reports/sales-summary', { params });
	return res.data?.data;
};

export const getInventoryReport = async (
	params?: Record<string, any>,
): Promise<InventoryReportPayload> => {
	const res = await api.get('/reports/inventory', { params });
	return res.data?.data;
};

export const getSalesRepPerformance = async (
	params?: Record<string, any>,
): Promise<SalesRepPerformancePayload> => {
	const res = await api.get('/reports/sales-rep-performance', { params });
	return res.data?.data;
};

export const getStockMovementsReport = async (
	params?: Record<string, any>,
): Promise<StockMovementsPayload> => {
	const res = await api.get('/reports/stock-movements', { params });
	return res.data?.data;
};

export const getOutstandingInvoices = async (
	params?: Record<string, any>,
): Promise<OutstandingInvoicesPayload> => {
	const res = await api.get('/reports/outstanding-invoices', { params });
	return res.data?.data;
};

export const getAuditLogs = async (
	params?: Record<string, string | number | undefined>,
): Promise<AuditLogPayload[]> => {
	const res = await api.get('/audit-logs', { params });
	return res.data?.data?.data ?? res.data?.data ?? [];
};

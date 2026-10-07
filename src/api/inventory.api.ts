import api from '../lib/axios';

export type InventoryTransaction = {
	id: number;
	transactionDate: string;
	transactionNo?: string;
	transactionType?: string;
	itemType: string;
	itemId: number;
	warehouseId: number;
	warehouseName?: string;
	itemName?: string;
	qtyIn: number;
	qtyOut: number;
	qty?: number;
	unitCost?: number;
	referenceType: string;
	referenceId: number;
	reference?: string;
	notes?: string;
	createdAt: string;
	createdBy?: string;
};

export type CurrentStock = {
	itemType: string;
	itemId: number;
	warehouseId: number;
	warehouseName?: string;
	itemName?: string;
	currentQty: number;
	reorderLevel?: number;
};

export type LowStockAlert = CurrentStock & { reorderLevel: number };

export type VariantStockRow = {
	variantId: number;
	sku: string;
	size?: string;
	color?: string;
	quantity: number;
};

// Current stock for one Product in a warehouse, grouped from its Variant
// rows — powers the Stock Ledger's product-wise/variant-wise "Stock
// Quantity" view. totalQuantity is the sum of every variant's quantity.
export type ProductStock = {
	productId: number;
	productName: string;
	styleCode?: string;
	totalQuantity: number;
	variants: VariantStockRow[];
};

export type StockInPayload = {
	itemType: 'VARIANT' | 'MATERIAL';
	itemId: number;
	warehouseId: number;
	quantity: number;
	referenceType:
		| 'INITIAL_STOCK'
		| 'PURCHASE'
		| 'SALE'
		| 'ADJUSTMENT'
		| 'TRANSFER_IN'
		| 'TRANSFER_OUT'
		| 'PRODUCTION_ISSUE'
		| 'RETURN';
	unitCost?: number;
	notes?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

const getList = <T>(response: unknown): T[] => {
	let value = response;
	for (let depth = 0; depth < 4; depth += 1) {
		if (Array.isArray(value)) return value as T[];
		if (!value || typeof value !== 'object' || !('data' in value)) return [];
		value = (value as { data?: unknown }).data;
	}
	return [];
};

export const getStockApi = async () => {
	const response = await api.get<ApiResponse<CurrentStock[]>>('/inventory/stock');
	return getList<CurrentStock>(response.data);
};

// One item's current stock in one warehouse — used by the Goods Transfer
// approval screen to show live availability as SL Operations splits an
// approved line across warehouse(s). Deliberately a single lookup (not a
// batch endpoint) so it reuses the existing /inventory/stock GET as-is.
export const getStockLevelApi = async (
	itemType: 'VARIANT' | 'MATERIAL',
	itemId: number,
	warehouseId: number,
) => {
	const response = await api.get<ApiResponse<CurrentStock>>('/inventory/stock', {
		params: { itemType, itemId, warehouseId },
	});
	return response.data.data;
};

export const getInventoryTransactionsApi = async (warehouseId: number) => {
	const response = await api.get<ApiResponse<InventoryTransaction[]>>(
		`/inventory/transactions/warehouse/${warehouseId}`,
	);
	return getList<InventoryTransaction>(response.data);
};

export const getLowStockApi = async () => {
	const response = await api.get<ApiResponse<LowStockAlert[]>>('/inventory/low-stock');
	return getList<LowStockAlert>(response.data);
};

export const getVariantStockByProductApi = async (warehouseId: number) => {
	const response = await api.get<ApiResponse<ProductStock[]>>('/inventory/stock/variants', {
		params: { warehouseId },
	});
	return getList<ProductStock>(response.data);
};

export const createStockInApi = async (payload: StockInPayload) => {
	const response = await api.post<ApiResponse<InventoryTransaction>>(
		'/inventory/stock-in',
		payload,
	);
	return response.data.data;
};

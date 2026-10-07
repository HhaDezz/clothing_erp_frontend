import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type SupplierPayload = {
	name: string;
	contactPerson?: string;
	phone?: string;
	email?: string;
	address?: string;
	paymentTerms?: string;
};

export type SupplierResponse = {
	id: number;
	name: string;
	contactPerson: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
	paymentTerms: string | null;
	rating: number;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
};

export const getSuppliersApi = () =>
	api.get<ApiResponse<SupplierResponse[]>>('/suppliers').then((response) => response.data.data);

export const getSupplierByIdApi = (id: number) =>
	api
		.get<ApiResponse<SupplierResponse>>(`/suppliers/${id}`)
		.then((response) => response.data.data);

export const createSupplierApi = (payload: SupplierPayload) =>
	api
		.post<ApiResponse<SupplierResponse>>('/suppliers', payload)
		.then((response) => response.data.data);

export const updateSupplierApi = (id: number, payload: SupplierPayload) =>
	api
		.put<ApiResponse<SupplierResponse>>(`/suppliers/${id}`, payload)
		.then((response) => response.data.data);

export const deleteSupplierApi = (id: number) =>
	api.delete<ApiResponse<void>>(`/suppliers/${id}`).then((response) => response.data);

export type PoStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';

export type PurchaseOrderItemPayload = {
	materialId: number;
	orderedQty: number;
	unitPrice: number;
};

export type PurchaseOrderPayload = {
	supplierId: number;
	expectedDate?: string;
	notes?: string;
	items: PurchaseOrderItemPayload[];
};

export type PurchaseOrderItemResponse = {
	id: number;
	materialId: number;
	materialName: string;
	orderedQty: number;
	receivedQty: number;
	unitPrice: number;
	totalPrice: number;
};

export type PurchaseOrderResponse = {
	id: number;
	poNo: string;
	supplierId: number;
	supplierName: string;
	expectedDate: string | null;
	status: PoStatus;
	totalAmount: number;
	notes: string | null;
	createdAt: string;
	items: PurchaseOrderItemResponse[];
};

export const getPurchaseOrdersApi = () =>
	api
		.get<ApiResponse<PurchaseOrderResponse[]>>('/purchase-orders')
		.then((response) => response.data.data);

export const getPurchaseOrderByIdApi = (id: number) =>
	api
		.get<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${id}`)
		.then((response) => response.data.data);

export const createPurchaseOrderApi = (payload: PurchaseOrderPayload) =>
	api
		.post<ApiResponse<PurchaseOrderResponse>>('/purchase-orders', payload)
		.then((response) => response.data.data);

export const issuePurchaseOrderApi = (id: number) =>
	api
		.put<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${id}/issue`)
		.then((response) => response.data.data);

// Backwards-compatible name for existing imports.
export const approvePurchaseOrderApi = issuePurchaseOrderApi;

export type GrnStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type GrnItemPayload = {
	poItemId: number;
	warehouseId: number;
	receivedQty: number;
	unitPrice: number;
};

export type GrnPayload = {
	poId: number;
	receivedBy?: string;
	supplierInvoice?: string;
	notes?: string;
	items: GrnItemPayload[];
};

export type GrnItemResponse = {
	id: number;
	poItemId: number;
	materialId: number;
	materialName: string;
	warehouseId: number;
	warehouseName: string;
	receivedQty: number;
	unitPrice: number;
};

export type GrnResponse = {
	id: number;
	grnNo: string;
	poId: number;
	poNo: string;
	receivedBy: string | null;
	receivedDate: string;
	status: GrnStatus;
	supplierInvoice: string | null;
	notes: string | null;
	createdAt: string;
	items: GrnItemResponse[];
};

export const getGrnsApi = () =>
	api
		.get<ApiResponse<GrnResponse[]>>('/goods-received-notes')
		.then((response) => response.data.data);

export const getGrnByIdApi = (id: number) =>
	api
		.get<ApiResponse<GrnResponse>>(`/goods-received-notes/${id}`)
		.then((response) => response.data.data);

export const createGrnApi = (payload: GrnPayload) =>
	api
		.post<ApiResponse<GrnResponse>>('/goods-received-notes', payload)
		.then((response) => response.data.data);

export const confirmGrnApi = (id: number) =>
	api
		.put<ApiResponse<GrnResponse>>(`/goods-received-notes/${id}/confirm`)
		.then((response) => response.data.data);

export type WarehouseResponse = {
	id: number;
	name: string;
	status?: string;
};

export const getWarehousesApi = () =>
	api.get<ApiResponse<WarehouseResponse[]>>('/warehouses').then((response) => response.data.data);

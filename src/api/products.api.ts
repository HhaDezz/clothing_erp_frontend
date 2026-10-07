import api from '../lib/axios';

export type Product = {
	id: number;
	styleCode: string;
	name: string;
	description?: string;
	brand?: string;
	category?: string;
	garmentType?: string;
	productType: 'READY_MADE' | 'SEW_AND_SELL';
	measurementTypeId?: number;
	measurementType?: {
		id: number;
		code: string;
		name: string;
		defaultUnit: 'INCHES' | 'CM';
	};
	measurementRequired: boolean;
	season?: string;
	imageUrl?: string;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
};

export type ProductMeasurementTemplateField = {
	id: number;
	bodyMeasurementId: number;
	bodyMeasurementCode?: string;
	bodyMeasurementName: string;
	inputType: 'NUMBER' | 'TEXT';
	isRequired: boolean;
	displayOrder: number;
	defaultUnit: 'INCHES' | 'CM';
	minValue?: number;
	maxValue?: number;
	tolerance?: number;
	instruction?: string;
	notes?: string;
};

export type ProductMeasurementTemplate = {
	id: number;
	code: string;
	name: string;
	garmentCategory?: string;
	defaultUnit: 'INCHES' | 'CM';
	fields: ProductMeasurementTemplateField[];
};

export type ProductPayload = {
	styleCode: string;
	name: string;
	description?: string;
	brand?: string;
	category?: string;
	garmentType?: string;
	productType: 'READY_MADE' | 'SEW_AND_SELL';
	measurementTypeId?: number;
	measurementRequired: boolean;
	season?: string;
	imageUrl?: string;
};

export type BomItem = {
	id: number;
	productId: number;
	materialId: number;
	materialCode: string;
	materialName: string;
	materialUnit: string;
	consumptionQty: number;
	wastagePercent: number;
	notes?: string;
};

export type BomPayload = {
	materialId: number;
	consumptionQty: number;
	wastagePercent?: number;
	notes?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// --- Product Endpoints ---

export const getProductsApi = () =>
	api.get<ApiResponse<Product[]>>('/products').then((res) => res.data.data);

export const getProductByIdApi = (id: string | number) =>
	api.get<ApiResponse<Product>>(`/products/${id}`).then((res) => res.data.data);

export const createProductApi = (payload: ProductPayload) =>
	api.post<ApiResponse<Product>>('/products', payload).then((res) => res.data);

export const updateProductApi = (id: string | number, payload: ProductPayload) =>
	api.put<ApiResponse<Product>>(`/products/${id}`, payload).then((res) => res.data);

export const deleteProductApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/products/${id}`).then((res) => res.data);

export const getProductMeasurementTemplateApi = (id: string | number) =>
	api
		.get<ApiResponse<ProductMeasurementTemplate>>(`/products/${id}/measurement-template`)
		.then((res) => res.data.data);

// --- BOM Endpoints ---

export const getBomApi = (productId: string | number) =>
	api.get<ApiResponse<BomItem[]>>(`/products/${productId}/bom`).then((res) => res.data.data);

export const addBomItemApi = (productId: string | number, payload: BomPayload) =>
	api.post<ApiResponse<BomItem>>(`/products/${productId}/bom`, payload).then((res) => res.data);

export const updateBomItemApi = (
	productId: string | number,
	bomId: string | number,
	payload: BomPayload,
) =>
	api
		.put<ApiResponse<BomItem>>(`/products/${productId}/bom/${bomId}`, payload)
		.then((res) => res.data);

export const removeBomItemApi = (productId: string | number, bomId: string | number) =>
	api.delete<ApiResponse<void>>(`/products/${productId}/bom/${bomId}`).then((res) => res.data);

// --- Variant Endpoints ---

export type Variant = {
	id: number;
	productId: number;
	size?: string;
	color?: string;
	sku: string;
	barcode?: string;
	sellingPrice: number;
	costPrice?: number;
	taxRate?: number;
	currencyId?: number;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
};

export type VariantPayload = {
	size?: string;
	color?: string;
	sku?: string; // Optional on creation, backend generates if missing
	barcode?: string;
	sellingPrice: number;
	costPrice?: number;
	taxRate?: number;
	currencyId?: number;
};

export const getVariantsByProductApi = (productId: string | number) =>
	api.get<ApiResponse<Variant[]>>(`/products/${productId}/variants`).then((res) => res.data.data);

// Every active variant across all products — powers a single Variant-first
// picker (Purchase Inquiry / Import Process) so a SKU can be chosen without
// first picking its Product.
export const getAllVariantsApi = () =>
	api.get<ApiResponse<Variant[]>>('/variants').then((res) => res.data.data);

export const getVariantByIdApi = (id: string | number) =>
	api.get<ApiResponse<Variant>>(`/variants/${id}`).then((res) => res.data.data);

export const createVariantApi = (productId: string | number, payload: VariantPayload) =>
	api
		.post<ApiResponse<Variant>>(`/products/${productId}/variants`, payload)
		.then((res) => res.data);

export const updateVariantApi = (id: string | number, payload: VariantPayload) =>
	api.put<ApiResponse<Variant>>(`/variants/${id}`, payload).then((res) => res.data);

export const deleteVariantApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/variants/${id}`).then((res) => res.data);

// --- Variant Photo ---
// A file-upload option for product variants — one photo per variant (e.g. a
// different shot per color). The image itself is never exposed as a public
// URL: it's streamed back through an authenticated GET, same convention as
// the GRN PDF / import document downloads. A 404 just means "no photo yet",
// so it's treated as a normal (non-error) outcome here rather than thrown.

export const getVariantImageApi = (id: string | number) =>
	api
		.get(`/variants/${id}/image`, {
			responseType: 'blob',
			validateStatus: (status) => status === 200 || status === 404,
		})
		.then((res) => (res.status === 200 ? (res.data as Blob) : null));

export const uploadVariantImageApi = (id: string | number, file: File) => {
	const form = new FormData();
	form.append('file', file);
	return api
		.post<ApiResponse<Variant>>(`/variants/${id}/image`, form, {
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		.then((res) => res.data);
};

export const removeVariantImageApi = (id: string | number) =>
	api.delete<ApiResponse<Variant>>(`/variants/${id}/image`).then((res) => res.data);

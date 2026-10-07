import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// A product brand — the managed list behind the Brand dropdown on the
// product form. A product stores the brand's NAME (products.brand is plain
// text); renaming a brand here renames it on its products server-side.
export type Brand = {
	id: number;
	name: string;
	description: string | null;
	/** Inactive brands stay on existing products but are not offered for new ones. */
	active: boolean;
	/** How many live products use this brand. A brand in use cannot be deleted. */
	productCount: number;
	createdAt: string | null;
};

export type BrandPayload = {
	name: string;
	description?: string;
	active?: boolean;
};

const BASE = '/brands';

export const getBrandsApi = () => api.get<ApiResponse<Brand[]>>(BASE).then((r) => r.data.data ?? []);

export const createBrandApi = (payload: BrandPayload) =>
	api.post<ApiResponse<Brand>>(BASE, payload).then((r) => r.data.data);

export const updateBrandApi = (id: number, payload: BrandPayload) =>
	api.put<ApiResponse<Brand>>(`${BASE}/${id}`, payload).then((r) => r.data.data);

export const deleteBrandApi = (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data);

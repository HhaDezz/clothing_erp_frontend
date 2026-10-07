import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type Warehouse = {
	id: number;
	name: string;
	address: string | null;
	binLocation: string | null;
	isDefault: boolean;
};

export type WarehousePayload = {
	name: string;
	address?: string;
	binLocation?: string;
	isDefault?: boolean;
};

const BASE = '/warehouses';

export const getWarehousesApi = () =>
	api.get<ApiResponse<Warehouse[]>>(BASE).then((r) => r.data.data);

export const getWarehouseByIdApi = (id: number) =>
	api.get<ApiResponse<Warehouse>>(`${BASE}/${id}`).then((r) => r.data.data);

export const createWarehouseApi = (payload: WarehousePayload) =>
	api.post<ApiResponse<Warehouse>>(BASE, payload).then((r) => r.data.data);

export const updateWarehouseApi = (id: number, payload: WarehousePayload) =>
	api.put<ApiResponse<Warehouse>>(`${BASE}/${id}`, payload).then((r) => r.data.data);

export const setDefaultWarehouseApi = (id: number) =>
	api.put<ApiResponse<Warehouse>>(`${BASE}/${id}/set-default`).then((r) => r.data.data);

export const deleteWarehouseApi = (id: number) =>
	api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data);

import api from '../lib/axios';

export type Material = {
	id: number;
	materialCode: string;
	name: string;
	unit: string;
	materialType?: string;
	reorderLevel: number;
	description?: string;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
};

export type MaterialPayload = {
	materialCode: string;
	name: string;
	unit: string;
	materialType?: string;
	reorderLevel?: number;
	description?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const getMaterialsApi = () =>
	api.get<ApiResponse<Material[]>>('/materials').then((res) => res.data.data);

export const getMaterialByIdApi = (id: string | number) =>
	api.get<ApiResponse<Material>>(`/materials/${id}`).then((res) => res.data.data);

export const createMaterialApi = (payload: MaterialPayload) =>
	api.post<ApiResponse<Material>>('/materials', payload).then((res) => res.data);

export const updateMaterialApi = (id: string | number, payload: MaterialPayload) =>
	api.put<ApiResponse<Material>>(`/materials/${id}`, payload).then((res) => res.data);

export const deleteMaterialApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/materials/${id}`).then((res) => res.data);

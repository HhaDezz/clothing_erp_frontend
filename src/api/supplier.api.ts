import api from '../lib/axios';
import { ISupplier } from '../pages/presentation/procurement/supplier/types';

export const getSuppliers = async (params?: Record<string, any>): Promise<ISupplier[]> => {
	const res = await api.get('/suppliers', { params: { per_page: 1000, ...params } });
	const payload = res.data?.data;
	return (payload?.data ?? payload ?? []) as ISupplier[];
};

export const getSupplier = async (id: string | number): Promise<ISupplier> => {
	const res = await api.get(`/suppliers/${id}`);
	return res.data.data as ISupplier;
};

export const createSupplier = async (data: FormData): Promise<ISupplier> => {
	const res = await api.post('/suppliers', data, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return res.data.data as ISupplier;
};

export const updateSupplier = async (id: string | number, data: FormData): Promise<ISupplier> => {
	// Laravel doesn't support PUT with FormData; use POST with _method spoofing
	data.append('_method', 'PUT');
	const res = await api.post(`/suppliers/${id}`, data, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return res.data.data as ISupplier;
};

export const deleteSupplier = async (id: string | number): Promise<void> => {
	await api.delete(`/suppliers/${id}`);
};

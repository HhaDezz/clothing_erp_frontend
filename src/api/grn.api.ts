import api from '../lib/axios';

export interface GrnItem {
	id: string | number;
	item_id: string | number;
	batch_id?: string | number;
	item?: { id: string | number; name: string; sku?: string };
	batch?: { id: string | number; batch_number: string };
	batch_number?: string;
	manufacture_date?: string;
	expiry_date?: string;
	quantity_ordered: number;
	quantity_received: number;
	variance?: number;
	notes?: string;
}

export interface Grn {
	id: string | number;
	grn_number: string;
	status: string;
	notes?: string;
	received_at?: string;
	created_at?: string;
	purchase_order?: { id: string | number; order_number: string };
	warehouse?: { id: string | number; name: string };
	received_by?: { id: string | number; name: string };
	supplier?: { id: string | number; name: string };
	items?: GrnItem[];
}

export interface StoreGrnPayload {
	warehouse_id: string | number;
	supplier_id?: string | number;
	purchase_order_id?: string | number;
	notes?: string;
	items: {
		item_id: string | number;
		batch_id?: string | number;
		batch_number?: string;
		manufacture_date?: string;
		expiry_date?: string;
		quantity_ordered: number;
		quantity_received: number;
	}[];
}

export const getGrns = async (): Promise<Grn[]> => {
	const res = await api.get('/grns?per_page=1000');
	// Backend returns paginated data inside responseSuccess wrapper
	const payload = res.data?.data;
	// Support both paginated {data:[...]} and plain array
	return (payload?.data ?? payload ?? []) as Grn[];
};

export const getGrn = async (id: string | number): Promise<Grn> => {
	const res = await api.get(`/grns/${id}`);
	return res.data.data as Grn;
};

export const createGrn = async (payload: StoreGrnPayload): Promise<Grn> => {
	const res = await api.post('/grns', payload);
	return res.data.data as Grn;
};

export const confirmGrn = async (id: string | number): Promise<Grn> => {
	const res = await api.post(`/grns/${id}/confirm`);
	return res.data.data as Grn;
};

export const updateGrn = async (id: string | number, payload: StoreGrnPayload): Promise<Grn> => {
	const res = await api.put(`/grns/${id}`, payload);
	return res.data.data as Grn;
};

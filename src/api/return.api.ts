import api from '../lib/axios';

export interface ReturnItem {
	id: string | number;
	item_id: string | number;
	item_name?: string;
	item_sku?: string;
	batch_id?: string | number | null;
	batch_no?: string;
	quantity: number;
	reason?: string;
	condition?: string;
	unit_price?: number;
	line_total?: number;
}

export interface ReturnCreditNote {
	id: string | number;
	credit_note_number: string;
	amount: number;
	used_amount: number;
	status: string;
}

export interface Return {
	id: string | number;
	return_number: string;
	invoice_id?: string | number | null;
	distributor_id: string | number;
	sales_rep_id: string | number;
	return_type: string;
	status: string;
	notes?: string;
	approved_at?: string;
	processed_at?: string;
	created_at?: string;
	distributor?: { id: string | number; name: string };
	sales_rep?: { id: string | number; name: string };
	initiated_by?: { id: string | number; name: string };
	approved_by?: { id: string | number; name: string };
	invoice?: { id: string | number; invoice_number: string };
	items?: ReturnItem[];
	credit_note?: ReturnCreditNote;
}

export type StoreReturnPayload = {
	invoice_id?: string | number | null;
	distributor_id: string | number;
	sales_rep_id: string | number;
	return_type: string;
	notes?: string;
	items: {
		item_id: string | number;
		batch_id?: string | number | null;
		quantity: number;
		reason?: string;
		condition?: string;
	}[];
};

export const getReturns = async () => {
	const res = await api.get('/returns?per_page=1000'); // large per_page to act as list
	return res.data?.data?.data || [];
};

export const getReturnById = async (id: string | number) => {
	const res = await api.get(`/returns/${id}`);
	return res.data?.data;
};

export const createReturn = async (payload: StoreReturnPayload) => {
	const res = await api.post('/returns', payload);
	return res.data?.data;
};

export const approveReturn = async (id: string | number) => {
	const res = await api.post(`/returns/${id}/approve`);
	return res.data?.data;
};

export const rejectReturn = async (id: string | number) => {
	const res = await api.post(`/returns/${id}/reject`);
	return res.data?.data;
};

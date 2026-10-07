import api from '../lib/axios';

export interface DeliveryNoteItem {
	id?: number;
	delivery_note_id?: number;
	item_id: number | string;
	batch_id?: number | string;
	quantity_delivered: number;
	quantity_received?: number | null;
	item?: {
		id: number;
		name: string;
		sku: string;
	};
	batch?: {
		id: number;
		batch_number: string;
	};
}

export interface DeliveryNote {
	id: number;
	delivery_note_number: string;
	loading_request_id: number;
	distributor_id: number;
	sales_rep_id: number;
	status: 'in_transit' | 'delivered' | 'partially_delivered' | 'cancelled';
	notes?: string;
	delivered_at?: string;
	distributor_confirmed_at?: string;
	distributor_confirmed_by?: number;
	created_at: string;
	updated_at: string;

	loading_request?: {
		id: number;
		loading_date: string;
		purchase_order_id?: number;
	};
	distributor?: {
		id: number;
		name: string;
	};
	salesRep?: {
		id: number;
		name: string;
	};
	items?: DeliveryNoteItem[];
}

export interface StoreDeliveryPayload {
	loading_request_id: number | string;
	distributor_id: number | string;
	notes?: string;
	items: {
		item_id: number | string;
		batch_id?: number | string;
		quantity_delivered: number;
	}[];
}

export const getDeliveryNotes = async (): Promise<DeliveryNote[]> => {
	const res = await api.get('/delivery-notes?per_page=1000');
	const payload = res.data?.data;
	return (payload?.data ?? payload ?? []) as DeliveryNote[];
};

export const getDeliveryNote = async (id: string | number): Promise<DeliveryNote> => {
	const res = await api.get(`/delivery-notes/${id}`);
	return res.data.data as DeliveryNote;
};

export const createDeliveryNote = async (payload: StoreDeliveryPayload): Promise<DeliveryNote> => {
	const res = await api.post('/delivery-notes', payload);
	return res.data.data as DeliveryNote;
};

export const updateDeliveryNote = async (id: string | number, payload: StoreDeliveryPayload): Promise<DeliveryNote> => {
	const res = await api.put(`/delivery-notes/${id}`, payload);
	return res.data.data as DeliveryNote;
};

export const confirmDeliveryNote = async (
	id: string | number,
	receivedItems: Record<string | number, number>,
): Promise<DeliveryNote> => {
	const res = await api.post(`/delivery-notes/${id}/confirm`, { received_items: receivedItems });
	return res.data.data as DeliveryNote;
};

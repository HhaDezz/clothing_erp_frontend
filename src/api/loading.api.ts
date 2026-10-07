import api from '../lib/axios';

export interface LoadingItem {
	id?: number;
	loading_request_id?: number;
	item_id: number | string;
	batch_id?: number | string;
	quantity_requested: number;
	quantity_loaded: number;
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

export interface LoadingRequest {
	id: number;
	purchase_order_id: number;
	warehouse_id: number;
	vehicle_id: number;
	loaded_by: number;
	confirmed_by?: number;
	loading_date: string;
	status: 'pending' | 'loaded' | 'confirmed';
	notes?: string;
	created_at: string;
	updated_at: string;
	confirmed_at?: string;

	purchase_order?: {
		id: number;
		order_number: string;
		distributor_id: number;
	};
	warehouse?: {
		id: number;
		name: string;
	};
	vehicle?: {
		id: number;
		name: string;
		number_plate: string;
	};
	loaded_by_user?: {
		id: number;
		name: string;
	};
	confirmed_by_user?: {
		id: number;
		name: string;
	};
	items?: LoadingItem[];
}

export interface StoreLoadingPayload {
	purchase_order_id: number | string;
	warehouse_id: number | string;
	vehicle_id: number | string;
	loading_date: string;
	notes?: string;
	items: {
		item_id: number | string;
		batch_id?: number | string;
		quantity_requested: number;
	}[];
}

export const getLoadings = async (): Promise<LoadingRequest[]> => {
	const res = await api.get('/loading-requests?per_page=1000');
	const payload = res.data?.data;
	return (payload?.data ?? payload ?? []) as LoadingRequest[];
};

export const getLoading = async (id: string | number): Promise<LoadingRequest> => {
	const res = await api.get(`/loading-requests/${id}`);
	return res.data.data as LoadingRequest;
};

export const createLoading = async (payload: StoreLoadingPayload): Promise<LoadingRequest> => {
	const res = await api.post('/loading-requests', payload);
	return res.data.data as LoadingRequest;
};

export const updateLoading = async (id: string | number, payload: StoreLoadingPayload): Promise<LoadingRequest> => {
	const res = await api.put(`/loading-requests/${id}`, payload);
	return res.data.data as LoadingRequest;
};

export const markLoaded = async (
	id: string | number,
	loadedItems: Record<string | number, number>,
): Promise<LoadingRequest> => {
	const res = await api.post(`/loading-requests/${id}/mark-loaded`, { loaded_items: loadedItems });
	return res.data.data as LoadingRequest;
};

export const confirmLoading = async (id: string | number): Promise<LoadingRequest> => {
	const res = await api.post(`/loading-requests/${id}/confirm`);
	return res.data.data as LoadingRequest;
};

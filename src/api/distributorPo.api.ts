import api from '../lib/axios';

export interface DistributorPurchaseOrderItem {
	id?: string | number;
	item_id: number | string;
	batch_id?: number | string;
	quantity_ordered: number;
	unit_price: number;
	tax_rate?: number;
	item?: { id: number; name: string };
}

export interface DistributorPurchaseOrder {
	id: string | number;
	po_type: 'distributor';
	order_number: string;
	distributor_id: number;
	sales_rep_id?: number;
	warehouse_id?: number;
	vehicle_id?: number | null;
	status: string;
	notes?: string;
	ordered_at: string;
	dispatched_at: string | null;
	rejected_reason: string | null;
	is_fully_paid?: boolean;
	invoice_status?: string | null;
	distributor?: { id: number; name: string };
	salesRep?: { id: number; name: string };
	warehouse?: { id: number; name: string };
	items: DistributorPurchaseOrderItem[];
	grand_total: number;
}

export interface StoreDistributorPurchaseOrderPayload {
	distributor_id: number | string;
	warehouse_id?: number | string;
	vehicle_id?: number | string;
	notes?: string;
	items: {
		item_id: number | string;
		batch_id?: number | string;
		quantity_ordered: number;
		unit_price: number;
		tax_rate?: number;
	}[];
}

export const getDistributorPurchaseOrders = async () => {
	const res = await api.get('/distributor-purchase-orders?per_page=1000');
	const payload = res.data.data;
	if (Array.isArray(payload)) return payload as DistributorPurchaseOrder[];
	if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)) {
		return payload.data as DistributorPurchaseOrder[];
	}
	return [] as DistributorPurchaseOrder[];
};

export const getDistributorPurchaseOrder = async (id: string | number) => {
	const res = await api.get(`/distributor-purchase-orders/${id}`);
	return res.data.data as DistributorPurchaseOrder;
};

export const createDistributorPurchaseOrder = async (payload: StoreDistributorPurchaseOrderPayload) => {
	const res = await api.post('/distributor-purchase-orders', payload);
	return res.data.data as DistributorPurchaseOrder;
};

export const updateDistributorPurchaseOrder = async (id: string | number, payload: StoreDistributorPurchaseOrderPayload) => {
	const res = await api.put(`/distributor-purchase-orders/${id}`, payload);
	return res.data.data as DistributorPurchaseOrder;
};

export const approveDistributorPurchaseOrder = async (id: string | number, approved_quantities?: Record<string, number>) => {
	const res = await api.post(`/distributor-purchase-orders/${id}/approve`, { approved_quantities });
	return res.data.data as DistributorPurchaseOrder;
};

export const dispatchDistributorPurchaseOrder = async (id: string | number) => {
	const res = await api.post(`/distributor-purchase-orders/${id}/dispatch`);
	return res.data.data as DistributorPurchaseOrder;
};

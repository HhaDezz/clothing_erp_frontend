import api from '../lib/axios';

export interface CompanyPurchaseOrderItem {
	id?: string | number;
	item_id: number | string;
	batch_id?: number | string;
	quantity_ordered: number;
	unit_price: number;
	tax_rate?: number;
	item?: { id: number; name: string };
}

export interface CompanyPurchaseOrder {
	id: string | number;
	po_type: 'company';
	order_number: string;
	supplier_id: number;
	warehouse_id: number;
	status: string;
	notes?: string;
	ordered_at: string;
	supplier?: { id: number; name: string };
	warehouse?: { id: number; name: string };
	items: CompanyPurchaseOrderItem[];
	grand_total: number;
}

export interface StoreCompanyPurchaseOrderPayload {
	supplier_id: number | string;
	warehouse_id: number | string;
	notes?: string;
	items: {
		item_id: number | string;
		batch_id?: number | string;
		quantity_ordered: number;
		unit_price: number;
		tax_rate?: number;
	}[];
}

export const getCompanyPurchaseOrders = async () => {
	const res = await api.get('/company-purchase-orders?per_page=1000');
	return res.data.data.data as CompanyPurchaseOrder[];
};

export const getCompanyPurchaseOrder = async (id: string | number) => {
	const res = await api.get(`/company-purchase-orders/${id}`);
	return res.data.data as CompanyPurchaseOrder;
};

export const createCompanyPurchaseOrder = async (payload: StoreCompanyPurchaseOrderPayload) => {
	const res = await api.post('/company-purchase-orders', payload);
	return res.data.data as CompanyPurchaseOrder;
};

export const approveCompanyPurchaseOrder = async (id: string | number, approved_quantities?: Record<string, number>) => {
	const res = await api.post(`/company-purchase-orders/${id}/approve`, { approved_quantities });
	return res.data.data as CompanyPurchaseOrder;
};

export const receiveCompanyPurchaseOrder = async (id: string | number) => {
	const res = await api.post(`/company-purchase-orders/${id}/receive`);
	return res.data.data as CompanyPurchaseOrder;
};

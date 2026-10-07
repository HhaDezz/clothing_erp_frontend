import api from '../lib/axios';

export interface InvoiceItem {
	id?: number;
	item_id: number | string;
	quantity: number;
	unit_price: number;
	tax_rate: number;
	total?: number;
	item?: {
		id: number;
		name: string;
		sku: string;
	};
}

export interface InvoicePayment {
	id: number;
	amount_paid: number;
	payment_method: string;
	payment_date: string;
	reference_number?: string;
	recorded_by?: number;
	recordedBy?: {
		id: number;
		name: string;
	};
}

export interface Invoice {
	id: number;
	invoice_number: string;
	distributor_id: number;
	delivery_note_id: number;
	purchase_order_id?: number | null;
	issued_at: string;
	due_date?: string;
	subtotal: number;
	tax_total: number;
	grand_total: number;
	amount_paid: number;
	status: string;
	created_at: string;
	distributor?: {
		id: number;
		name: string;
		email: string;
		phone: string;
		address: string;
	};
	purchaseOrder?: {
		id: number;
		po_number: string;
	};
	deliveryNote?: {
		id: number;
		dn_number: string;
	};
	items?: InvoiceItem[];
	payments?: InvoicePayment[];
}

export interface InvoicePayload {
	distributor_id: number | string;
	delivery_note_id: number | string;
	purchase_order_id?: number | string | null;
	due_date?: string | null;
	items: InvoiceItem[];
}

export interface PaymentPayload {
	amount_paid: number;
	payment_method: string;
	payment_date?: string;
	reference_number?: string;
	document?: File | null;
}

export interface PaymentHistoryEntry {
	id: number;
	amount_paid: number;
	payment_method: string;
	payment_date: string;
	reference_number?: string | null;
	notes?: string | null;
	document_url?: string | null;
	document_name?: string | null;
	recorded_by?: string | null;
	recorded_at: string;
}

export interface PaymentHistoryResponse {
	invoice_number: string;
	distributor: string;
	grand_total: number;
	total_paid: number;
	balance_due: number;
	status: string;
	payments: PaymentHistoryEntry[];
}

export const getInvoices = async (): Promise<Invoice[]> => {
	const res = await api.get('/invoices');
	const payload = res.data?.data;
	return (payload?.data ?? payload ?? []) as Invoice[];
};

export const getInvoiceById = async (id: string | number) => {
	const res = await api.get(`/invoices/${id}`);
	return res.data?.data;
};

export const createInvoice = async (payload: InvoicePayload) => {
	const res = await api.post('/invoices', payload);
	return res.data?.data;
};

export const recordPayment = async (id: string | number, payload: PaymentPayload) => {
	const formData = new FormData();
	formData.append('amount_paid', String(payload.amount_paid));
	formData.append('payment_method', payload.payment_method);
	if (payload.payment_date) formData.append('payment_date', payload.payment_date);
	if (payload.reference_number) formData.append('reference_number', payload.reference_number);
	if (payload.document) formData.append('document', payload.document);
	const res = await api.post(`/invoices/${id}/payments`, formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return res.data?.data;
};

export const downloadPaymentDocument = async (paymentId: number, defaultFilename: string) => {
	const res = await api.get(`/payments/${paymentId}/download-document`, {
		responseType: 'blob',
	});
	
	// Try to get filename from content-disposition header if available
	let filename = defaultFilename || 'document';
	const contentDisposition = res.headers['content-disposition'];
	if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
		const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
		if (matches != null && matches[1]) {
			filename = matches[1].replace(/['"]/g, '');
		}
	}

	// Use res.data directly since responseType is 'blob', preserving its MIME type
	const blob = new Blob([res.data], { type: res.headers['content-type'] || res.data.type });
	const blobUrl = window.URL.createObjectURL(blob);
	
	const link = document.createElement('a');
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	
	setTimeout(() => {
		window.URL.revokeObjectURL(blobUrl);
	}, 100); // Slight delay for mobile browsers
};

export const getPaymentHistory = async (id: string | number): Promise<PaymentHistoryResponse> => {
	const res = await api.get(`/invoices/${id}/payments`);
	return res.data?.data;
};

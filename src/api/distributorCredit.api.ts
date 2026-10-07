import api from '../lib/axios';

export interface CreditOverview {
    credit_limit: number;
    outstanding_balance: number;
    available_credit: number;
}

export interface SettlementPayload {
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string;
    document?: File | null;
}

export const getCreditOverview = async (distributorId: string | number): Promise<CreditOverview> => {
    const response = await api.get(`/distributor-credit/${distributorId}/overview`);
    return response.data.data;
};

export const getCreditInvoices = async (distributorId: string | number, params?: any) => {
    const response = await api.get(`/distributor-credit/${distributorId}/invoices`, { params });
    return response.data.data;
};

export const getCreditSettlements = async (distributorId: string | number, params?: any) => {
    const response = await api.get(`/distributor-credit/${distributorId}/settlements`, { params });
    return response.data.data;
};

export const recordSettlement = async (distributorId: string | number, payload: SettlementPayload) => {
    const formData = new FormData();
    formData.append('amount', payload.amount.toString());
    formData.append('payment_method', payload.payment_method);
    formData.append('payment_date', payload.payment_date);
    if (payload.reference_number) formData.append('reference_number', payload.reference_number);
    if (payload.document) formData.append('document', payload.document);

    const response = await api.post(`/distributor-credit/${distributorId}/settlements`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
};

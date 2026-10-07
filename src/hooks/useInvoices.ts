import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getInvoices,
	getInvoiceById,
	createInvoice,
	recordPayment,
	getPaymentHistory,
	InvoicePayload,
	PaymentPayload,
} from '../api/invoice.api';

export const useInvoices = () => {
	return useQuery({
		queryKey: ['invoices'],
		queryFn: getInvoices,
	});
};

export const useInvoiceDetails = (id: string | number | null) => {
	return useQuery({
		queryKey: ['invoices', id],
		queryFn: () => getInvoiceById(id!),
		enabled: !!id,
	});
};

export const useCreateInvoice = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createInvoice,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['invoices'] });
		},
	});
};

export const useRecordPayment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string | number; payload: PaymentPayload }) =>
			recordPayment(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['invoices'] });
			queryClient.invalidateQueries({ queryKey: ['invoices', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['invoice-payments', variables.id] });
		},
	});
};

export const usePaymentHistory = (id: string | number | null) => {
	return useQuery({
		queryKey: ['invoice-payments', id],
		queryFn: () => getPaymentHistory(id!),
		enabled: !!id,
	});
};

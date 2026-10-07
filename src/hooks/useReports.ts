import { useQuery } from '@tanstack/react-query';
import {
	getSalesSummary,
	getInventoryReport,
	getSalesRepPerformance,
	getStockMovementsReport,
	getOutstandingInvoices,
} from '../api/report.api';

export const useSalesSummary = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: ['reports', 'sales-summary', params],
		queryFn: () => getSalesSummary(params),
	});
};

export const useInventoryReport = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: ['reports', 'inventory', params],
		queryFn: () => getInventoryReport(params),
	});
};

export const useSalesRepPerformance = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: ['reports', 'sales-rep-performance', params],
		queryFn: () => getSalesRepPerformance(params),
	});
};

export const useStockMovementsReport = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: ['reports', 'stock-movements', params],
		queryFn: () => getStockMovementsReport(params),
	});
};

export const useOutstandingInvoices = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: ['reports', 'outstanding-invoices', params],
		queryFn: () => getOutstandingInvoices(params),
	});
};

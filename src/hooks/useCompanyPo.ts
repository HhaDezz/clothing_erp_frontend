import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getCompanyPurchaseOrders,
	getCompanyPurchaseOrder,
	createCompanyPurchaseOrder,
	approveCompanyPurchaseOrder,
	receiveCompanyPurchaseOrder,
} from '../api/companyPo.api';

export const useCompanyPurchaseOrders = () => {
	return useQuery({
		queryKey: ['companyPurchaseOrders'],
		queryFn: getCompanyPurchaseOrders,
	});
};

export const useCompanyPurchaseOrder = (id: string | number | null) => {
	return useQuery({
		queryKey: ['companyPurchaseOrders', id],
		queryFn: () => getCompanyPurchaseOrder(id!),
		enabled: !!id,
	});
};

export const useCreateCompanyPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createCompanyPurchaseOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['companyPurchaseOrders'] });
		},
	});
};

export const useApproveCompanyPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, approved_quantities }: { id: string | number; approved_quantities?: Record<string, number> }) => 
			approveCompanyPurchaseOrder(id, approved_quantities),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['companyPurchaseOrders'] });
			queryClient.invalidateQueries({ queryKey: ['companyPurchaseOrders', id] });
		},
	});
};

export const useReceiveCompanyPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: receiveCompanyPurchaseOrder,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['companyPurchaseOrders'] });
			queryClient.invalidateQueries({ queryKey: ['companyPurchaseOrders', id] });
		},
	});
};

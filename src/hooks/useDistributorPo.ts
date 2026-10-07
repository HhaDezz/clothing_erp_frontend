import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getDistributorPurchaseOrders,
	getDistributorPurchaseOrder,
	createDistributorPurchaseOrder,
	updateDistributorPurchaseOrder,
	approveDistributorPurchaseOrder,
	dispatchDistributorPurchaseOrder,
	rejectDistributorPurchaseOrder,
} from '../api/distributorPo.api';

export const useDistributorPurchaseOrders = () => {
	return useQuery({
		queryKey: ['distributorPurchaseOrders'],
		queryFn: getDistributorPurchaseOrders,
	});
};

export const useDistributorPurchaseOrder = (id: string | number | null) => {
	return useQuery({
		queryKey: ['distributorPurchaseOrders', id],
		queryFn: () => getDistributorPurchaseOrder(id!),
		enabled: !!id,
	});
};

export const useCreateDistributorPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createDistributorPurchaseOrder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders'] });
		},
	});
};

export const useUpdateDistributorPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string | number; payload: any }) => updateDistributorPurchaseOrder(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders'] });
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders', variables.id] });
		},
	});
};

export const useApproveDistributorPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, approved_quantities }: { id: string | number; approved_quantities?: Record<string, number> }) => 
			approveDistributorPurchaseOrder(id, approved_quantities),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders'] });
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders', id] });
		},
	});
};

export const useDispatchDistributorPurchaseOrder = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: dispatchDistributorPurchaseOrder,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders'] });
			queryClient.invalidateQueries({ queryKey: ['distributorPurchaseOrders', id] });
		},
	});
};

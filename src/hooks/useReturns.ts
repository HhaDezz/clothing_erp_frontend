import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getReturns,
	getReturnById,
	createReturn,
	approveReturn,
	rejectReturn,
	StoreReturnPayload,
	Return,
} from '../api/return.api';

export const useReturns = () => {
	return useQuery<Return[]>({
		queryKey: ['returns'],
		queryFn: getReturns,
	});
};

export const useReturnDetails = (id: string | number | null) => {
	return useQuery<Return>({
		queryKey: ['returns', id],
		queryFn: () => getReturnById(id!),
		enabled: !!id,
	});
};

export const useCreateReturn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createReturn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['returns'] });
		},
	});
};

export const useApproveReturn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: approveReturn,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['returns'] });
			queryClient.invalidateQueries({ queryKey: ['returns', id] });
			queryClient.invalidateQueries({ queryKey: ['distributor-stock'] });
			queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
		},
	});
};

export const useRejectReturn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: rejectReturn,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['returns'] });
			queryClient.invalidateQueries({ queryKey: ['returns', id] });
		},
	});
};

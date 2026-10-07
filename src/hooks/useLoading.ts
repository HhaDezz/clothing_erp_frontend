import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	confirmLoading,
	createLoading,
	getLoading,
	getLoadings,
	markLoaded,
	updateLoading,
} from '../api/loading.api';

export const useLoadings = () =>
	useQuery({ queryKey: ['loading-requests'], queryFn: getLoadings });

export const useLoading = (id: string | number | null) =>
	useQuery({
		queryKey: ['loading-requests', id],
		queryFn: () => getLoading(id!),
		enabled: !!id,
	});

export const useCreateLoading = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createLoading,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loading-requests'] }),
	});
};

export const useUpdateLoading = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
			updateLoading(id, payload),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['loading-requests'] });
			queryClient.invalidateQueries({ queryKey: ['loading-requests', id] });
		},
	});
};

export const useMarkLoaded = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, loadedItems }: { id: string | number; loadedItems: Record<string | number, number> }) =>
			markLoaded(id, loadedItems),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['loading-requests'] });
			queryClient.invalidateQueries({ queryKey: ['loading-requests', id] });
			queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
			queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
		},
	});
};

export const useConfirmLoading = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string | number) => confirmLoading(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['loading-requests'] });
			queryClient.invalidateQueries({ queryKey: ['loading-requests', id] });
		},
	});
};

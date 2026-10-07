import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getSuppliers,
	getSupplier,
	createSupplier,
	updateSupplier,
	deleteSupplier,
} from '../api/supplier.api';

const QUERY_KEY = 'suppliers';

export const useSuppliers = (params?: Record<string, any>) => {
	return useQuery({
		queryKey: [QUERY_KEY, params],
		queryFn: () => getSuppliers(params),
	});
};

export const useSupplier = (id: string | number | null) => {
	return useQuery({
		queryKey: [QUERY_KEY, id],
		queryFn: () => getSupplier(id!),
		enabled: !!id,
	});
};

export const useCreateSupplier = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: FormData) => createSupplier(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
		},
	});
};

export const useUpdateSupplier = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string | number; data: FormData }) => updateSupplier(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
		},
	});
};

export const useDeleteSupplier = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string | number) => deleteSupplier(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
		},
	});
};

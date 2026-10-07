import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmGrn, createGrn, getGrn, getGrns, updateGrn } from '../api/grn.api';

export const useGrns = () =>
	useQuery({ queryKey: ['grns'], queryFn: getGrns });

export const useGrn = (id: string | number | null) =>
	useQuery({
		queryKey: ['grns', id],
		queryFn: () => getGrn(id!),
		enabled: !!id,
	});

export const useCreateGrn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createGrn,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grns'] }),
	});
};

export const useUpdateGrn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
			updateGrn(id, payload),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['grns'] });
			queryClient.invalidateQueries({ queryKey: ['grns', id] });
		},
	});
};

export const useConfirmGrn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string | number) => confirmGrn(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['grns'] });
			queryClient.invalidateQueries({ queryKey: ['grns', id] });
			queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
			queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
		},
	});
};

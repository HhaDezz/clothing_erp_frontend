import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getDeliveryNotes,
	getDeliveryNote,
	createDeliveryNote,
	updateDeliveryNote,
	confirmDeliveryNote,
	StoreDeliveryPayload,
} from '../api/delivery.api';

export const useDeliveryNotes = () => {
	return useQuery({
		queryKey: ['delivery-notes'],
		queryFn: getDeliveryNotes,
	});
};

export const useDeliveryNote = (id: string | number | null) => {
	return useQuery({
		queryKey: ['delivery-notes', id],
		queryFn: () => getDeliveryNote(id!),
		enabled: !!id,
	});
};

export const useCreateDeliveryNote = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createDeliveryNote,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
		},
	});
};

export const useUpdateDeliveryNote = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string | number; payload: StoreDeliveryPayload }) =>
			updateDeliveryNote(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
			queryClient.invalidateQueries({ queryKey: ['delivery-notes', variables.id] });
		},
	});
};

export const useConfirmDeliveryNote = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, receivedItems }: { id: string | number; receivedItems: Record<string | number, number> }) =>
			confirmDeliveryNote(id, receivedItems),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
			queryClient.invalidateQueries({ queryKey: ['delivery-notes', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['distributor-stock'] });
			queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
		},
	});
};

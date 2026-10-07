import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getCreditOverview,
	getCreditInvoices,
	getCreditSettlements,
	recordSettlement,
	SettlementPayload,
} from '../api/distributorCredit.api';

export const useCreditOverview = (distributorId: string | number | null) => {
	return useQuery({
		queryKey: ['distributor-credit', 'overview', distributorId],
		queryFn: () => getCreditOverview(distributorId!),
		enabled: !!distributorId,
	});
};

export const useCreditInvoices = (distributorId: string | number | null, params?: any) => {
	return useQuery({
		queryKey: ['distributor-credit', 'invoices', distributorId, params],
		queryFn: () => getCreditInvoices(distributorId!, params),
		enabled: !!distributorId,
	});
};

export const useCreditSettlements = (distributorId: string | number | null, params?: any) => {
	return useQuery({
		queryKey: ['distributor-credit', 'settlements', distributorId, params],
		queryFn: () => getCreditSettlements(distributorId!, params),
		enabled: !!distributorId,
	});
};

export const useRecordSettlement = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ distributorId, payload }: { distributorId: string | number; payload: SettlementPayload }) =>
			recordSettlement(distributorId, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['distributor-credit', 'overview', variables.distributorId] });
			queryClient.invalidateQueries({ queryKey: ['distributor-credit', 'settlements', variables.distributorId] });
		},
	});
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getWarehouseStock,
	getDistributorStock,
	adjustStock,
	getStockMovements,
	AdjustStockPayload,
} from '../api/inventory.api';

export const useWarehouseStock = (warehouseId: string | number | null) => {
	return useQuery({
		queryKey: ['warehouse-stock', warehouseId],
		queryFn: () => getWarehouseStock(warehouseId!),
		enabled: !!warehouseId,
	});
};

export const useDistributorStock = (distributorId: string | number | null) => {
	return useQuery({
		queryKey: ['distributor-stock', distributorId],
		queryFn: () => getDistributorStock(distributorId!),
		enabled: !!distributorId,
	});
};

export const useStockMovements = () => {
	return useQuery({
		queryKey: ['stock-movements'],
		queryFn: getStockMovements,
	});
};

export const useAdjustStock = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: adjustStock,
		onSuccess: (_, variables) => {
			if (variables.stockable_type === 'warehouse') {
				queryClient.invalidateQueries({ queryKey: ['warehouse-stock', variables.stockable_id] });
			} else {
				queryClient.invalidateQueries({ queryKey: ['distributor-stock', variables.stockable_id] });
			}
			queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
		},
	});
};

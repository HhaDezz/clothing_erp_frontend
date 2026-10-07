import { useQuery } from '@tanstack/react-query';
import { getAllVariantsApi, getVariantsByProductApi } from '../api/products.api';

export const useVariants = (productId: string | number | null) =>
	useQuery({
		queryKey: ['variants', productId],
		queryFn: () => (productId ? getVariantsByProductApi(productId) : Promise.resolve([])),
		enabled: !!productId,
	});

// Every active variant across all products — backs the unified Variant-first
// picker (VariantSearchSelect) used in Purchase Inquiry / Import Process.
export const useAllVariants = () =>
	useQuery({
		queryKey: ['variants', 'all'],
		queryFn: () => getAllVariantsApi(),
	});

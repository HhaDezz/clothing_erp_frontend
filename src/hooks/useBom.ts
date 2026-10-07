import { useQuery } from '@tanstack/react-query';
import { getBomApi } from '../api/products.api';

export const useBom = (productId: string | number | null) =>
	useQuery({
		queryKey: ['bom', productId],
		queryFn: () => (productId ? getBomApi(productId) : Promise.resolve([])),
		enabled: !!productId,
	});

import { useQuery } from '@tanstack/react-query';
import { getProductsApi } from '../api/products.api';

export const useProducts = () =>
	useQuery({
		queryKey: ['products'],
		queryFn: getProductsApi,
	});

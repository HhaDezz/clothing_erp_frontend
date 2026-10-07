import { useQuery } from '@tanstack/react-query';
import { getCrudCollectionApi } from '../api/sharedCrud.api';

export const useCrudCollection = <T>(queryKey: string, endpoint: string) =>
	useQuery({
		queryKey: [queryKey, endpoint],
		queryFn: () => getCrudCollectionApi<T>(endpoint),
		enabled: !!endpoint,
	});

import { useQuery } from '@tanstack/react-query';
import { getDesignationsApi } from '../api/designations.api';

export const useDesignations = () =>
	useQuery({
		queryKey: ['designations'],
		queryFn: getDesignationsApi,
	});

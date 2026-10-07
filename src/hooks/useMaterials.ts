import { useQuery } from '@tanstack/react-query';
import { getMaterialsApi } from '../api/materials.api';

export const useMaterials = () =>
	useQuery({
		queryKey: ['materials'],
		queryFn: getMaterialsApi,
	});

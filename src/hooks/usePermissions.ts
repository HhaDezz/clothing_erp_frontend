import { useQuery } from '@tanstack/react-query';
import { getPermissionsApi } from '../api/roles.api';

export const usePermissions = () =>
	useQuery({
		queryKey: ['permissions'],
		queryFn: getPermissionsApi,
	});

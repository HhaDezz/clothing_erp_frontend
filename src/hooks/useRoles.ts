import { useQuery } from '@tanstack/react-query';
import { getRolesApi } from '../api/roles.api';

export const useRoles = () =>
	useQuery({
		queryKey: ['roles'],
		queryFn: getRolesApi,
	});

import { useQuery } from '@tanstack/react-query';
import { getUsersApi } from '../api/users.api';

export const useUsers = () =>
	useQuery({
		queryKey: ['users'],
		queryFn: getUsersApi,
	});

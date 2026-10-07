import { useQuery } from '@tanstack/react-query';
import { getCustomersApi } from '../api/customers.api';

export const useCustomers = () =>
	useQuery({
		queryKey: ['customers'],
		queryFn: getCustomersApi,
	});

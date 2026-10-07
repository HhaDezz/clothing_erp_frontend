import { useQuery } from '@tanstack/react-query';
import { getDashboardData, DashboardData } from '../api/dashboard.api';

export const useDashboard = (params?: { date_from?: string; date_to?: string }) => {
	return useQuery<DashboardData>({
		queryKey: ['dashboard', params],
		queryFn: () => getDashboardData(params),
		staleTime: 1000 * 60 * 5, // cache for 5 minutes
		refetchOnWindowFocus: false,
	});
};

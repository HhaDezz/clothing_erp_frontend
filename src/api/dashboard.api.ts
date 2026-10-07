import api from '../lib/axios';
import { getOperationalReportRows, OperationalReportRow } from './report.api';

export type DashboardMetricsResponse = {
	totalCustomers: number;
	activeProducts: number;
	pendingOrders: number;
	totalSales: number;
	lowStockItems: number;
	recentOrdersCount: Record<string, number>;
};

export type ClothingDashboardResponse = {
	metrics: DashboardMetricsResponse;
	salesOrders: OperationalReportRow[];
	payments: OperationalReportRow[];
	inventory: OperationalReportRow[];
	purchaseOrders: OperationalReportRow[];
	workOrders: OperationalReportRow[];
	qualityChecks: OperationalReportRow[];
	deliveries: OperationalReportRow[];
	unavailableSections: string[];
};

const emptyMetrics: DashboardMetricsResponse = {
	totalCustomers: 0,
	activeProducts: 0,
	pendingOrders: 0,
	totalSales: 0,
	lowStockItems: 0,
	recentOrdersCount: {},
};

export const getDashboardMetricsApi = async (
	params?: Record<string, string | undefined>,
): Promise<DashboardMetricsResponse> => {
	const response = await api.get('/reports/dashboard', { params });
	return response.data.data;
};

export const getClothingDashboardApi = async (
	params?: Record<string, string | undefined>,
): Promise<ClothingDashboardResponse> => {
	const results = await Promise.allSettled([
		getDashboardMetricsApi(params),
		getOperationalReportRows('sales', params),
		getOperationalReportRows('payments', params),
		getOperationalReportRows('inventory', params),
		getOperationalReportRows('purchasing', params),
		getOperationalReportRows('production', params),
		getOperationalReportRows('quality', params),
		getOperationalReportRows('deliveries', params),
	]);

	const sectionNames = [
		'overview',
		'sales',
		'payments',
		'inventory',
		'purchasing',
		'production',
		'quality control',
		'deliveries',
	];
	const unavailableSections = results.flatMap((result, index) =>
		result.status === 'rejected' ? [sectionNames[index]] : [],
	);
	const rowsAt = (index: number): OperationalReportRow[] => {
		const result = results[index];
		return result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
	};

	return {
		metrics:
			results[0].status === 'fulfilled'
				? (results[0].value as DashboardMetricsResponse)
				: emptyMetrics,
		salesOrders: rowsAt(1),
		payments: rowsAt(2),
		inventory: rowsAt(3),
		purchaseOrders: rowsAt(4),
		workOrders: rowsAt(5),
		qualityChecks: rowsAt(6),
		deliveries: rowsAt(7),
		unavailableSections,
	};
};

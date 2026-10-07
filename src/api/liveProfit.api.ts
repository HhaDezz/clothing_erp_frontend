import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// Mirrors LiveProfitLineResponse on the backend (LiveProfitService) —
// manager-only, kept off the cashier's own POS screen by design.
export type LiveProfitLine = {
	saleItemId: number;
	salesOrderId: number;
	orderNo: string;
	soldAt: string;
	showroomName?: string | null;
	sku?: string | null;
	productName?: string | null;
	qty: number;
	unitPrice: number;
	revenue: number;
	unitCost: number;
	costIsExact: boolean;
	totalCost: number;
	profit: number;
	marginPercent: number;
};

export type LiveProfitReport = {
	lines: LiveProfitLine[];
	totalRevenue: number;
	totalCost: number;
	totalProfit: number;
	marginPercent: number;
};

export const getLiveProfitApi = (days = 30, limit = 200) =>
	api
		.get<ApiResponse<LiveProfitReport>>('/reports/live-profit', { params: { days, limit } })
		.then((res) => res.data.data);

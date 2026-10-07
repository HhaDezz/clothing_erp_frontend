import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type BarcodeUnitStatus = 'AWAITING_ISSUE' | 'IN_TRANSIT' | 'IN_STOCK' | 'SOLD';

// One row of the Barcode Item Log — see BarcodeUnitController /
// BarcodeUnitLogResponse on the backend.
export type BarcodeUnitLogRow = {
	id: number;
	barcode: string;
	unitNo: number;
	status: BarcodeUnitStatus;
	variantId: number;
	sku: string;
	productName?: string | null;
	size?: string | null;
	color?: string | null;
	requestNo: string;
	warehouseName: string;
	issuedAt?: string | null;
	soldAt?: string | null;
	soldSalesOrderId?: number | null;
	soldOrderNo?: string | null;
};

// Every per-garment tag ever sent to this showroom, newest first.
export const getBarcodeUnitLogApi = (showroomId: number) =>
	api
		.get<ApiResponse<BarcodeUnitLogRow[]>>('/barcode-units', { params: { showroomId } })
		.then((res) => res.data.data ?? []);

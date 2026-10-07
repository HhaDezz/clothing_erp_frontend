import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type InquiryStatus =
	| 'DRAFT_INQUIRY'
	| 'PENDING_GF_CONFIRM'
	| 'GF_CONFIRMED'
	| 'SL_RECONFIRMED'
	| 'PO_APPROVED'
	| 'AWAITING_PI'
	| 'PI_UPLOADED'
	| 'PAYMENT_PROCESSED'
	| 'PO_FINALIZED'
	| 'GOODS_REQUESTED';

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
	DRAFT_INQUIRY: 'Draft Inquiry',
	PENDING_GF_CONFIRM: 'Pending GF Confirm',
	GF_CONFIRMED: 'GF Confirmed',
	SL_RECONFIRMED: 'SL Re-confirmed',
	PO_APPROVED: 'PO Approved',
	AWAITING_PI: 'Awaiting PI',
	PI_UPLOADED: 'PI Uploaded',
	PAYMENT_PROCESSED: 'Payment Processed',
	PO_FINALIZED: 'PO Finalized',
	GOODS_REQUESTED: 'Goods Requested',
};

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
	DRAFT_INQUIRY: 'secondary',
	PENDING_GF_CONFIRM: 'warning',
	GF_CONFIRMED: 'info',
	SL_RECONFIRMED: 'primary',
	PO_APPROVED: 'success',
	AWAITING_PI: 'warning',
	PI_UPLOADED: 'info',
	PAYMENT_PROCESSED: 'primary',
	PO_FINALIZED: 'success',
	GOODS_REQUESTED: 'info',
};

export type PurchaseInquiryItemPayload = {
	productId?: number | null;
	// Preferred over productId going forward — a specific SKU/size/color.
	// product is derived server-side from the variant once the backend DTO
	// supports it (PurchaseInquiryItemRequest — pending); until then this is
	// sent but not yet read by the API.
	variantId?: number | null;
	description?: string;
	quantity: number;
	unit?: string;
	unitPrice: number;
};

export type PurchaseInquiryPayload = {
	title?: string;
	notes?: string;
	gfContactEmail?: string;
	items?: PurchaseInquiryItemPayload[];
};

export type PurchaseInquiryItemResponse = {
	id: number;
	productId: number | null;
	productName: string | null;
	// Populated once the backend DTO supports it (PurchaseInquiryItemResponse
	// — pending); undefined/null until then.
	variantId?: number | null;
	variantSku?: string | null;
	variantSize?: string | null;
	variantColor?: string | null;
	description: string | null;
	quantity: number;
	unit: string | null;
	unitPrice: number;
	totalPrice: number;
};

export type PurchaseInquiryResponse = {
	id: number;
	inquiryNo: string;
	title: string | null;
	notes: string | null;
	gfContactEmail: string | null;
	status: InquiryStatus;
	createdById: number;
	createdByName: string;
	totalAmount: number;
	piDocumentPath: string | null;
	ttDocumentPath: string | null;
	items: PurchaseInquiryItemResponse[];
	createdAt: string;
	updatedAt: string;
};

const BASE = '/purchase-inquiries';

export const getInquiriesApi = () =>
	api.get<ApiResponse<PurchaseInquiryResponse[]>>(BASE).then((r) => r.data.data);

export const getInquiryByIdApi = (id: number) =>
	api.get<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}`).then((r) => r.data.data);

export const createInquiryApi = (payload: PurchaseInquiryPayload) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(BASE, payload).then((r) => r.data.data);

export const updateInquiryApi = (id: number, payload: PurchaseInquiryPayload) =>
	api.put<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}`, payload).then((r) => r.data.data);

// State machine transitions
export const sendToGfApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/send-to-gf`).then((r) => r.data.data);

export const markGfConfirmedApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/gf-confirm`).then((r) => r.data.data);

export const slReconfirmApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/sl-reconfirm`).then((r) => r.data.data);

export const financeApproveApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/finance-approve`).then((r) => r.data.data);

export const sendPoToGfApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/send-po-to-gf`).then((r) => r.data.data);

export const uploadPiApi = (id: number, file: File) => {
	const form = new FormData();
	form.append('file', file);
	return api
		.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/upload-pi`, form, {
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		.then((r) => r.data.data);
};

export const uploadTtApi = (id: number, file: File) => {
	const form = new FormData();
	form.append('file', file);
	return api
		.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/upload-tt`, form, {
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		.then((r) => r.data.data);
};

export const finalizePoApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/finalize`).then((r) => r.data.data);

// V60: TT + PI payment confirmed — ask GF Office to dispatch the goods
export const requestGoodsApi = (id: number) =>
	api.post<ApiResponse<PurchaseInquiryResponse>>(`${BASE}/${id}/request-goods`).then((r) => r.data.data);

// ─── DOCUMENT VIEWING ─────────────────────────────────────────────────────
// piDocumentPath/ttDocumentPath on the inquiry are server-local filesystem
// paths, not URLs — they were never reachable from the browser. This fetches
// the file as a blob through the authenticated axios client (so the JWT goes
// along with it, same as every other call here) and reads the real filename
// back off the Content-Disposition header the backend now sets.
export type InquiryDocumentType = 'pi' | 'tt';

export const getInquiryDocumentApi = (id: number, type: InquiryDocumentType) =>
	api
		.get(`${BASE}/${id}/${type}/file`, { responseType: 'blob' })
		.then((res) => {
			const disposition = (res.headers?.['content-disposition'] ?? '') as string;
			const match = /filename="?([^";]+)"?/i.exec(disposition);
			const filename = match?.[1] ?? `${type.toUpperCase()}-document`;
			return { blob: res.data as Blob, filename };
		});

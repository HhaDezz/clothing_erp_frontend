import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type ImportShipmentStatus =
	| 'DRAFT_INTAKE'
	| 'COSTING_SUBMITTED'
	| 'PROCUREMENT_REVIEW'
	| 'PENDING_FINANCE_APPROVAL'
	| 'PROCUREMENT_APPROVED'
	| 'RECEIVING_BAY1'
	| 'QA_BAY2'
	| 'GRN_GENERATED'
	| 'FINANCE_VAT_PENDING'
	| 'PENDING_HIGHER_APPROVAL'
	| 'STOCK_COMMITTED';

export const IMPORT_SHIPMENT_STATUS_LABELS: Record<ImportShipmentStatus, string> = {
	DRAFT_INTAKE: 'Draft Intake',
	COSTING_SUBMITTED: 'Costing Submitted',
	PROCUREMENT_REVIEW: 'Procurement Review',
	PENDING_FINANCE_APPROVAL: 'Pending Finance Approval',
	PROCUREMENT_APPROVED: 'Procurement Approved',
	RECEIVING_BAY1: 'Receiving (Bay 1)',
	QA_BAY2: 'Quality Assurance (Bay 2)',
	GRN_GENERATED: 'GRN Generated',
	FINANCE_VAT_PENDING: 'Finance VAT Pending',
	PENDING_HIGHER_APPROVAL: 'Pending Higher Approval',
	STOCK_COMMITTED: 'Stock Committed',
};

// Full state-machine order, used to tell whether a shipment has already
// moved past a given page's step (for that page's History tab) — see
// "Import Process Implementation Plan" doc. RECEIVING_BAY1 / QA_BAY2 /
// GRN_GENERATED are now umbrella statuses driven by the furthest-behind
// warehouse leg — see ImportShipmentService#recomputeShipmentStatus on the
// backend and the "Warehouse Legs" section in ImportShipmentDetailDrawer for
// each warehouse's own independent progress.
export const IMPORT_SHIPMENT_STATUS_ORDER: ImportShipmentStatus[] = [
	'DRAFT_INTAKE',
	'COSTING_SUBMITTED',
	'PROCUREMENT_REVIEW',
	'PENDING_FINANCE_APPROVAL',
	'PROCUREMENT_APPROVED',
	'RECEIVING_BAY1',
	'QA_BAY2',
	'GRN_GENERATED',
	'FINANCE_VAT_PENDING',
	'PENDING_HIGHER_APPROVAL',
	'STOCK_COMMITTED',
];

export const IMPORT_SHIPMENT_STATUS_COLORS: Record<ImportShipmentStatus, string> = {
	DRAFT_INTAKE: 'secondary',
	COSTING_SUBMITTED: 'info',
	PROCUREMENT_REVIEW: 'warning',
	PENDING_FINANCE_APPROVAL: 'warning',
	PROCUREMENT_APPROVED: 'primary',
	RECEIVING_BAY1: 'primary',
	QA_BAY2: 'primary',
	GRN_GENERATED: 'info',
	FINANCE_VAT_PENDING: 'warning',
	PENDING_HIGHER_APPROVAL: 'warning',
	STOCK_COMMITTED: 'success',
};

export type ImportShipmentItemPayload = {
	productId?: number | null;
	variantId?: number | null;
	description?: string;
	quantity: number;
	unit?: string;
};

export type ImportShipmentPayload = {
	gfReference?: string;
	items?: ImportShipmentItemPayload[];
};

export type ImportCostingItemPayload = {
	itemId: number;
	costingPrice: number;
	baselineSellingPrice: number;
};

export type ImportCostingPayload = {
	items: ImportCostingItemPayload[];
};

export type ImportPriceReviewItemPayload = {
	itemId: number;
	adjustedSellingPrice?: number | null;
};

export type ImportPriceReviewPayload = {
	items: ImportPriceReviewItemPayload[];
};

export type ImportVatItemPayload = {
	itemId: number;
	finalSellingPrice: number;
};

export type ImportVatPayload = {
	vatAmount: number;
	items: ImportVatItemPayload[];
};

export type ImportQaDefectResponse = {
	id: number;
	defectiveReasonId: number | null;
	defectiveReasonLabel: string | null;
	qty: number;
};

export type ImportShipmentItemResponse = {
	id: number;
	productId: number | null;
	productName: string | null;
	variantId: number | null;
	variantSku: string | null;
	variantSize: string | null;
	variantColor: string | null;
	description: string | null;
	quantity: number;
	unit: string | null;
	costingPrice: number;
	baselineSellingPrice: number;
	adjustedSellingPrice: number | null;
	finalSellingPrice: number | null;
	// Pre-warehouse-split (deprecated) receiving/QA fields — always 0 for any
	// shipment received through the per-warehouse leg flow. Kept only so
	// pre-migration shipments still display correctly. See each warehouse's
	// own figures in ImportShipmentWarehouseLegItemResponse instead.
	receivedQty: number;
	qaPassedQty: number;
	qaDefectiveQty: number;
	defects: ImportQaDefectResponse[];
};

export type ImportShipmentDocumentResponse = {
	id: number;
	originalFilename: string | null;
};

export type ImportGrnItemResponse = {
	id: number;
	shipmentItemId: number | null;
	productId: number | null;
	productName: string | null;
	variantId: number | null;
	variantSku: string | null;
	description: string | null;
	orderedQty: number | null;
	receivedQty: number | null;
	unit: string | null;
	acceptedQty: number;
	defectiveQty: number;
	defects: ImportQaDefectResponse[];
};

// Deprecated (pre-warehouse-split) whole-shipment GRN — only ever populated
// on shipments that were received before per-warehouse GRNs shipped. Every
// shipment received since then leaves this null; see the warehouse-legs
// endpoints below for the current, per-warehouse GRN(s).
export type ImportGrnResponse = {
	id: number;
	grnNo: string;
	shipmentId: number | null;
	generatedById: number | null;
	generatedByName: string | null;
	generatedAt: string;
	totalAcceptedQty: number;
	totalDefectiveQty: number;
	pdfAvailable: boolean;
	items: ImportGrnItemResponse[];
};

export type ImportShipmentResponse = {
	id: number;
	shipmentNo: string;
	// The shipment's own packing reference — generated at creation, e.g.
	// "PKG-2026-0001". Each warehouse leg of this shipment shares this same
	// base reference with its own "-WH{id}" suffix (see
	// GoodsTransferBarcodeModal's packing-list picker). Null for shipments
	// created before this feature existed.
	packingRefNo: string | null;
	gfReference: string | null;
	status: ImportShipmentStatus;
	createdById: number;
	createdByName: string;
	totalCostingValue: number;
	totalSellingValue: number;
	procurementApprovedByName: string | null;
	procurementApprovedAt: string | null;
	financeApprovedByName: string | null;
	financeApprovedAt: string | null;
	sourceInquiryId: number | null;
	sourceInquiryNo: string | null;
	deliveryConfirmationNote: string | null;
	grn: ImportGrnResponse | null;
	vatAmount: number | null;
	finalSellingAdjustedByName: string | null;
	higherApprovedByName: string | null;
	higherApprovedAt: string | null;
	stockCommittedAt: string | null;
	items: ImportShipmentItemResponse[];
	documents: ImportShipmentDocumentResponse[];
	createdAt: string;
};

const BASE = '/import-shipments';

export const getImportShipmentsApi = () =>
	api.get<ApiResponse<ImportShipmentResponse[]>>(BASE).then((r) => r.data.data);

export const getImportShipmentByIdApi = (id: number) =>
	api.get<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}`).then((r) => r.data.data);

export const createImportShipmentApi = (payload: ImportShipmentPayload) =>
	api.post<ApiResponse<ImportShipmentResponse>>(BASE, payload).then((r) => r.data.data);

export const updateImportShipmentItemsApi = (id: number, payload: ImportShipmentPayload) =>
	api.put<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/items`, payload).then((r) => r.data.data);

// Only allowed while the shipment is still DRAFT_INTAKE — see the backend guard.
export const deleteImportShipmentApi = (id: number) =>
	api.delete<ApiResponse<null>>(`${BASE}/${id}`).then((r) => r.data.data);

export const submitImportCostingApi = (id: number, payload: ImportCostingPayload) =>
	api
		.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/submit-costing`, payload)
		.then((r) => r.data.data);

export const uploadImportShipmentDocumentApi = (id: number, file: File) => {
	const form = new FormData();
	form.append('file', file);
	return api
		.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/documents`, form, {
			headers: { 'Content-Type': 'multipart/form-data' },
		})
		.then((r) => r.data.data);
};

// ─── LINK FROM PURCHASE INQUIRY ─────────────────────────────────────────────
// Bridges the Purchase Inquiry workflow into the Import Process — a
// PO_FINALIZED inquiry can spawn one or more import shipments as its goods
// arrive from the GF Office.

export const createImportShipmentFromInquiryApi = (inquiryId: number) =>
	api
		.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/from-inquiry/${inquiryId}`)
		.then((r) => r.data.data);

export const getImportShipmentsByInquiryApi = (inquiryId: number) =>
	api
		.get<ApiResponse<ImportShipmentResponse[]>>(`${BASE}/by-inquiry/${inquiryId}`)
		.then((r) => r.data.data);

// ─── PROCUREMENT PRICE REVIEW (step 3) ─────────────────────────────────────

export const startImportPriceReviewApi = (id: number) =>
	api.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/start-review`).then((r) => r.data.data);

export const submitImportPriceReviewApi = (id: number, payload: ImportPriceReviewPayload) =>
	api
		.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/submit-price-review`, payload)
		.then((r) => r.data.data);

export const financeApproveImportPriceApi = (id: number) =>
	api
		.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/finance-approve-price`)
		.then((r) => r.data.data);

// ─── WAREHOUSE LEGS — per-warehouse Receive Bay1 / QA Bay2 / GRN ───────────
// "if user 1 allocated warehouse 1, shipment has 100 items 50 goes to
// warehouse 1 and 50 goes to warehouse 2, user 1 can accept only 50, need
// multiple grn if allocated multiple warehouses" — each warehouse a
// shipment's items are split across (see the Warehouse Allocation section
// below) runs its own independent Receive Bay1 -> QA Bay2 -> GRN cycle,
// fully asynchronous of any other warehouse on the same shipment. A user
// restricted to specific warehouse(s) can only act on their own — the
// backend enforces this (403) even if this list shows every warehouse's leg.

export type ImportShipmentWarehouseLegStage = 'PENDING_RECEIVING' | 'RECEIVED' | 'QA_DONE' | 'GRN_GENERATED';

export const IMPORT_LEG_STAGE_LABELS: Record<ImportShipmentWarehouseLegStage, string> = {
	PENDING_RECEIVING: 'Awaiting Receiving',
	RECEIVED: 'Awaiting QA',
	QA_DONE: 'Awaiting GRN',
	GRN_GENERATED: 'GRN Generated',
};

export const IMPORT_LEG_STAGE_COLORS: Record<ImportShipmentWarehouseLegStage, string> = {
	PENDING_RECEIVING: 'secondary',
	RECEIVED: 'primary',
	QA_DONE: 'info',
	GRN_GENERATED: 'success',
};

export type ImportShipmentWarehouseLegDefectResponse = {
	id: number;
	defectiveReasonId: number | null;
	defectiveReasonLabel: string | null;
	qty: number;
};

export type ImportShipmentWarehouseLegItemResponse = {
	allocationId: number;
	shipmentItemId: number | null;
	variantId: number | null;
	sku: string | null;
	size: string | null;
	color: string | null;
	productId: number | null;
	productName: string | null;
	description: string | null;
	plannedQty: number;
	receivedQty: number;
	receivedAt: string | null;
	qaPassedQty: number;
	qaDefectiveQty: number;
	qaSubmittedAt: string | null;
	defects: ImportShipmentWarehouseLegDefectResponse[];
};

export type ImportShipmentWarehouseLegResponse = {
	warehouseId: number | null;
	warehouseName: string | null;
	legStage: ImportShipmentWarehouseLegStage;
	receivedAt: string | null;
	receivedByName: string | null;
	deliveryConfirmationNote: string | null;
	qaSubmittedAt: string | null;
	qaSubmittedByName: string | null;
	grnId: number | null;
	grnNo: string | null;
	grnGeneratedAt: string | null;
	grnTotalAcceptedQty: number | null;
	grnTotalDefectiveQty: number | null;
	// Left over from the backend's original (server-rendered) per-warehouse
	// GRN PDF plan and always false today — that server-side endpoint was
	// never built. The frontend no longer waits on it: PrintGrnPdfButton
	// (see ImportShipmentDetailDrawer's "Warehouse Legs" section) generates
	// the GRN PDF entirely client-side, from this leg's own fields plus
	// `items` below, whenever `grnNo` is set — see helpers/generateGrnPdf.ts.
	grnPdfAvailable: boolean;
	items: ImportShipmentWarehouseLegItemResponse[];
};

export const getImportWarehouseLegsApi = (shipmentId: number) =>
	api
		.get<ApiResponse<ImportShipmentWarehouseLegResponse[]>>(`${BASE}/${shipmentId}/warehouse-legs`)
		.then((r) => r.data.data);

export type ImportLegReceivingItemPayload = {
	allocationId: number;
	receivedQty: number;
};

export type ImportLegReceivingPayload = {
	items: ImportLegReceivingItemPayload[];
	deliveryConfirmationNote?: string;
};

export const receiveImportLegBay1Api = (shipmentId: number, warehouseId: number, payload: ImportLegReceivingPayload) =>
	api
		.post<ApiResponse<ImportShipmentWarehouseLegResponse>>(
			`${BASE}/${shipmentId}/warehouses/${warehouseId}/receive-bay1`,
			payload,
		)
		.then((r) => r.data.data);

// A single line's defective qty can be split across multiple reasons — e.g.
// of 50 pcs received, 5 "Missing" and 4 "Crashed".
export type ImportLegQaDefectPayload = {
	defectiveReasonId: number;
	qty: number;
};

export type ImportLegQaItemPayload = {
	allocationId: number;
	qaPassedQty: number;
	defects: ImportLegQaDefectPayload[];
};

export type ImportLegQaPayload = {
	items: ImportLegQaItemPayload[];
};

export const submitImportLegQaApi = (shipmentId: number, warehouseId: number, payload: ImportLegQaPayload) =>
	api
		.post<ApiResponse<ImportShipmentWarehouseLegResponse>>(`${BASE}/${shipmentId}/warehouses/${warehouseId}/qa-bay2`, payload)
		.then((r) => r.data.data);

export const generateImportLegGrnApi = (shipmentId: number, warehouseId: number) =>
	api
		.post<ApiResponse<ImportShipmentWarehouseLegResponse>>(
			`${BASE}/${shipmentId}/warehouses/${warehouseId}/generate-grn`,
		)
		.then((r) => r.data.data);

// Legacy — only serves a shipment that already generated a single
// whole-shipment GRN before per-warehouse GRNs shipped (ImportGrnResponse
// above). 404s for anything received through the warehouse-legs flow.
export const getImportGrnPdfApi = (shipmentId: number) =>
	api.get(`${BASE}/${shipmentId}/grn/pdf`, { responseType: 'blob' }).then((res) => {
		const disposition = (res.headers?.['content-disposition'] ?? '') as string;
		const match = /filename="?([^";]+)"?/i.exec(disposition);
		const filename = match?.[1] ?? `GRN-${shipmentId}.pdf`;
		return { blob: res.data as Blob, filename };
	});

// ─── FINANCE VAT AND FINAL PRICING (step 8) ────────────────────────────────

export const applyImportVatApi = (id: number, payload: ImportVatPayload) =>
	api.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/apply-vat`, payload).then((r) => r.data.data);

// ─── HIGHER APPROVAL (step 9) ──────────────────────────────────────────────

export const higherApproveImportApi = (id: number) =>
	api.post<ApiResponse<ImportShipmentResponse>>(`${BASE}/${id}/higher-approve`).then((r) => r.data.data);

// Server-local paths on ImportShipmentDocument rows aren't reachable from the
// browser directly — this streams the file as a blob through the authenticated
// axios client and reads the real filename back off Content-Disposition.
export const getImportShipmentDocumentApi = (shipmentId: number, documentId: number) =>
	api
		.get(`${BASE}/${shipmentId}/documents/${documentId}/file`, { responseType: 'blob' })
		.then((res) => {
			const disposition = (res.headers?.['content-disposition'] ?? '') as string;
			const match = /filename="?([^";]+)"?/i.exec(disposition);
			const filename = match?.[1] ?? `document-${documentId}`;
			return { blob: res.data as Blob, filename };
		});

// ─── WAREHOUSE ALLOCATION (editable any time before receiving starts) ──────
// "same import shipment can have multiple warehouses like shipment have 100
// items 30 goes to warehouse 1 70 goes to warehouse 2" — split per item, not
// per shipment. Drives which "incoming shipment" list a Storekeeper sees —
// see ImportShipmentService#getAllShipments on the backend.

export type ImportWarehouseAllocationResponse = {
	id: number;
	shipmentItemId: number | null;
	warehouseId: number | null;
	warehouseName: string | null;
	quantity: number;
	lineNo: number;
};

export type ImportWarehouseAllocationLinePayload = {
	warehouseId: number;
	quantity: number;
};

export type ImportWarehouseAllocationItemPayload = {
	itemId: number;
	allocations: ImportWarehouseAllocationLinePayload[];
};

export type ImportWarehouseAllocationPayload = {
	items: ImportWarehouseAllocationItemPayload[];
};

export const getImportWarehouseAllocationsApi = (shipmentId: number) =>
	api
		.get<ApiResponse<ImportWarehouseAllocationResponse[]>>(`${BASE}/${shipmentId}/warehouse-allocations`)
		.then((r) => r.data.data);

export const updateImportWarehouseAllocationsApi = (
	shipmentId: number,
	payload: ImportWarehouseAllocationPayload,
) =>
	api
		.put<ApiResponse<ImportWarehouseAllocationResponse[]>>(`${BASE}/${shipmentId}/warehouse-allocations`, payload)
		.then((r) => r.data.data);

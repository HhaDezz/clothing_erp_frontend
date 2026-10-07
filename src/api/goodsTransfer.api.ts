import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type GoodsTransferStatus =
	| 'REQUESTED'
	| 'APPROVED'
	| 'REJECTED'
	| 'PARTIALLY_BARCODED'
	| 'BARCODED'
	| 'PARTIALLY_ISSUED'
	| 'ISSUED'
	| 'RECEIVED';

// Linear progression used to tell whether a request has already moved past
// a given page's own step, for that page's History tab (see
// GoodsTransferReviewPage / GoodsTransferWarehousePage) — mirrors
// IMPORT_SHIPMENT_STATUS_ORDER's role for the import workflow. REJECTED is a
// terminal fork off REQUESTED rather than a further step down this line, so
// pages that need it handle it as its own case instead of placing it here.
export const GOODS_TRANSFER_STATUS_ORDER: GoodsTransferStatus[] = [
	'REQUESTED',
	'APPROVED',
	'PARTIALLY_BARCODED',
	'BARCODED',
	'PARTIALLY_ISSUED',
	'ISSUED',
	'RECEIVED',
];

// One physical unit's own printable tag — "if requested items are 20, store
// keeper generate 20 bar codes and print and tag to the items". Distinct
// from `barcode` below (the variant/SKU-level barcode reused across every
// request), these exist only for this request's own items. Scoped to one
// warehouse's own allocation slice, not the whole item — "only 50 barcodes
// can be created by warehouse 1 assigned user" when a 100-unit line is
// split 50/50 across two warehouses.
export type GoodsTransferBarcodeUnit = {
	id: number;
	unitNo: number;
	barcode: string;
};

// One warehouse's slice of an approved item — SL Operations can split a
// single line across several source warehouses (e.g. 20 pcs as 10 from
// Warehouse 1 + 10 from Warehouse 2); each is barcoded and issued
// independently by that warehouse's own store keeper.
export type GoodsTransferAllocation = {
	id: number;
	warehouseId: number;
	warehouseName: string;
	allocatedQty: number;
	issuedQty: number;
	issuedAt: string | null;
	barcodeUnits: GoodsTransferBarcodeUnit[];
};

export type GoodsTransferItem = {
	id: number;
	variantId: number;
	sku: string;
	barcode: string | null;
	productName: string | null;
	size: string | null;
	color: string | null;
	requestedQty: number;
	approvedQty: number | null;
	issuedQty: number | null;
	allocations: GoodsTransferAllocation[];
	// Flattened across every allocation — a simple total-tags-generated
	// count. Per-warehouse breakdown lives on each entry in `allocations`
	// above (that's what the Barcode modal scopes by warehouse).
	barcodeUnits: GoodsTransferBarcodeUnit[];
};

export type GoodsTransferRequest = {
	id: number;
	requestNo: string;
	status: GoodsTransferStatus;
	showroomId: number | null;
	showroomName: string | null;
	warehouseId: number | null;
	warehouseName: string | null;
	requestedById: number | null;
	requestedByName: string | null;
	approvedByName: string | null;
	issuedByName: string | null;
	receivedByName: string | null;
	requestedAt: string | null;
	approvedAt: string | null;
	barcodedAt: string | null;
	issuedAt: string | null;
	receivedAt: string | null;
	notes: string | null;
	rejectionReason: string | null;
	receivingNote: string | null;
	items: GoodsTransferItem[];
};

export type GoodsTransferItemLine = {
	variantId: number;
	quantity: number;
};

export type GoodsTransferCreatePayload = {
	showroomId: number;
	notes?: string;
	items: GoodsTransferItemLine[];
};

// SL Operations' approval payload — every line must carry at least one
// warehouse allocation now that issuing happens per-warehouse.
export type GoodsTransferAllocationLine = {
	warehouseId: number;
	quantity: number;
};

export type GoodsTransferApprovalItemLine = {
	variantId: number;
	allocations: GoodsTransferAllocationLine[];
};

export type GoodsTransferApprovalPayload = {
	items: GoodsTransferApprovalItemLine[];
};

// One selectable packing list — a single landed lot (StockBatch) of this
// exact item still holding stock at this warehouse — for the picker in
// front of "Generate Barcodes". "packingRefNo" is the shipment's own
// packing reference plus this warehouse's code (e.g. "PKG-2026-0001-WH03")
// — null for a shipment that predates packing reference numbers, in which
// case the modal falls back to showing `shipmentNo`.
export type PackingListOption = {
	batchId: number;
	packingRefNo: string | null;
	shipmentNo: string;
	sourceInquiryId: number | null;
	sourceInquiryNo: string | null;
	receivedAt: string;
	remainingQty: number;
	unitCostIncVat: number | null;
};

// One still-un-tagged allocation at the warehouse the keeper is generating
// for, with the packing lists it can draw its units from — "since we track
// items with purchase inquiry, need to ask which purchase inquiry items to
// be bar coded... warehouse keeper should select which packing list he bar
// coding".
export type AllocationPackingOptions = {
	allocationId: number;
	itemId: number;
	variantId: number;
	sku: string;
	productName: string | null;
	size: string | null;
	color: string | null;
	allocatedQty: number;
	options: PackingListOption[];
};

// One packing list's contribution to an allocation's units — `batchId: null`
// keeps the old "no packing list / unknown source" degrade for stock with
// no import lineage (now an explicit choice instead of a silent fallback).
export type PackingListDraw = {
	batchId: number | null;
	qty: number;
};

export type GoodsTransferAllocationDraws = {
	allocationId: number;
	draws: PackingListDraw[];
};

const BASE = '/goods-transfers';

export const getGoodsTransfersApi = () =>
	api.get<ApiResponse<GoodsTransferRequest[]>>(BASE).then((r) => r.data.data);

export const getGoodsTransferByIdApi = (id: number) =>
	api.get<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}`).then((r) => r.data.data);

export const createGoodsTransferApi = (payload: GoodsTransferCreatePayload) =>
	api.post<ApiResponse<GoodsTransferRequest>>(BASE, payload).then((r) => r.data.data);

export const approveGoodsTransferApi = (id: number, payload: GoodsTransferApprovalPayload) =>
	api.put<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}/approve`, payload).then((r) => r.data.data);

export const rejectGoodsTransferApi = (id: number, reason: string) =>
	api.put<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}/reject`, { reason }).then((r) => r.data.data);

// The packing-list picker behind "Generate Barcodes" — every still-un-tagged
// allocation at this warehouse, each with the packing lists it can draw
// from (see GoodsTransferService#getPackingListOptions).
export const getPackingListOptionsApi = (id: number, warehouseId: number) =>
	api
		.get<ApiResponse<AllocationPackingOptions[]>>(`${BASE}/${id}/warehouses/${warehouseId}/packing-lists`)
		.then((r) => r.data.data);

// Each warehouse's own assigned store keeper calls this with just their
// warehouseId and, for every allocation they're generating this call, which
// packing list(s) to draw its units from — "warehouse keeper should select
// which packing list he bar coding". An allocation left out of `allocations`
// simply isn't generated this call (generate it in a later one). "Specific
// barcodes can be generated by warehouse assigned user... only 50 barcodes
// can be created by warehouse 1 assigned user" when a 100-unit line is split
// 50/50 across two warehouses.
export const generateGoodsTransferBarcodesApi = (
	id: number,
	warehouseId: number,
	allocations: GoodsTransferAllocationDraws[],
) =>
	api
		.put<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}/generate-barcodes`, { warehouseId, allocations })
		.then((r) => r.data.data);

// Each warehouse's own store keeper calls this with just their warehouseId —
// only that warehouse's pending allocation slices on the request are issued.
export const issueGoodsTransferApi = (id: number, warehouseId: number) =>
	api.put<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}/issue`, { warehouseId }).then((r) => r.data.data);

export const receiveGoodsTransferApi = (id: number, receivingNote?: string) =>
	api.put<ApiResponse<GoodsTransferRequest>>(`${BASE}/${id}/receive`, { receivingNote }).then((r) => r.data.data);

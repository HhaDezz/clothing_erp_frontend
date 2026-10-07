import api from '../lib/axios';

type ApiEnvelope<T> = {
	data?: T;
};

const numberValue = (value: unknown, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const getData = (payload: unknown): unknown =>
	payload && typeof payload === 'object' && 'data' in payload
		? (payload as ApiEnvelope<unknown>).data
		: payload;

const toApiList = <T>(payload: unknown): T[] => {
	const value = getData(payload);
	if (Array.isArray(value)) return value as T[];
	if (value && typeof value === 'object') {
		const row = value as Record<string, unknown>;
		for (const key of ['data', 'content', 'items', 'rows']) {
			if (Array.isArray(row[key])) return row[key] as T[];
		}
	}
	return [];
};

const normalizeWorkOrder = (value: WorkOrderResponse): WorkOrderResponse => {
	const row = value as WorkOrderResponse & Record<string, any>;
	return {
		id: numberValue(row.id),
		woNo: row.woNo ?? row.wo_no ?? row.workOrderNo ?? row.work_order_no ?? '',
		salesOrderId: numberValue(
			row.salesOrderId ?? row.sales_order_id ?? row.salesOrder?.id ?? row.sales_order?.id,
		),
		salesOrderNo:
			row.salesOrderNo ??
			row.sales_order_no ??
			row.salesOrder?.orderNo ??
			row.salesOrder?.order_no ??
			row.sales_order?.orderNo ??
			row.sales_order?.order_no ??
			'',
		garmentType: row.garmentType ?? row.garment_type ?? null,
		plannedQty: numberValue(row.plannedQty ?? row.planned_qty),
		completedQty: numberValue(row.completedQty ?? row.completed_qty),
		assignedTeam: row.assignedTeam ?? row.assigned_team ?? null,
		status: String(row.status || 'PENDING').toUpperCase() as WorkOrderResponse['status'],
		dueDate: row.dueDate ?? row.due_date ?? null,
		notes: row.notes ?? null,
		createdAt: row.createdAt ?? row.created_at ?? '',
	};
};

const normalizeProductionStage = (value: ProductionStageResponse): ProductionStageResponse => {
	const row = value as ProductionStageResponse & Record<string, any>;
	return {
		id: numberValue(row.id),
		workOrderId: numberValue(row.workOrderId ?? row.work_order_id ?? row.workOrder?.id),
		stage: String(row.stage || 'CUTTING').toUpperCase() as ProductionStageResponse['stage'],
		inputQty: numberValue(row.inputQty ?? row.input_qty),
		outputQty: numberValue(row.outputQty ?? row.output_qty),
		rejectQty: numberValue(row.rejectQty ?? row.reject_qty),
		assignedTo: row.assignedTo ?? row.assigned_to ?? null,
		notes: row.notes ?? null,
		createdAt: row.createdAt ?? row.created_at ?? '',
	};
};

const normalizeDelivery = (value: DeliveryResponse): DeliveryResponse => {
	const row = value as DeliveryResponse & Record<string, any>;
	return {
		id: numberValue(row.id),
		deliveryNo: row.deliveryNo ?? row.delivery_no ?? row.deliveryNumber ?? '',
		salesOrderId: numberValue(
			row.salesOrderId ?? row.sales_order_id ?? row.salesOrder?.id ?? row.sales_order?.id,
		),
		salesOrderNo:
			row.salesOrderNo ??
			row.sales_order_no ??
			row.salesOrder?.orderNo ??
			row.salesOrder?.order_no ??
			row.sales_order?.orderNo ??
			row.sales_order?.order_no ??
			'',
		invoiceId:
			row.invoiceId === null || row.invoice_id === null
				? null
				: numberValue(row.invoiceId ?? row.invoice_id ?? row.invoice?.id),
		invoiceNo:
			row.invoiceNo ??
			row.invoice_no ??
			row.invoice?.invoiceNo ??
			row.invoice?.invoice_no ??
			null,
		dispatchDate: row.dispatchDate ?? row.dispatch_date ?? null,
		status: String(row.status || 'PENDING').toUpperCase() as DeliveryResponse['status'],
		courierName: row.courierName ?? row.courier_name ?? null,
		courierReference: row.courierReference ?? row.courier_reference ?? null,
		notes: row.notes ?? null,
		createdAt: row.createdAt ?? row.created_at ?? '',
	};
};

export type SalesOrderResponse = {
	id: number;
	orderNo: string;
	orderType: 'READY_MADE' | 'SEW_AND_SELL';
	customerId: number;
	status: string;
	createdAt: string;
};

// --- Sew and Sell Orders ---

export type SewAndSellOrderPayload = {
	customerId: number;
	productId: number;
	measurementId: number;
	qty: number;
	unitPrice: number;
	discount?: number;
	advancePayment?: number;
	expectedDate?: string;
	fabricId?: number;
	liningId?: number;
	buttonId?: number;
	designOptions?: string;
	tailorNotes?: string;
	notes?: string;
};

export const createSewAndSellOrderApi = async (
	payload: SewAndSellOrderPayload,
): Promise<SalesOrderResponse> => {
	const response = await api.post('/sew-and-sell-orders', payload);
	return response.data.data;
};

export const confirmSewAndSellOrderApi = async (id: number): Promise<SalesOrderResponse> => {
	const response = await api.put(`/sew-and-sell-orders/${id}/confirm`);
	return response.data.data;
};

// --- Work Orders ---

export type WorkOrderPayload = {
	salesOrderId: number;
	garmentType?: string;
	plannedQty: number;
	assignedTeam?: string;
	dueDate?: string;
	notes?: string;
};

export type WorkOrderResponse = {
	id: number;
	woNo: string;
	salesOrderId: number;
	salesOrderNo: string;
	garmentType: string | null;
	plannedQty: number;
	completedQty: number;
	assignedTeam: string | null;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	dueDate: string | null;
	notes: string | null;
	createdAt: string;
};

export const createWorkOrderApi = async (payload: WorkOrderPayload): Promise<WorkOrderResponse> => {
	const response = await api.post('/work-orders', payload);
	return response.data.data;
};

export const getWorkOrdersApi = async (): Promise<WorkOrderResponse[]> => {
	const response = await api.get('/work-orders');
	return toApiList<WorkOrderResponse>(response.data).map(normalizeWorkOrder);
};

export const getWorkOrderByIdApi = async (id: number): Promise<WorkOrderResponse> => {
	const response = await api.get(`/work-orders/${id}`);
	return normalizeWorkOrder(getData(response.data) as WorkOrderResponse);
};

// --- Production Stages ---

export type ProductionStagePayload = {
	workOrderId: number;
	stage: 'CUTTING' | 'SEWING' | 'FITTING' | 'ALTERATION' | 'FINISHING' | 'QC' | 'PACKING';
	inputQty: number;
	outputQty: number;
	rejectQty: number;
	assignedTo?: string;
	notes?: string;
};

export type ProductionStageResponse = {
	id: number;
	workOrderId: number;
	stage: ProductionStagePayload['stage'];
	inputQty: number;
	outputQty: number;
	rejectQty: number;
	assignedTo: string | null;
	notes: string | null;
	createdAt: string;
};

export const recordProductionStageApi = async (
	payload: ProductionStagePayload,
): Promise<ProductionStageResponse> => {
	const response = await api.post('/production-stages', payload);
	return response.data.data;
};

export const getProductionStagesByWorkOrderApi = async (
	workOrderId: number,
): Promise<ProductionStageResponse[]> => {
	const response = await api.get(`/production-stages/work-order/${workOrderId}`);
	return toApiList<ProductionStageResponse>(response.data).map(normalizeProductionStage);
};

// --- Quality Checks ---

export type QualityCheckPayload = {
	workOrderId: number;
	stage: ProductionStagePayload['stage'];
	defectType?: string;
	checkedQty: number;
	passedQty?: number;
	rejectedQty?: number;
	decision: 'PASS' | 'REWORK' | 'REJECT';
	checkedBy?: string;
	notes?: string;
};

export type QualityCheckResponse = {
	id: number;
	workOrderId: number;
	stage: ProductionStagePayload['stage'];
	defectType: string | null;
	checkedQty: number;
	passedQty: number | null;
	rejectedQty: number | null;
	decision: QualityCheckPayload['decision'];
	checkedBy: string | null;
	checkedAt: string;
	notes: string | null;
	createdAt: string;
};

export const recordQualityCheckApi = async (
	payload: QualityCheckPayload,
): Promise<QualityCheckResponse> => {
	const response = await api.post('/quality-checks', payload);
	return response.data.data;
};

export const getQualityChecksByWorkOrderApi = async (
	workOrderId: number,
): Promise<QualityCheckResponse[]> => {
	const response = await api.get(`/quality-checks/work-order/${workOrderId}`);
	return response.data.data;
};

// --- Deliveries ---

export type DeliveryPayload = {
	salesOrderId: number;
	invoiceId?: number;
	dispatchDate?: string;
	courierName?: string;
	courierReference?: string;
	notes?: string;
};

export type DeliveryResponse = {
	id: number;
	deliveryNo: string;
	salesOrderId: number;
	salesOrderNo: string;
	invoiceId: number | null;
	invoiceNo: string | null;
	dispatchDate: string | null;
	status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED';
	courierName: string | null;
	courierReference: string | null;
	notes: string | null;
	createdAt: string;
};

export const createDeliveryApi = async (payload: DeliveryPayload): Promise<DeliveryResponse> => {
	const response = await api.post('/deliveries', payload);
	return normalizeDelivery(getData(response.data) as DeliveryResponse);
};

export const getDeliveriesBySalesOrderApi = async (
	salesOrderId: number,
): Promise<DeliveryResponse[]> => {
	const response = await api.get(`/deliveries/sales-order/${salesOrderId}`);
	return toApiList<DeliveryResponse>(response.data).map(normalizeDelivery);
};

export const confirmDeliveryDispatchApi = async (id: number): Promise<DeliveryResponse> => {
	const response = await api.put(`/deliveries/${id}/dispatch`);
	return normalizeDelivery(getData(response.data) as DeliveryResponse);
};

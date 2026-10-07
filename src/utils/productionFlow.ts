import {
	ProductionStagePayload,
	ProductionStageResponse,
	WorkOrderResponse,
} from '../api/production.api';

export type ProductionStageName = ProductionStagePayload['stage'];

export const PRODUCTION_STAGES: ProductionStageName[] = [
	'CUTTING',
	'SEWING',
	'FITTING',
	'ALTERATION',
	'FINISHING',
	'QC',
	'PACKING',
];

const getStageSortTime = (stage: ProductionStageResponse) => {
	const time = Date.parse(stage.createdAt || '');
	return Number.isFinite(time) ? time : 0;
};

export const getLatestProductionStageRecord = (
	stages: ProductionStageResponse[] = [],
): ProductionStageResponse | null =>
	stages.reduce<ProductionStageResponse | null>((latest, stage) => {
		if (!latest) return stage;
		const latestTime = getStageSortTime(latest);
		const stageTime = getStageSortTime(stage);
		if (stageTime !== latestTime) return stageTime > latestTime ? stage : latest;
		return stage.id > latest.id ? stage : latest;
	}, null);

export const getLatestProductionStage = (
	stages: ProductionStageResponse[] = [],
): ProductionStageName | null => getLatestProductionStageRecord(stages)?.stage ?? null;

export const getNextProductionStage = (
	stages: ProductionStageResponse[] = [],
): ProductionStageName => {
	const latestStage = getLatestProductionStage(stages);
	if (!latestStage) return PRODUCTION_STAGES[0];
	const stageIndex = PRODUCTION_STAGES.indexOf(latestStage);
	return PRODUCTION_STAGES[Math.min(stageIndex + 1, PRODUCTION_STAGES.length - 1)];
};

export const isQcReadyStage = (stage?: ProductionStageName | null) =>
	Boolean(stage && PRODUCTION_STAGES.indexOf(stage) >= PRODUCTION_STAGES.indexOf('QC'));

export const isDeliveryReadyStage = (stage?: ProductionStageName | null) => stage === 'PACKING';

export const isWorkOrderDeliveryReady = (
	workOrder?: Pick<WorkOrderResponse, 'status'> | null,
	stage?: ProductionStageName | null,
) => workOrder?.status === 'COMPLETED' || isDeliveryReadyStage(stage);

export const isSalesOrderDeliveryReady = (status?: string | null, workOrderReady = false) =>
	workOrderReady ||
	['READY_FOR_DISPATCH', 'COMPLETED'].includes(String(status || '').toUpperCase());

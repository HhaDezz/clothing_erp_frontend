import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type DefectiveReason = {
	id: number;
	code: string;
	label: string;
	active: boolean;
};

export type DefectiveReasonPayload = {
	code: string;
	label: string;
	active?: boolean;
};

const BASE = '/defective-reasons';

export const getDefectiveReasonsApi = () =>
	api.get<ApiResponse<DefectiveReason[]>>(BASE).then((r) => r.data.data);

export const createDefectiveReasonApi = (payload: DefectiveReasonPayload) =>
	api.post<ApiResponse<DefectiveReason>>(BASE, payload).then((r) => r.data.data);

export const updateDefectiveReasonApi = (id: number, payload: DefectiveReasonPayload) =>
	api.put<ApiResponse<DefectiveReason>>(`${BASE}/${id}`, payload).then((r) => r.data.data);

export const deleteDefectiveReasonApi = (id: number) =>
	api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data);

import api from '../lib/axios';

export type MeasurementType = {
	id: number;
	code: string;
	name: string;
	garmentCategory?: string;
	description?: string;
	defaultUnit: 'INCHES' | 'CM';
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
};

export type MeasurementTypePayload = {
	code: string;
	name: string;
	garmentCategory?: string;
	description?: string;
	defaultUnit: 'INCHES' | 'CM';
};

export type BodyMeasurement = {
	id: number;
	code: string;
	name: string;
	bodyArea?: 'UPPER_BODY' | 'LOWER_BODY' | 'FULL_BODY' | 'OTHER';
	unit: 'INCHES' | 'CM';
	inputType: 'NUMBER' | 'TEXT';
	minValue?: number;
	maxValue?: number;
	displayOrder: number;
	instruction?: string;
	status: 'ACTIVE' | 'INACTIVE';
	createdAt: string;
	updatedAt: string;
};

export type BodyMeasurementPayload = {
	code: string;
	name: string;
	bodyArea?: 'UPPER_BODY' | 'LOWER_BODY' | 'FULL_BODY' | 'OTHER';
	unit: 'INCHES' | 'CM';
	inputType: 'NUMBER' | 'TEXT';
	minValue?: number;
	maxValue?: number;
	displayOrder?: number;
	instruction?: string;
};

export type MeasurementTypeField = {
	id: number;
	measurementTypeId: number;
	bodyMeasurementId: number;
	isRequired: boolean;
	displayOrder: number;
	defaultUnit?: 'INCHES' | 'CM';
	tolerance?: number;
	notes?: string;
	bodyMeasurement?: BodyMeasurement; // This might be nested depending on the backend, assuming it is for display
};

export type MeasurementTypeFieldPayload = {
	bodyMeasurementId: number;
	isRequired?: boolean;
	displayOrder?: number;
	defaultUnit?: 'INCHES' | 'CM';
	tolerance?: number;
	notes?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// --- Measurement Types Endpoints ---

export const getMeasurementTypesApi = () =>
	api.get<ApiResponse<MeasurementType[]>>('/measurement-types').then((res) => res.data.data);

export const getMeasurementTypeByIdApi = (id: string | number) =>
	api.get<ApiResponse<MeasurementType>>(`/measurement-types/${id}`).then((res) => res.data.data);

export const createMeasurementTypeApi = (payload: MeasurementTypePayload) =>
	api.post<ApiResponse<MeasurementType>>('/measurement-types', payload).then((res) => res.data);

export const updateMeasurementTypeApi = (id: string | number, payload: MeasurementTypePayload) =>
	api.put<ApiResponse<MeasurementType>>(`/measurement-types/${id}`, payload).then((res) => res.data);

export const deleteMeasurementTypeApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/measurement-types/${id}`).then((res) => res.data);

// --- Measurement Type Fields Endpoints ---

export const getMeasurementTypeFieldsApi = (measurementTypeId: string | number) =>
	api.get<ApiResponse<MeasurementTypeField[]>>(`/measurement-types/${measurementTypeId}/fields`).then((res) => res.data.data);

export const addMeasurementTypeFieldApi = (measurementTypeId: string | number, payload: MeasurementTypeFieldPayload) =>
	api.post<ApiResponse<MeasurementTypeField>>(`/measurement-types/${measurementTypeId}/fields`, payload).then((res) => res.data);

export const updateMeasurementTypeFieldApi = (measurementTypeId: string | number, fieldId: string | number, payload: MeasurementTypeFieldPayload) =>
	api.put<ApiResponse<MeasurementTypeField>>(`/measurement-types/${measurementTypeId}/fields/${fieldId}`, payload).then((res) => res.data);

export const removeMeasurementTypeFieldApi = (measurementTypeId: string | number, fieldId: string | number) =>
	api.delete<ApiResponse<void>>(`/measurement-types/${measurementTypeId}/fields/${fieldId}`).then((res) => res.data);

// --- Body Measurements Endpoints ---

export const getBodyMeasurementsApi = () =>
	api.get<ApiResponse<BodyMeasurement[]>>('/body-measurements').then((res) => res.data.data);

export const getBodyMeasurementByIdApi = (id: string | number) =>
	api.get<ApiResponse<BodyMeasurement>>(`/body-measurements/${id}`).then((res) => res.data.data);

export const createBodyMeasurementApi = (payload: BodyMeasurementPayload) =>
	api.post<ApiResponse<BodyMeasurement>>('/body-measurements', payload).then((res) => res.data);

export const updateBodyMeasurementApi = (id: string | number, payload: BodyMeasurementPayload) =>
	api.put<ApiResponse<BodyMeasurement>>(`/body-measurements/${id}`, payload).then((res) => res.data);

export const deleteBodyMeasurementApi = (id: string | number) =>
	api.delete<ApiResponse<void>>(`/body-measurements/${id}`).then((res) => res.data);

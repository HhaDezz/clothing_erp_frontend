import api from '../lib/axios';

export type Designation = {
	id: number;
	name: string;
	code: string;
	description: string | null;
	created_at?: string;
};

export type DesignationPayload = {
	name: string;
	code: string;
	description?: string;
	company_id?: string;
};

type DesignationsResponse = {
	status: string;
	message: string;
	data: Designation[];
};

export const getDesignationsApi = () =>
	api.get<DesignationsResponse>('/designations').then((res) => res.data.data);

export const createDesignationApi = (payload: DesignationPayload) =>
	api.post('/designations', payload).then((res) => res.data);

export const updateDesignationApi = (id: string | number, payload: DesignationPayload) =>
	api.put(`/designations/${id}`, payload).then((res) => res.data);

export const deleteDesignationApi = (id: string | number) =>
	api.delete(`/designations/${id}`).then((res) => res.data);

import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// A Showroom is a Warehouse row of type SHOWROOM on the backend, but gets
// its own dedicated CRUD page/permissions here — see ShowroomController.
export type Showroom = {
	id: number;
	name: string;
	address: string | null;
	contactPerson: string | null;
};

export type ShowroomPayload = {
	name: string;
	address?: string;
	contactPerson?: string;
};

const BASE = '/showrooms';

export const getShowroomsApi = () =>
	api.get<ApiResponse<Showroom[]>>(BASE).then((r) => r.data.data);

export const getShowroomByIdApi = (id: number) =>
	api.get<ApiResponse<Showroom>>(`${BASE}/${id}`).then((r) => r.data.data);

export const createShowroomApi = (payload: ShowroomPayload) =>
	api.post<ApiResponse<Showroom>>(BASE, payload).then((r) => r.data.data);

export const updateShowroomApi = (id: number, payload: ShowroomPayload) =>
	api.put<ApiResponse<Showroom>>(`${BASE}/${id}`, payload).then((r) => r.data.data);

export const deleteShowroomApi = (id: number) =>
	api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data);

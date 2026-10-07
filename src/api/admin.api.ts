import api from '../lib/axios';

export interface AdminEntity {
	id: number | string;
	name: string;
	code?: string;
	[key: string]: unknown;
}

type CollectionResponse<T> = {
	status: string;
	message: string;
	data: T[];
};

type SingleResponse<T> = {
	status: string;
	message: string;
	data: T;
};

/**
 * Factory that creates typed CRUD API functions for a given endpoint.
 * Usage: const zonesApi = createAdminCrudApi<IZone>('zones');
 */
export const createAdminCrudApi = <T extends AdminEntity>(endpoint: string) => ({
	getAll: (): Promise<T[]> =>
		api
			.get<CollectionResponse<T>>(`/${endpoint}`)
			.then((res) => res.data.data ?? []),

	create: (payload: Omit<T, 'id'>): Promise<T> =>
		api
			.post<SingleResponse<T>>(`/${endpoint}`, payload)
			.then((res) => res.data.data),

	update: (id: number | string, payload: Partial<Omit<T, 'id'>>): Promise<T> =>
		api
			.put<SingleResponse<T>>(`/${endpoint}/${id}`, payload)
			.then((res) => res.data.data),

	remove: (id: number | string): Promise<void> =>
		api.delete(`/${endpoint}/${id}`).then(() => undefined),
});

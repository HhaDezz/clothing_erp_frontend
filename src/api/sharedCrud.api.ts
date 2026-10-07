import api from '../lib/axios';

type CollectionResponse<T> = {
	status?: string;
	message?: string;
	data?: T[];
};

export const getCrudCollectionApi = <T>(endpoint: string) =>
	api.get<CollectionResponse<T>>(endpoint).then((res) => {
		const payload = res.data.data;
		if (Array.isArray(payload)) return payload;
		if (payload && typeof payload === 'object' && 'data' in (payload as any) && Array.isArray((payload as any).data)) {
			return (payload as any).data;
		}
		return [];
	});

export const createCrudItemApi = (endpoint: string, payload: Record<string, any>) =>
	api.post(endpoint, payload).then((res) => res.data);

export const updateCrudItemApi = (
	endpoint: string,
	id: string | number,
	payload: Record<string, any>,
) => api.put(`${endpoint}/${id}`, payload).then((res) => res.data);

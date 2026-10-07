import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// Showroom-scoped counterpart of UserWarehouseAccess — "need separate
// showroom allocation (users)". Same underlying user_has_warehouses
// relationship as warehouse access, but its own dedicated master-data page
// and its own permission pair; editing one never disturbs the other (see
// UserService#updateShowroomAccess on the backend). A user with no showroom
// assigned here is not showroom-restricted and sees every showroom's
// requests (matches "super admin can see everything", extended to anyone
// with no assignment at all).
export type UserShowroomAccess = {
	userId: number;
	userName: string;
	userEmail: string;
	showroomIds: number[];
	showroomNames: string[];
};

export type UserShowroomAccessPayload = {
	showroomIds: number[];
};

export const getUserShowroomAccessListApi = () =>
	api.get<ApiResponse<UserShowroomAccess[]>>('/users/showroom-access').then((r) => r.data.data);

export const updateUserShowroomAccessApi = (userId: number, payload: UserShowroomAccessPayload) =>
	api.put<ApiResponse<UserShowroomAccess>>(`/users/${userId}/showroom-access`, payload).then((r) => r.data.data);

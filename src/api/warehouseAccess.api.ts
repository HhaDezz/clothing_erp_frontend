import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// A user's warehouse-access master data row — which specific warehouse(s)
// they're enabled for. Distinct from Departments (see UserFormModal); drives
// which import shipments a user sees (only relevant warehouse's shipments —
// see ImportShipmentService#getAllShipments on the backend). A user with no
// warehouses assigned is not warehouse-restricted and sees everything.
export type UserWarehouseAccess = {
	userId: number;
	userName: string;
	userEmail: string;
	warehouseIds: number[];
	warehouseNames: string[];
};

export type UserWarehouseAccessPayload = {
	warehouseIds: number[];
};

export const getUserWarehouseAccessListApi = () =>
	api.get<ApiResponse<UserWarehouseAccess[]>>('/users/warehouse-access').then((r) => r.data.data);

export const updateUserWarehouseAccessApi = (userId: number, payload: UserWarehouseAccessPayload) =>
	api.put<ApiResponse<UserWarehouseAccess>>(`/users/${userId}/warehouse-access`, payload).then((r) => r.data.data);

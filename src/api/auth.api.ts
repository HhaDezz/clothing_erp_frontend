import api from '../lib/axios';

export type LoginPayload = {
	email: string;
	password: string;
};

export type AuthResponse = {
	token: string;
	username: string;
	role: string;
	permissions: string[];
	departments: string[];
};

// Shape of GET /users/me — the same role/permissions/departments a login
// returns, minus the token (the existing one in localStorage stays valid;
// this call only refreshes what the user is currently allowed to see).
export type CurrentUserResponse = {
	id?: number | string;
	username?: string;
	name?: string;
	email?: string;
	role: string;
	permissions: string[];
	departments: string[];
	// Which specific warehouse(s) this user is enabled for — see the "Assign
	// Warehouses" master-data page. Empty/undefined means not
	// warehouse-restricted (sees/can act on everything).
	warehouseIds?: number[];
	warehouseNames?: string[];
};

export type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const loginApi = (payload: LoginPayload) =>
	api.post<ApiResponse<AuthResponse>>('/auth/login', payload).then((res) => res.data);

// Re-fetches the current user's role/permissions/departments fresh from the
// server. Used to keep an already-open tab in sync when an admin changes a
// user's permissions — the JWT stays valid either way, but the sidebar's
// copy of "what am I allowed to see" was previously only ever taken from
// the one-time login response.
export const getCurrentUserApi = () =>
	api.get<ApiResponse<CurrentUserResponse>>('/users/me').then((res) => res.data);

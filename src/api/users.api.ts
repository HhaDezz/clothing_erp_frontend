import api from '../lib/axios';
import { Department } from './notifications.api';

export type UserRoleRef = {
	id?: string | number;
	role_id?: string | number;
	roleId?: string | number;
	name?: string;
	roleName?: string;
	role_name?: string;
	role?: {
		id?: string | number;
		name?: string;
		roleName?: string;
		role_name?: string;
	};
};

export type User = {
	id: string | number;
	name: string;
	username?: string;
	email?: string;
	phone?: string;
	address?: string;
	users_has_roles?: Array<string | number | UserRoleRef>;
	usersHasRoles?: Array<string | number | UserRoleRef>;
	user_roles?: Array<string | number | UserRoleRef>;
	userRoles?: Array<string | number | UserRoleRef>;
	assignedRoles?: Array<string | number | UserRoleRef>;
	roles?: Array<string | number | UserRoleRef>;
	departments?: Department[];
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
};

export type UserPayload = {
	name: string;
	username?: string;
	email: string;
	phone?: string;
	address?: string;
	password?: string;
	users_has_roles: Array<string | number>;
	departments?: Department[];
};

type ApiResponse<T = unknown> = {
	success: boolean;
	message: string;
	data: T;
};

const getApiList = <T>(response: unknown, listKeys: string[] = []): T[] => {
	let value = response;

	for (let depth = 0; depth < 5; depth += 1) {
		if (Array.isArray(value)) return value as T[];
		if (!value || typeof value !== 'object') return [];

		const row = value as Record<string, unknown>;
		for (const key of [...listKeys, 'data', 'content', 'items', 'rows', 'records', 'result']) {
			if (Array.isArray(row[key])) return row[key] as T[];
		}

		const nestedListKey = listKeys.find((key) => row[key] && typeof row[key] === 'object');
		if (nestedListKey) {
			value = row[nestedListKey];
			continue;
		}

		if ('data' in row) {
			value = row.data;
			continue;
		}

		return [];
	}

	return [];
};

const extractApiData = (response: unknown): unknown =>
	response && typeof response === 'object' && 'data' in response
		? (response as { data?: unknown }).data
		: response;

const optionalString = (value: unknown) =>
	typeof value === 'string' && value.trim() ? value.trim() : undefined;

const optionalId = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) return value.trim();
	return undefined;
};

const optionalNestedString = (source: unknown, key: string) =>
	source && typeof source === 'object'
		? optionalString((source as Record<string, unknown>)[key])
		: undefined;

const getUserRoleList = (row: Record<string, unknown>): User['users_has_roles'] | undefined => {
	const rawRoles =
		row.users_has_roles ??
		row.usersHasRoles ??
		row.user_roles ??
		row.userRoles ??
		row.assignedRoles ??
		row.assigned_roles ??
		row.roles ??
		row.roleNames ??
		row.role_names ??
		row.authorities;

	if (Array.isArray(rawRoles)) return rawRoles as User['users_has_roles'];

	const singleRole = row.role ?? row.userRole ?? row.assignedRole;
	if (singleRole) return [singleRole as string | number | UserRoleRef];

	return undefined;
};

const getUserDepartments = (row: Record<string, unknown>): Department[] | undefined => {
	const raw = row.departments ?? row.department;
	if (Array.isArray(raw)) return raw.filter((d): d is Department => typeof d === 'string');
	if (typeof raw === 'string') return [raw as Department];
	return undefined;
};

const normalizeUser = (user: unknown): User | null => {
	if (!user || typeof user !== 'object') return null;

	const row = user as Record<string, unknown>;
	const id =
		optionalId(row.id ?? row.userId ?? row.user_id) ??
		optionalString(row.email) ??
		optionalString(row.username) ??
		optionalString(row.name);
	const name =
		optionalString(row.name) ??
		optionalString(row.userName) ??
		optionalString(row.user_name) ??
		optionalString(row.username) ??
		optionalString(row.fullName) ??
		optionalString(row.full_name) ??
		optionalString(row.email) ??
		'Unnamed user';
	const email =
		optionalString(row.email) ?? optionalString(row.emailAddress ?? row.email_address);
	const profile = row.profile ?? row.userProfile ?? row.user_profile;
	const address =
		optionalString(row.address) ??
		optionalString(row.userAddress) ??
		optionalString(row.user_address) ??
		optionalString(row.addressLine) ??
		optionalString(row.address_line) ??
		optionalNestedString(profile, 'address') ??
		optionalNestedString(profile, 'addressLine') ??
		optionalNestedString(profile, 'address_line');
	const phone =
		optionalString(row.phone) ??
		optionalString(row.phoneNumber) ??
		optionalString(row.phone_number) ??
		optionalNestedString(profile, 'phone') ??
		optionalNestedString(profile, 'phoneNumber') ??
		optionalNestedString(profile, 'phone_number');
	const assignedRoles = getUserRoleList(row);
	const departments = getUserDepartments(row);

	if (id === undefined || !name) return null;

	return {
		id,
		name,
		username:
			optionalString(row.username) ??
			optionalString(row.userName) ??
			optionalString(row.user_name),
		email,
		phone,
		address,
		users_has_roles: assignedRoles,
		usersHasRoles: Array.isArray(row.usersHasRoles)
			? (row.usersHasRoles as User['usersHasRoles'])
			: undefined,
		user_roles: Array.isArray(row.user_roles)
			? (row.user_roles as User['user_roles'])
			: undefined,
		userRoles: Array.isArray(row.userRoles) ? (row.userRoles as User['userRoles']) : undefined,
		assignedRoles: Array.isArray(row.assignedRoles)
			? (row.assignedRoles as User['assignedRoles'])
			: undefined,
		roles: Array.isArray(row.roles) ? (row.roles as User['roles']) : assignedRoles,
		departments,
		created_at: optionalString(row.created_at),
		createdAt: optionalString(row.createdAt) ?? optionalString(row.created_at),
		updated_at: optionalString(row.updated_at),
		updatedAt: optionalString(row.updatedAt) ?? optionalString(row.updated_at),
	};
};

export const getUsersApi = () =>
	api.get<ApiResponse>('/users').then((res) =>
		getApiList<unknown>(res.data, ['users'])
			.map(normalizeUser)
			.filter((user): user is User => Boolean(user)),
	);

export const getUserByIdApi = (id: string | number) =>
	api.get<ApiResponse>(`/users/${id}`).then((res) => normalizeUser(extractApiData(res.data)));

export const createUserApi = (payload: UserPayload) =>
	api.post<ApiResponse<User>>('/users', payload).then((res) => res.data);

export const updateUserApi = (id: string | number, payload: UserPayload) =>
	api.put<ApiResponse<User>>(`/users/${id}`, payload).then((res) => res.data);

export const deleteUserApi = (id: string | number) =>
	api.delete<ApiResponse<string>>(`/users/${id}`).then((res) => res.data);

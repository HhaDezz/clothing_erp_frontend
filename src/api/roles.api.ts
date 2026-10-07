import api from '../lib/axios';
import { ALL_PERMISSIONS_ARRAY } from '../constants/permissions';

export type Role = {
	id: string | number;
	name: string;
	roleName?: string;
	description?: string | null;
	permissions?: string[];
	createdAt?: string;
	updatedAt?: string;
};

export type RolePayload = {
	name: string;
	roleName: string;
	description?: string;
	permissions: string[];
};

export type Permission = {
	id: string | number;
	name: string;
	label: string;
	group: string;
	category: string;
	subCategory: string;
	description?: string | null;
};

export type PermissionPayload = {
	name: string;
	label: string;
	group: string;
	company_id?: string;
};

type ApiResponse<T = unknown> = {
	success: boolean;
	message: string;
	data: T;
};

const extractApiData = (response: unknown): unknown =>
	response && typeof response === 'object' && 'data' in response
		? (response as { data?: unknown }).data
		: response;

const getApiList = <T>(response: unknown, listKeys: string[] = []): T[] => {
	let value = response;

	for (let depth = 0; depth < 5; depth += 1) {
		if (Array.isArray(value)) return value as T[];
		if (!value || typeof value !== 'object') return [];

		const row = value as Record<string, unknown>;
		for (const key of [...listKeys, 'data', 'content', 'items', 'rows', 'records', 'result']) {
			if (Array.isArray(row[key])) return row[key] as T[];
		}

		if ('data' in row) {
			value = row.data;
			continue;
		}

		return [];
	}

	return [];
};

const optionalString = (value: unknown) =>
	typeof value === 'string' && value.trim() ? value.trim() : undefined;

const getPermissionMetaParts = (permissionName: string) => {
	const parts = permissionName.split('-');
	const group = parts[0] || 'custom';
	const category = parts[1] || group;
	const subCategory = parts.slice(2).join('-') || category;

	return {
		group,
		category,
		subCategory,
	};
};

export const getPermissionMeta = (permissionName: string) => {
	const { group, category, subCategory } = getPermissionMetaParts(permissionName);
	const label = permissionName
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());

	return {
		label,
		group,
		category,
		subCategory,
	};
};

const normalizePermissionName = (permission: unknown): string | null => {
	if (typeof permission === 'string') return permission;
	if (!permission || typeof permission !== 'object') return null;

	const row = permission as Record<string, unknown>;
	const nestedPermission =
		row.permission && typeof row.permission === 'object'
			? (row.permission as Record<string, unknown>)
			: undefined;

	return (
		optionalString(row.name) ??
		optionalString(row.permissionName) ??
		optionalString(row.permission_name) ??
		optionalString(row.code) ??
		optionalString(row.authority) ??
		optionalString(nestedPermission?.name) ??
		optionalString(nestedPermission?.permissionName) ??
		optionalString(nestedPermission?.permission_name) ??
		null
	);
};

const getRolePermissions = (role: Record<string, unknown>) => {
	const rawPermissions =
		role.permissions ??
		role.permissionNames ??
		role.permission_names ??
		role.authorities ??
		role.rolePermissions ??
		role.role_permissions ??
		[];

	if (!Array.isArray(rawPermissions)) return [];

	return rawPermissions
		.map(normalizePermissionName)
		.filter((permission): permission is string => Boolean(permission));
};

const normalizeRole = (role: unknown): Role | null => {
	if (!role || typeof role !== 'object') return null;

	const row = role as Record<string, unknown>;
	const id = row.id ?? row.roleId ?? row.role_id ?? row.name;
	const name =
		optionalString(row.name) ??
		optionalString(row.roleName) ??
		optionalString(row.role_name) ??
		optionalString(row.displayName);

	if (id === undefined || !name) return null;

	return {
		id: id as string | number,
		name,
		roleName: optionalString(row.roleName) ?? optionalString(row.role_name),
		description:
			optionalString(row.description) ??
			optionalString(row.roleDescription) ??
			optionalString(row.role_description) ??
			null,
		permissions: getRolePermissions(row),
		createdAt: optionalString(row.createdAt) ?? optionalString(row.created_at),
		updatedAt: optionalString(row.updatedAt) ?? optionalString(row.updated_at),
	};
};

const normalizePermission = (permission: unknown): Permission | null => {
	const permissionName = normalizePermissionName(permission);
	if (!permissionName) return null;

	const row =
		permission && typeof permission === 'object' ? (permission as Record<string, unknown>) : {};
	const meta = getPermissionMeta(permissionName);

	return {
		id: (row.id ?? permissionName) as string | number,
		name: permissionName,
		label: optionalString(row.label) ?? meta.label,
		group: optionalString(row.group) ?? meta.group,
		category: optionalString(row.category) ?? meta.category,
		subCategory:
			optionalString(row.subCategory) ?? optionalString(row.sub_category) ?? meta.subCategory,
		description: optionalString(row.description) ?? null,
	};
};

const staticPermissions = ALL_PERMISSIONS_ARRAY.map((permission) =>
	normalizePermission(permission),
).filter((permission): permission is Permission => Boolean(permission));

export const getRolesApi = () =>
	api.get<ApiResponse>('/roles').then((res) =>
		getApiList<unknown>(res.data, ['roles'])
			.map(normalizeRole)
			.filter((role): role is Role => Boolean(role)),
	);

export const getRoleByIdApi = (id: string | number) =>
	api.get<ApiResponse>(`/roles/${id}`).then((res) => normalizeRole(extractApiData(res.data)));

export const createRoleApi = (payload: RolePayload) =>
	api.post<ApiResponse<Role>>('/roles', payload).then((res) => res.data);

export const updateRoleApi = (id: string | number, payload: RolePayload) =>
	api.put<ApiResponse<Role>>(`/roles/${id}`, payload).then((res) => res.data);

export const deleteRoleApi = (id: string | number) =>
	api.delete<ApiResponse<string>>(`/roles/${id}`).then((res) => res.data);

export const getPermissionsApi = () =>
	api
		.get<ApiResponse>('/permissions')
		.then((res) => {
			const permissions = getApiList<unknown>(res.data, ['permissions'])
				.map(normalizePermission)
				.filter((permission): permission is Permission => Boolean(permission));

			return permissions.length ? permissions : staticPermissions;
		})
		.catch(() => staticPermissions);

export const createPermissionApi = (payload: PermissionPayload) =>
	api.post<ApiResponse<Permission>>('/permissions', payload).then((res) => res.data);

export const updatePermissionApi = (id: string | number, payload: PermissionPayload) =>
	api.put<ApiResponse<Permission>>(`/permissions/${id}`, payload).then((res) => res.data);

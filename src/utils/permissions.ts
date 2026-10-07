import { PermissionRequirement } from '../constants/permissions';

export interface StoredAuthUser {
	id?: number | string;
	username?: string;
	name?: string;
	email?: string;
	role?: string;
	user_type?: string;
	permissions?: string[];
	departments?: string[];
	// Which specific warehouse(s) this user is enabled for — see
	// getUserWarehouseIds below.
	warehouseIds?: number[];
	warehouseNames?: string[];
}

const toPermissionList = (value: PermissionRequirement | undefined) =>
	Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

export const getStoredAuthUser = (): StoredAuthUser | null => {
	try {
		const rawUser = localStorage.getItem('user');
		if (!rawUser) return null;
		return JSON.parse(rawUser) as StoredAuthUser;
	} catch (error) {
		console.error('Failed to parse auth user', error);
		return null;
	}
};

export const getUserPermissions = (authUser?: StoredAuthUser | null) => {
	const user = authUser ?? getStoredAuthUser();
	return Array.isArray(user?.permissions) ? user.permissions.filter(Boolean) : [];
};

export const isSuperAdmin = (authUser?: StoredAuthUser | null) =>
	String((authUser ?? getStoredAuthUser())?.role || '')
		.trim()
		.toUpperCase() === 'SUPER_ADMIN';

// Which specific warehouse(s) the current user is enabled for — e.g. used to
// gate which warehouse tab a Storekeeper can switch to on Receive at Bay 1.
// SUPER_ADMIN is handled separately via isSuperAdmin (they can switch to
// every warehouse regardless of this list).
export const getUserWarehouseIds = (authUser?: StoredAuthUser | null): number[] => {
	const user = authUser ?? getStoredAuthUser();
	return Array.isArray(user?.warehouseIds) ? user.warehouseIds.filter((id) => id != null) : [];
};

// A user may act on a given warehouse if they're SUPER_ADMIN, or if they
// have no warehouses assigned at all (unrestricted, matches the backend's
// own "no warehouse assigned = unrestricted" rule), or if that warehouse is
// one of their assigned ones.
export const canActOnWarehouse = (warehouseId: number | null | undefined, authUser?: StoredAuthUser | null) => {
	if (warehouseId == null) return false;
	if (isSuperAdmin(authUser)) return true;
	const myWarehouseIds = getUserWarehouseIds(authUser);
	if (myWarehouseIds.length === 0) return true;
	return myWarehouseIds.includes(warehouseId);
};

// Permissions that no role can be given — only a system user (SUPER_ADMIN)
// passes them, whatever is ticked on the Roles & Permissions screen. The
// backend enforces the same rule (AuditLogController), this just keeps the
// menu and page from showing something the API would refuse.
export const SYSTEM_ONLY_PERMISSIONS: string[] = ['reporting-audit_log-view'];

const grantablePermissions = (authUser?: StoredAuthUser | null) =>
	new Set(getUserPermissions(authUser).filter((p) => !SYSTEM_ONLY_PERMISSIONS.includes(p)));

export const hasPermission = (
	requirement?: PermissionRequirement,
	authUser?: StoredAuthUser | null,
) => {
	const requiredPermissions = toPermissionList(requirement);
	if (!requiredPermissions.length) return true;
	if (isSuperAdmin(authUser)) return true;

	const permissionSet = grantablePermissions(authUser);
	return requiredPermissions.some((permission) => permissionSet.has(permission));
};

export const hasAllPermissions = (
	requirement?: PermissionRequirement,
	authUser?: StoredAuthUser | null,
) => {
	const requiredPermissions = toPermissionList(requirement);
	if (!requiredPermissions.length) return true;
	if (isSuperAdmin(authUser)) return true;

	const permissionSet = grantablePermissions(authUser);
	return requiredPermissions.every((permission) => permissionSet.has(permission));
};

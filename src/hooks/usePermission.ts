import { useContext } from 'react';
import AuthContext from '../contexts/authContext';
import {
	canActOnWarehouse,
	getUserPermissions,
	getUserWarehouseIds,
	hasAllPermissions,
	hasPermission,
	isSuperAdmin,
} from '../utils/permissions';
import { PermissionRequirement } from '../constants/permissions';

export const usePermission = () => {
	const { authUser } = useContext(AuthContext);

	return {
		permissions: getUserPermissions(authUser),
		isSuperAdmin: isSuperAdmin(authUser),
		hasPermission: (requirement?: PermissionRequirement) =>
			hasPermission(requirement, authUser),
		hasAllPermissions: (requirement?: PermissionRequirement) =>
			hasAllPermissions(requirement, authUser),
		// Which specific warehouse(s) this user is enabled for — see the
		// "Assign Warehouses" master-data page. Empty means not
		// warehouse-restricted.
		warehouseIds: getUserWarehouseIds(authUser),
		// SUPER_ADMIN can act on every warehouse; a user with no warehouses
		// assigned is unrestricted too (matches the backend's own rule) —
		// otherwise only their own assigned warehouse(s).
		canActOnWarehouse: (warehouseId: number | null | undefined) => canActOnWarehouse(warehouseId, authUser),
	};
};

import { CrudOption } from './types';
import { createStoredOptions } from './helpers';

export const zoneOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'zones', value: 'code' });

export const regionOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'regions', value: 'code' });

export const territoryOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'territories', value: 'code' });

export const supervisorAreaOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'supervisor-areas', value: 'code' });

export const distributorAreaOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'distributor-areas', value: 'code' });

export const routeOptions = () =>
	createStoredOptions<{ name: string }>({ fileName: 'routes', value: 'name' });

export const branchOptions = () =>
	createStoredOptions<{ name: string }>({ fileName: 'branches', value: 'name' });

export const businessUnitOptions = () =>
	createStoredOptions<{ code: string }>({ fileName: 'business-units', value: 'code' });

export const designationOptions: CrudOption[] = [
	{ value: 'Executive', label: 'Executive' },
	{ value: 'Supervisor', label: 'Supervisor' },
];

export const roleOptions: CrudOption[] = [
	{ value: 'Admin', label: 'Admin' },
	{ value: 'Manager', label: 'Manager' },
	{ value: 'Sales Rep', label: 'Sales Rep' },
];

export const userTypeOptions: CrudOption[] = [
	{ value: 'web', label: 'web' },
	{ value: 'mobile', label: 'mobile' },
];

export const userOptions: CrudOption[] = [
	{ value: 'Nimal Perera', label: 'Nimal Perera' },
	{ value: 'Saman Silva', label: 'Saman Silva' },
];

export const statusOptions: CrudOption[] = [
	{ value: 'active', label: 'Active' },
	{ value: 'inactive', label: 'Inactive' },
];

export const currencyOptions: CrudOption[] = [
	{ value: 'LKR', label: 'LKR' },
	{ value: 'USD', label: 'USD' },
];

export const taxTypeOptions: CrudOption[] = [
	{ value: 'inclusive', label: 'Inclusive' },
	{ value: 'exclusive', label: 'Exclusive' },
];

export const countryOptions: CrudOption[] = [
	{ value: 'Sri Lanka', label: 'Sri Lanka' },
	{ value: 'India', label: 'India' },
	{ value: 'Bangladesh', label: 'Bangladesh' },
];

export const townOptions = () =>
	createStoredOptions<{ name: string }>({ fileName: 'towns', value: 'name' });

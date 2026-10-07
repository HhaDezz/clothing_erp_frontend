import { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import { PermissionRequirement } from '../../../constants/permissions';

export type CrudEntityId = string | number;
export type CrudMode = 'add' | 'edit' | 'view';
export type CrudFieldType = 'input' | 'textarea' | 'select';
export type CrudFormValue = string | string[];
export type CrudSubmitResult = void | Promise<void>;

export interface CrudOption {
	value: string;
	label: string;
}

export type CrudOptionSource = CrudOption[] | (() => CrudOption[]);

export interface CrudFormField<T> {
	name: keyof T | string;
	label: string;
	type: CrudFieldType;
	required?: boolean;
	placeholder?: string;
	colClassName?: string;
	options?: CrudOptionSource;
	multiple?: boolean;
	searchable?: boolean;
	disabled?: boolean;
	getValue?: (item: T) => CrudFormValue;
	getDefaultValue?: () => CrudFormValue;
}

export interface CrudFormValues {
	[key: string]: CrudFormValue;
}

export interface CrudFormErrors {
	[key: string]: string;
}

export interface CrudApiConfig<T extends object> {
	endpoint: string;
	queryKey: string;
	mapItem?: (item: Record<string, any>) => T;
	toCreatePayload?: (values: CrudFormValues) => Record<string, any>;
	toUpdatePayload?: (values: CrudFormValues, current: T) => Record<string, any>;
}

export interface CrudEntityPageConfig<T extends object & { id?: CrudEntityId }> {
	title: string;
	entityLabel: string;
	icon: string;
	fileName: string;
	initialItems?: T[];
	columns: DataTableColumn<T>[];
	fields: CrudFormField<T>[];
	createItem: (values: CrudFormValues, id: CrudEntityId) => T;
	updateItem: (current: T, values: CrudFormValues) => T;
	hideEdit?: boolean;
	customHeaderAction?: React.ReactNode;
	permissions?: {
		view?: PermissionRequirement;
		create?: PermissionRequirement;
		update?: PermissionRequirement;
		delete?: PermissionRequirement;
	};
	api?: CrudApiConfig<T>;
	validate?: (
		values: CrudFormValues,
		context: { items: T[]; activeItem: T | null; mode: CrudMode },
	) => CrudFormErrors;
}

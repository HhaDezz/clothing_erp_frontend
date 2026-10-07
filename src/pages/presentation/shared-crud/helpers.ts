import { CrudEntityId, CrudFormValue, CrudOption, CrudOptionSource } from './types';

export const CRUD_STORAGE_EVENT = 'crud-storage-change';

export const resolveCrudOptions = (options: CrudOptionSource = []) =>
	typeof options === 'function' ? options() : options;

export const getOptionLabel = (options: CrudOptionSource, value: string) =>
	resolveCrudOptions(options).find((option) => option.value === value)?.label || value;

export const toCodeRef = (_options: CrudOptionSource, value: string) => ({
	code: value,
});

export const toNameRef = (options: CrudOptionSource, value: string) => ({
	name: getOptionLabel(options, value),
});

export const toSingleValue = (value: CrudFormValue) => (Array.isArray(value) ? value[0] || '' : value);

export const toStringArray = (value: CrudFormValue) => (Array.isArray(value) ? value : value ? [value] : []);

export const getCompanyId = () => localStorage.getItem('company_id') || '';

export const normalizeCodeRef = (item: Record<string, any> | null | undefined) =>
	item
		? {
				id: item.id,
				code: item.code ?? item.name ?? null,
				name: item.name ?? item.code ?? null,
			}
		: null;

export const normalizeNameRef = (item: Record<string, any> | null | undefined) =>
	item
		? {
				id: item.id,
				name: item.name ?? item.code ?? null,
				code: item.code ?? item.name ?? null,
			}
		: null;

export const toOptions = <T extends object>(
	items: T[],
	getValue: (item: T) => string | number | null | undefined,
	getLabel: (item: T) => string | number | null | undefined = getValue,
): CrudOption[] =>
	items
		.map((item) => {
			const value = getValue(item);
			if (value === null || value === undefined || value === '') return null;

			return {
				value: String(value),
				label: String(getLabel(item) ?? value),
			};
		})
		.filter((option): option is CrudOption => option !== null);

const STORAGE_PREFIX = 'crud:';

export const getCrudStorageKey = (fileName: string) => `${STORAGE_PREFIX}${fileName}`;

export const loadCrudItems = <T extends object>(
	fileName: string,
	fallback: T[] = [],
): T[] => {
	return fallback;
};

export const saveCrudItems = <T extends object>(fileName: string, items: T[]) => {
	// disabled local storage caching
};

type CrudStoredOptionConfig<T> = {
	fileName: string;
	value: keyof T | ((item: T) => string | number | null | undefined);
	label?: keyof T | ((item: T) => string | number | null | undefined);
};

const readFieldValue = <T extends object>(
	item: T,
	selector: keyof T | ((item: T) => string | number | null | undefined),
) => {
	if (typeof selector === 'function') return selector(item);
	return item[selector] as string | number | null | undefined;
};

export const createStoredOptions = <T extends { id?: CrudEntityId }>({
	fileName,
	value,
	label = value,
}: CrudStoredOptionConfig<T>): CrudOption[] => {
	const items = loadCrudItems<T>(fileName, []);

	return items
		.map((item) => {
			const optionValue = readFieldValue(item, value);
			const optionLabel = readFieldValue(item, label);

			if (optionValue === null || optionValue === undefined || optionValue === '') {
				return null;
			}

			return {
				value: String(optionValue),
				label: String(optionLabel ?? optionValue),
			};
		})
		.filter((option): option is CrudOption => option !== null);
};

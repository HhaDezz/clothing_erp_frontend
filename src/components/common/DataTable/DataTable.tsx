import React, { ReactNode, useMemo, useRef, useState } from 'react';
import useDarkMode from '../../../hooks/useDarkMode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type DataTableAlign = 'left' | 'center' | 'right';

export type SortOrder = 'asc' | 'desc';

export interface DataTableState {
	currentPage: number;
	pageSize: number;
	search: string;
	sortKey: string;
	sortOrder: SortOrder;
}

export interface DataTableColumn<T> {
	key: keyof T | string;
	label: string;
	align?: DataTableAlign;
	sortable?: boolean;
	searchable?: boolean;
	width?: string | number;
	className?: string;
	headerClassName?: string;

	/**
	 * Use this for nested/custom values.
	 * Example: accessor: row => row.user.name
	 */
	accessor?: (row: T) => unknown;

	/**
	 * Use this like Vue slots.
	 * Example: render: row => <Badge>{row.status}</Badge>
	 */
	render?: (row: T) => ReactNode;

	/**
	 * Optional custom value for sorting.
	 */
	sortValue?: (row: T) => string | number | Date | null | undefined;

	/**
	 * Optional custom value for CSV/Excel/PDF/copy.
	 */
	exportValue?: (row: T) => string | number | boolean | null | undefined;
}

export interface DataTableAction<T> {
	key: string;
	label?: string;
	title?: string;
	icon?: ReactNode;
	iconClassName?: string;
	buttonClassName?: string;
	isVisible?: (row: T) => boolean;
	disabled?: (row: T) => boolean;
	onClick: (row: T) => void;
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	rowKey: keyof T | ((row: T, index: number) => string | number);

	actions?: DataTableAction<T>[];

	loading?: boolean;
	error?: unknown;

	showSearch?: boolean;
	showPagination?: boolean;
	showExportButtons?: boolean;
	showActions?: boolean;

	pageSizeOptions?: number[];
	initialPageSize?: number;

	emptyText?: string;
	searchPlaceholder?: string;
	tableClassName?: string;
	fileName?: string;

	/**
	 * Server-side mode flags.
	 * If true, the component will not filter/sort/paginate locally.
	 */
	manualSearch?: boolean;
	manualSorting?: boolean;
	manualPagination?: boolean;
	totalRows?: number;

	/**
	 * Controlled state for React Query server-side tables.
	 */
	state?: DataTableState;
	onStateChange?: (state: DataTableState) => void;

	onCopySuccess?: () => void;
}

const defaultState: DataTableState = {
	currentPage: 1,
	pageSize: 10,
	search: '',
	sortKey: '',
	sortOrder: 'asc',
};

function getNestedValue<T>(row: T, key: keyof T | string): unknown {
	if (typeof key !== 'string') {
		return row[key];
	}

	return key.split('.').reduce<unknown>((acc, part) => {
		if (acc && typeof acc === 'object' && part in acc) {
			return (acc as Record<string, unknown>)[part];
		}
		return undefined;
	}, row);
}

function valueToString(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

function normalizeSortValue(value: unknown): string | number {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	if (typeof value === 'boolean') return value ? 1 : 0;
	return String(value).toLowerCase();
}

function escapeCsv(value: unknown): string {
	const str = valueToString(value);

	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}

	return str;
}

function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = fileName;
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

function getAlignClass(align?: DataTableAlign) {
	switch (align) {
		case 'center':
			return 'text-center';
		case 'right':
			return 'text-end';
		case 'left':
			return 'text-start';
		default:
			return '';
	}
}

function getErrorMessage(error: unknown) {
	if (!error) return 'Something went wrong.';
	if (error instanceof Error) return error.message;
	return String(error);
}

export default function DataTable<T extends Record<string, unknown>>({
	columns,
	data,
	rowKey,
	actions = [],

	loading = false,
	error,

	showSearch = true,
	showPagination = true,
	showExportButtons = true,
	showActions = true,

	pageSizeOptions = [10, 25, 50, 100, 1000],
	initialPageSize = 10,

	emptyText = 'No records found.',
	searchPlaceholder = 'Search...',
	tableClassName = 'table table-hover table-modern',
	fileName = 'data',

	manualSearch = false,
	manualSorting = false,
	manualPagination = false,
	totalRows,

	state,
	onStateChange,

	onCopySuccess,
}: DataTableProps<T>) {
	const printRef = useRef<HTMLDivElement>(null);

	const { darkModeStatus } = useDarkMode();

	// Colors — custom green only in light mode; dark mode uses default theme
	const containerBg = darkModeStatus ? undefined : '#EDEFEE';
	const headerBg     = darkModeStatus ? undefined : '#c8dfc8';
	const tableBg = darkModeStatus ? undefined : '#EDEFEE';
	const textColor    = darkModeStatus ? undefined : 'inherit';
	const inputBg      = undefined;
	const inputColor   = undefined;
	const inputBorder  = undefined;

	const [internalState, setInternalState] = useState<DataTableState>({
		...defaultState,
		pageSize: initialPageSize,
	});

	const tableState = state ?? internalState;

	const updateState = (patch: Partial<DataTableState>) => {
		const nextState = {
			...tableState,
			...patch,
		};

		if (!state) {
			setInternalState(nextState);
		}

		onStateChange?.(nextState);
	};

	const getColumnValue = (row: T, column: DataTableColumn<T>) => {
		if (column.accessor) return column.accessor(row);
		return getNestedValue(row, column.key);
	};

	const getExportValue = (row: T, column: DataTableColumn<T>) => {
		if (column.exportValue) return column.exportValue(row);
		return getColumnValue(row, column);
	};

	const filteredData = useMemo(() => {
		if (manualSearch) return data;

		const search = tableState.search.trim().toLowerCase();
		if (!search) return data;

		const searchableColumns = columns.filter((column) => column.searchable !== false);

		return data.filter((row) =>
			searchableColumns.some((column) =>
				valueToString(getColumnValue(row, column)).toLowerCase().includes(search),
			),
		);
	}, [data, columns, tableState.search, manualSearch]);

	const sortedData = useMemo(() => {
		if (manualSorting || !tableState.sortKey) return filteredData;

		const column = columns.find((item) => String(item.key) === tableState.sortKey);
		if (!column) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aValue = normalizeSortValue(
				column.sortValue ? column.sortValue(a) : getColumnValue(a, column),
			);
			const bValue = normalizeSortValue(
				column.sortValue ? column.sortValue(b) : getColumnValue(b, column),
			);

			if (aValue < bValue) return tableState.sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return tableState.sortOrder === 'asc' ? 1 : -1;
			return 0;
		});
	}, [filteredData, columns, tableState.sortKey, tableState.sortOrder, manualSorting]);

	const totalItems = manualPagination ? (totalRows ?? data.length) : sortedData.length;

	const totalPages = Math.max(1, Math.ceil(totalItems / tableState.pageSize));

	const visibleRows = useMemo(() => {
		if (manualPagination) return sortedData;

		const start = (tableState.currentPage - 1) * tableState.pageSize;
		const end = start + tableState.pageSize;

		return sortedData.slice(start, end);
	}, [sortedData, tableState.currentPage, tableState.pageSize, manualPagination]);

	const visiblePages = useMemo(() => {
		const pages: Array<number | string> = [];

		if (totalPages <= 7) {
			for (let page = 1; page <= totalPages; page += 1) pages.push(page);
			return pages;
		}

		const candidates = new Set<number>([
			1,
			totalPages,
			tableState.currentPage - 1,
			tableState.currentPage,
			tableState.currentPage + 1,
		]);

		const sortedPages = [...candidates]
			.filter((page) => page >= 1 && page <= totalPages)
			.sort((a, b) => a - b);

		let previous = 0;

		sortedPages.forEach((page) => {
			if (previous && page - previous > 1) {
				pages.push(`ellipsis-${previous}-${page}`);
			}

			pages.push(page);
			previous = page;
		});

		return pages;
	}, [tableState.currentPage, totalPages]);

	const handleSort = (column: DataTableColumn<T>) => {
		if (column.sortable === false) return;

		const key = String(column.key);

		if (tableState.sortKey === key) {
			updateState({
				sortOrder: tableState.sortOrder === 'asc' ? 'desc' : 'asc',
				currentPage: 1,
			});
			return;
		}

		updateState({
			sortKey: key,
			sortOrder: 'asc',
			currentPage: 1,
		});
	};

	const handlePageChange = (page: number) => {
		if (page < 1 || page > totalPages) return;
		updateState({ currentPage: page });
	};

	const exportRows = manualPagination ? data : sortedData;

	const exportToCSV = () => {
		const headerRow = columns.map((column) => escapeCsv(column.label)).join(',');

		const bodyRows = exportRows
			.map((row) => columns.map((column) => escapeCsv(getExportValue(row, column))).join(','))
			.join('\n');

		const csv = `${headerRow}\n${bodyRows}`;
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

		downloadBlob(blob, `${fileName}.csv`);
	};

	const exportToExcel = () => {
		const rows = exportRows.map((row) =>
			Object.fromEntries(
				columns.map((column) => [column.label, getExportValue(row, column)]),
			),
		);

		const worksheet = XLSX.utils.json_to_sheet(rows);
		const workbook = XLSX.utils.book_new();

		XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
		XLSX.writeFile(workbook, `${fileName}.xlsx`);
	};

	const exportToPDF = () => {
		const doc = new jsPDF();

		autoTable(doc, {
			head: [columns.map((column) => column.label)],
			body: exportRows.map((row) =>
				columns.map((column) => valueToString(getExportValue(row, column))),
			),
		});

		doc.save(`${fileName}.pdf`);
	};

	const copyToClipboard = async () => {
		const headerRow = columns.map((column) => column.label).join('\t');

		const bodyRows = exportRows
			.map((row) =>
				columns.map((column) => valueToString(getExportValue(row, column))).join('\t'),
			)
			.join('\n');

		await navigator.clipboard.writeText(`${headerRow}\n${bodyRows}`);
		onCopySuccess?.();
	};

	const printTable = () => {
		const printableContent = printRef.current?.innerHTML;
		if (!printableContent) return;

		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		printWindow.document.write(`
			<html>
				<head>
					<title>Print Table</title>
					<style>
						table { width: 100%; border-collapse: collapse; }
						th, td { border: 1px solid #000; padding: 6px; text-align: left; }
					</style>
				</head>
				<body>${printableContent}</body>
			</html>
		`);

		printWindow.document.close();
		printWindow.print();
	};

	return (
		<div
			className='p-3 rounded-3 datatable-card'
			style={{ overflow: 'visible', backgroundColor: containerBg, color: textColor }}>
			<div className='d-flex align-items-center gap-2 mb-3'>
				{showPagination && (
					<select
						className='form-select'
						style={{ width: 'auto', backgroundColor: inputBg, color: inputColor, borderColor: inputBorder }}
						value={tableState.pageSize}
						onChange={(event) =>
							updateState({
								pageSize: Number(event.target.value),
								currentPage: 1,
							})
						}>
						{pageSizeOptions.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				)}

				{showExportButtons && (
					<div className='d-flex gap-2'>
						<button
							type='button'
							className='btn btn-outline-info btn-sm'
							onClick={exportToCSV}>
							<i className='fa fa-file-csv me-1' />
							CSV
						</button>

						<button
							type='button'
							className='btn btn-outline-success btn-sm'
							onClick={exportToExcel}>
							<i className='fa fa-file-excel me-1' />
							Excel
						</button>

						<button
							type='button'
							className='btn btn-outline-danger btn-sm'
							onClick={exportToPDF}>
							<i className='fa fa-file-pdf me-1' />
							PDF
						</button>

						<button
							type='button'
							className='btn btn-outline-primary btn-sm'
							onClick={copyToClipboard}>
							<i className='fa fa-clipboard me-1' />
							Copy
						</button>

						<button
							type='button'
							className='btn btn-outline-secondary btn-sm'
							onClick={printTable}>
							<i className='fa fa-print me-1' />
							Print
						</button>
					</div>
				)}

				{showSearch && (
					<div className='ms-auto'>
						<input
							type='search'
							className='form-control'
							style={{ backgroundColor: inputBg, color: inputColor, borderColor: inputBorder }}
							placeholder={searchPlaceholder}
							value={tableState.search}
							onChange={(event) =>
								updateState({
									search: event.target.value,
									currentPage: 1,
								})
							}
						/>
					</div>
				)}
			</div>

			<div
				className='table-responsive'
				ref={printRef}
				style={{ overflowX: 'auto', overflowY: 'visible' }}>
			<table className={tableClassName} style={{ backgroundColor: tableBg, color: textColor }}>
				<thead style={{ backgroundColor: headerBg, color: textColor }}>
						<tr>
							{columns.map((column) => {
								const key = String(column.key);
								const isSorted = tableState.sortKey === key;

								return (
									<th
										key={key}
										style={{ width: column.width }}
										className={[
											getAlignClass(column.align),
											column.sortable === false
												? ''
												: 'cursor-pointer text-decoration-underline',
											column.headerClassName ?? '',
										]
											.filter(Boolean)
											.join(' ')}
										onClick={() => handleSort(column)}>
										{column.label}

										{column.sortable !== false && (
											<span className='ms-1'>
												{isSorted ? (
													tableState.sortOrder === 'asc' ? (
														<i className='ti ti-arrow-up' />
													) : (
														<i className='ti ti-arrow-down' />
													)
												) : (
													<i className='ti ti-arrows-sort' />
												)}
											</span>
										)}
									</th>
								);
							})}

							{showActions && actions.length > 0 && (
								<th className='text-center'>Actions</th>
							)}
						</tr>
					</thead>

					<tbody>
						{loading && (
							<tr>
								<td
									colSpan={
										columns.length + (showActions && actions.length > 0 ? 1 : 0)
									}
									className='text-center py-5'>
									Loading...
								</td>
							</tr>
						)}

						{!loading && error && (
							<tr>
								<td
									colSpan={
										columns.length + (showActions && actions.length > 0 ? 1 : 0)
									}
									className='text-center text-danger py-5'>
									{getErrorMessage(error)}
								</td>
							</tr>
						)}

						{!loading &&
							!error &&
							visibleRows.map((row, rowIndex) => {
								const key =
									typeof rowKey === 'function'
										? rowKey(row, rowIndex)
										: valueToString(row[rowKey]);

								return (
									<tr key={key}>
										{columns.map((column) => (
											<td
												key={String(column.key)}
												className={[
													getAlignClass(column.align),
													column.className ?? '',
												]
													.filter(Boolean)
													.join(' ')}>
												{column.render
													? column.render(row)
													: valueToString(getColumnValue(row, column))}
											</td>
										))}

										{showActions && actions.length > 0 && (
											<td>
												<div className='d-flex gap-2 justify-content-end'>
													{actions.map((action) => {
														if (
															action.isVisible &&
															!action.isVisible(row)
														)
															return null;

														return (
															<button
																key={action.key}
																type='button'
																title={action.title ?? action.label}
																className={
																	action.buttonClassName ??
																	'btn btn-light btn-sm'
																}
																disabled={action.disabled?.(row)}
																onClick={() => action.onClick(row)}>
																{action.icon}
																{action.iconClassName && (
																	<i
																		className={
																			action.iconClassName
																		}
																	/>
																)}
																{action.label && (
																	<span className='ms-1'>
																		{action.label}
																	</span>
																)}
															</button>
														);
													})}
												</div>
											</td>
										)}
									</tr>
								);
							})}

						{!loading && !error && visibleRows.length === 0 && (
							<tr>
								<td
									colSpan={
										columns.length + (showActions && actions.length > 0 ? 1 : 0)
									}
									className='text-center py-5 text-muted'>
									{emptyText}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{showPagination && totalPages > 1 && (
				<nav aria-label='Page navigation'>
					<ul className='pagination mt-3'>
						<li
							className={`page-item ${tableState.currentPage === 1 ? 'disabled' : ''}`}>
							<button
								type='button'
								className='page-link'
								onClick={() => handlePageChange(tableState.currentPage - 1)}>
								Previous
							</button>
						</li>

						{visiblePages.map((page) =>
							typeof page === 'string' ? (
								<li key={page} className='page-item disabled'>
									<span className='page-link'>...</span>
								</li>
							) : (
								<li
									key={page}
									className={`page-item ${page === tableState.currentPage ? 'active' : ''}`}>
									<button
										type='button'
										className='page-link'
										onClick={() => handlePageChange(page)}>
										{page}
									</button>
								</li>
							),
						)}

						<li
							className={`page-item ${tableState.currentPage === totalPages ? 'disabled' : ''}`}>
							<button
								type='button'
								className='page-link'
								onClick={() => handlePageChange(tableState.currentPage + 1)}>
								Next
							</button>
						</li>
					</ul>
				</nav>
			)}
		</div>
	);
}

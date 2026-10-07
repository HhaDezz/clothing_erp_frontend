import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { AuditLogPayload, getAuditLogs, parseAuditChanges } from '../../../api/report.api';
import { PERMISSIONS } from '../../../constants/permissions';

// The server returns at most this many rows per search (newest first).
const RESULT_LIMIT = 2000;

type CategoryFilter = '' | 'REQUEST' | 'DATA' | 'BUSINESS' | 'AUTH';

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
	{ value: '', label: 'Everything' },
	{ value: 'REQUEST', label: 'Actions' },
	{ value: 'DATA', label: 'Data changes' },
	{ value: 'BUSINESS', label: 'Business events' },
	{ value: 'AUTH', label: 'Sign-ins' },
];

const CATEGORY_LABEL: Record<string, string> = {
	REQUEST: 'Action',
	DATA: 'Data change',
	BUSINESS: 'Business event',
	AUTH: 'Sign-in',
};

const CATEGORY_COLOR: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'secondary'> = {
	REQUEST: 'info',
	DATA: 'primary',
	BUSINESS: 'success',
	AUTH: 'warning',
};

const actionColor = (action: string): 'success' | 'danger' | 'warning' | 'info' | 'secondary' => {
	if (action === 'CREATE' || action === 'APPROVE' || action === 'LOGIN') return 'success';
	if (action === 'DELETE' || action === 'REJECT' || action === 'LOGIN_FAILED') return 'danger';
	if (action === 'UPDATE') return 'warning';
	if (action === 'LOGOUT') return 'secondary';
	return 'info';
};

const isFailure = (log: AuditLogPayload) =>
	(typeof log.statusCode === 'number' && log.statusCode >= 400) || log.action === 'LOGIN_FAILED';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

const todayIso = () => {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className='row py-1'>
		<div className='col-4 text-muted small'>{label}</div>
		<div className='col-8' style={{ wordBreak: 'break-word' }}>
			{children}
		</div>
	</div>
);

const AuditLogDetailModal = ({
	log,
	setIsOpen,
	onShowRequest,
}: {
	log: AuditLogPayload | null;
	setIsOpen: (open: boolean) => void;
	onShowRequest: (requestId: string) => void;
}) => {
	const changes = useMemo(() => parseAuditChanges(log?.changes), [log]);

	return (
		<Modal isOpen={!!log} setIsOpen={setIsOpen} size='lg' isCentered isScrollable>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='audit-log-detail-title'>Audit Entry</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{log && (
					<>
						<DetailRow label='When'>{formatDateTime(log.createdAt)}</DetailRow>
						<DetailRow label='User'>{log.userName || 'System'}</DetailRow>
						<DetailRow label='Type'>
							{CATEGORY_LABEL[String(log.category)] || String(log.category || '—')}
						</DetailRow>
						<DetailRow label='Action'>
							<Badge color={actionColor(log.action)} isLight>
								{log.action}
							</Badge>
						</DetailRow>
						<DetailRow label='Module'>{log.module}</DetailRow>
						<DetailRow label='Record'>{log.recordId ?? '—'}</DetailRow>
						{log.details && <DetailRow label='What happened'>{log.details}</DetailRow>}
						{log.path && (
							<DetailRow label='Request'>
								<code>
									{log.httpMethod} {log.path}
								</code>
							</DetailRow>
						)}
						{typeof log.statusCode === 'number' && (
							<DetailRow label='Result'>
								<Badge color={log.statusCode >= 400 ? 'danger' : 'success'} isLight>
									{log.statusCode >= 400 ? 'Failed' : 'Succeeded'} ({log.statusCode})
								</Badge>
								{typeof log.durationMs === 'number' && (
									<span className='text-muted small ms-2'>
										{log.durationMs} ms
									</span>
								)}
							</DetailRow>
						)}
						<DetailRow label='IP address'>{log.ipAddress || '—'}</DetailRow>
						{log.userAgent && (
							<DetailRow label='Browser'>
								<span className='small text-muted'>{log.userAgent}</span>
							</DetailRow>
						)}

						{changes.length > 0 && (
							<>
								<div className='fw-bold mt-4 mb-2'>What changed</div>
								<div className='table-responsive'>
									<table className='table table-sm table-bordered align-middle mb-0'>
										<thead>
											<tr>
												<th style={{ width: '26%' }}>Field</th>
												<th style={{ width: '37%' }}>Before</th>
												<th style={{ width: '37%' }}>After</th>
											</tr>
										</thead>
										<tbody>
											{changes.map((change) => (
												<tr key={change.field}>
													<td className='fw-semibold'>{change.field}</td>
													<td
														className='text-danger'
														style={{ wordBreak: 'break-word' }}>
														{change.old ?? '—'}
													</td>
													<td
														className='text-success'
														style={{ wordBreak: 'break-word' }}>
														{change.new ?? '—'}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</>
				)}
			</ModalBody>
			<ModalFooter>
				{log?.requestId && (
					<Button
						color='info'
						isLight
						icon='ListAlt'
						onClick={() => onShowRequest(String(log.requestId))}>
						Show everything from this request
					</Button>
				)}
				<Button color='secondary' isOutline onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const AuditLogsPage = () => {
	// Default to today: the log is large, and "what happened today" is the
	// usual question. Clear the dates to look further back.
	const [dateFrom, setDateFrom] = useState(todayIso());
	const [dateTo, setDateTo] = useState(todayIso());
	const [category, setCategory] = useState<CategoryFilter>('');
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	// When set, the table shows only the rows one API call produced.
	const [requestId, setRequestId] = useState<string | null>(null);
	const [selected, setSelected] = useState<AuditLogPayload | null>(null);

	// Wait until typing pauses before asking the server again.
	useEffect(() => {
		const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const {
		data: auditLogs = [],
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ['audit-logs', dateFrom, dateTo, category, search],
		queryFn: () =>
			getAuditLogs({
				date_from: dateFrom || undefined,
				date_to: dateTo || undefined,
				category: category || undefined,
				search: search || undefined,
				limit: RESULT_LIMIT,
			}),
	});

	const rows = useMemo(
		() => (requestId ? auditLogs.filter((log) => log.requestId === requestId) : auditLogs),
		[auditLogs, requestId],
	);

	const failures = useMemo(() => rows.filter(isFailure).length, [rows]);

	const columns: DataTableColumn<AuditLogPayload>[] = [
		{
			key: 'createdAt',
			label: 'Date & Time',
			render: (log) => formatDateTime(log.createdAt),
			exportValue: (log) => formatDateTime(log.createdAt),
		},
		{
			key: 'userName',
			label: 'User',
			render: (log) => log.userName || (log.userId ? `User #${log.userId}` : 'System'),
		},
		{
			key: 'category',
			label: 'Type',
			render: (log) => (
				<Badge color={CATEGORY_COLOR[String(log.category)] || 'secondary'} isLight>
					{CATEGORY_LABEL[String(log.category)] || String(log.category || '—')}
				</Badge>
			),
			exportValue: (log) => CATEGORY_LABEL[String(log.category)] || String(log.category || ''),
		},
		{
			key: 'action',
			label: 'Action',
			render: (log) => (
				<Badge color={actionColor(log.action)} isLight>
					{log.action}
				</Badge>
			),
		},
		{
			key: 'module',
			label: 'Module',
			render: (log) => (
				<span>
					<span className='fw-semibold'>{log.module}</span>
					{log.recordId != null && log.recordId !== '' && (
						<span className='text-muted'> #{log.recordId}</span>
					)}
				</span>
			),
			exportValue: (log) =>
				log.recordId != null && log.recordId !== ''
					? `${log.module} #${log.recordId}`
					: log.module,
		},
		{
			key: 'details',
			label: 'What happened',
			render: (log) => (
				<span className={isFailure(log) ? 'text-danger' : undefined}>
					{log.details || '—'}
				</span>
			),
			exportValue: (log) => log.details || '',
		},
		{ key: 'ipAddress', label: 'IP Address', render: (log) => log.ipAddress || '—' },
		{
			key: 'actions',
			label: '',
			align: 'right',
			sortable: false,
			searchable: false,
			render: (log) => (
				<DataTableActionMenu
					actions={[
						{
							key: 'view',
							label: 'View Details',
							icon: 'ti ti-eye',
							className: 'text-info',
							onClick: () => setSelected(log),
						},
					]}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Audit Logs' requiredPermission={PERMISSIONS.SHOW_AUDIT_LOG}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='ListAlt' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Audit Logs</span>
					<span className='text-muted ms-3 small'>
						Who did what, and when. Entries are kept for three months.
					</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page>
				<Card stretch>
					<CardBody style={{ overflow: 'visible' }}>
						<div className='d-flex flex-wrap gap-2 mb-3'>
							{CATEGORIES.map((option) => (
								<Button
									key={option.value || 'all'}
									color='primary'
									isLight={category !== option.value}
									size='sm'
									onClick={() => setCategory(option.value)}>
									{option.label}
								</Button>
							))}
						</div>
						<div className='row g-3 mb-3 align-items-end'>
							<div className='col-md-2'>
								<label className='form-label fw-semibold' htmlFor='auditDateFrom'>
									From
								</label>
								<input
									id='auditDateFrom'
									type='date'
									className='form-control'
									value={dateFrom}
									onChange={(event) => setDateFrom(event.target.value)}
								/>
							</div>
							<div className='col-md-2'>
								<label className='form-label fw-semibold' htmlFor='auditDateTo'>
									To
								</label>
								<input
									id='auditDateTo'
									type='date'
									className='form-control'
									value={dateTo}
									onChange={(event) => setDateTo(event.target.value)}
								/>
							</div>
							<div className='col-md-4'>
								<label className='form-label fw-semibold' htmlFor='auditSearch'>
									Find
								</label>
								<input
									id='auditSearch'
									type='search'
									className='form-control'
									placeholder='User email, module, or words from the entry...'
									value={searchInput}
									onChange={(event) => setSearchInput(event.target.value)}
								/>
							</div>
							<div className='col-md-4 d-flex gap-2'>
								<Button
									color='light'
									onClick={() => {
										setDateFrom(todayIso());
										setDateTo(todayIso());
									}}>
									Today
								</Button>
								<Button
									color='light'
									onClick={() => {
										setDateFrom('');
										setDateTo('');
									}}>
									All dates
								</Button>
								<Button
									color='info'
									isLight
									icon='Refresh'
									isDisable={isFetching}
									onClick={() => refetch()}>
									Refresh
								</Button>
							</div>
						</div>

						{requestId && (
							<div className='alert alert-info d-flex align-items-center justify-content-between py-2'>
								<span>
									Showing the {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}{' '}
									produced by one request.
								</span>
								<Button color='info' size='sm' onClick={() => setRequestId(null)}>
									Show all
								</Button>
							</div>
						)}

						<div className='d-flex flex-wrap gap-3 small text-muted mb-3'>
							<span>
								<strong>{rows.length}</strong> entr{rows.length === 1 ? 'y' : 'ies'}
							</span>
							{failures > 0 && (
								<span className='text-danger'>
									<strong>{failures}</strong> failed
								</span>
							)}
							{!requestId && auditLogs.length >= RESULT_LIMIT && (
								<span className='text-warning'>
									Showing the newest {RESULT_LIMIT} only — narrow the dates or
									search to see older entries.
								</span>
							)}
						</div>

						<DataTable
							columns={columns}
							data={rows}
							rowKey='id'
							loading={isLoading}
							error={error}
							fileName='audit_logs'
							showActions={false}
							initialPageSize={25}
							emptyText='No audit entries match these filters.'
						/>
					</CardBody>
				</Card>
			</Page>
			<AuditLogDetailModal
				log={selected}
				setIsOpen={(open) => {
					if (!open) setSelected(null);
				}}
				onShowRequest={(id) => {
					setRequestId(id);
					setSelected(null);
				}}
			/>
		</PageWrapper>
	);
};

export default AuditLogsPage;

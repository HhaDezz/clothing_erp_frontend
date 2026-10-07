import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Spinner from '../../../components/bootstrap/Spinner';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { PERMISSIONS } from '../../../constants/permissions';
import { getSegmentsApi } from '../../../api/segments.api';
import {
	Campaign,
	CampaignChannel,
	CampaignPayload,
	CampaignRecipientStatus,
	cancelCampaignApi,
	createCampaignApi,
	deleteCampaignApi,
	getCampaignLogApi,
	getCampaignsApi,
	queueCampaignApi,
	updateCampaignApi,
} from '../../../api/campaigns.api';

const STATUS_COLORS: Record<Campaign['status'], string> = {
	DRAFT: 'secondary',
	SCHEDULED: 'info',
	SENDING: 'warning',
	SENT: 'success',
	CANCELLED: 'dark',
	FAILED: 'danger',
};

const RECIPIENT_STATUS_COLORS: Record<CampaignRecipientStatus, string> = {
	PENDING: 'secondary',
	SENT: 'success',
	FAILED: 'danger',
	SKIPPED: 'warning',
};

// datetime-local <-> ISO. An empty box means "send as soon as it's queued".
const toDatetimeLocal = (iso: string | null): string => {
	if (!iso) return '';
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDatetimeLocal = (local: string): string | undefined => (local ? new Date(local).toISOString() : undefined);

const CampaignComposerModal: React.FC<{
	campaign: Campaign | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ campaign, isOpen, setIsOpen }) => {
	const queryClient = useQueryClient();
	const isEditing = campaign !== null;

	const [name, setName] = useState('');
	const [segmentId, setSegmentId] = useState<number | ''>('');
	const [channel, setChannel] = useState<CampaignChannel>('SMS');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [scheduledAt, setScheduledAt] = useState('');

	const { data: segments = [] } = useQuery({
		queryKey: ['segments'],
		queryFn: getSegmentsApi,
		enabled: isOpen,
	});

	React.useEffect(() => {
		if (!isOpen) return;
		setName(campaign?.name ?? '');
		setSegmentId(campaign?.segmentId ?? '');
		setChannel(campaign?.channel ?? 'SMS');
		setSubject(campaign?.subject ?? '');
		setBody(campaign?.body ?? '');
		setScheduledAt(toDatetimeLocal(campaign?.scheduledAt ?? null));
	}, [isOpen, campaign]);

	const saveMutation = useMutation({
		mutationFn: (payload: CampaignPayload) =>
			isEditing ? updateCampaignApi(campaign!.id, payload) : createCampaignApi(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Campaign Saved</>, '', 'success');
			setIsOpen(false);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save campaign'), 'danger'),
	});

	const handleSave = () => {
		if (!name.trim()) {
			showNotification('Name required', 'Give this campaign a name first.', 'warning');
			return;
		}
		if (segmentId === '') {
			showNotification('Segment required', 'Pick who this campaign goes to.', 'warning');
			return;
		}
		if (!body.trim()) {
			showNotification('Message required', 'Write the message body first.', 'warning');
			return;
		}
		saveMutation.mutate({
			name: name.trim(),
			segmentId: Number(segmentId),
			channel,
			subject: channel === 'EMAIL' ? subject.trim() || undefined : undefined,
			body: body.trim(),
			scheduledAt: fromDatetimeLocal(scheduledAt) ?? null,
		});
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='campaign-composer-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='campaign-composer-modal'>
					{isEditing ? `Edit Campaign — ${campaign?.name}` : 'New Campaign'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<FormGroup id='campaignName' label='Name' className='col-md-7'>
						<Input
							name='campaignName'
							value={name}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
							placeholder='e.g. September clearance — SMS'
						/>
					</FormGroup>
					<FormGroup id='campaignChannel' label='Channel' className='col-md-5'>
						<select
							id='campaignChannel'
							className='form-select'
							value={channel}
							onChange={(e) => setChannel(e.target.value as CampaignChannel)}>
							<option value='SMS'>SMS</option>
							<option value='EMAIL'>Email</option>
						</select>
					</FormGroup>
					<FormGroup id='campaignSegment' label='Segment' className='col-md-7'>
						<select
							id='campaignSegment'
							className='form-select'
							value={segmentId}
							onChange={(e) => setSegmentId(e.target.value ? Number(e.target.value) : '')}>
							<option value=''>Select a segment...</option>
							{segments.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</FormGroup>
					<FormGroup id='scheduledAt' label='Send at' className='col-md-5'>
						<input
							id='scheduledAt'
							type='datetime-local'
							className='form-control'
							value={scheduledAt}
							onChange={(e) => setScheduledAt(e.target.value)}
						/>
						<div className='text-muted small mt-1'>Blank sends as soon as it's queued.</div>
					</FormGroup>
					{channel === 'EMAIL' && (
						<FormGroup id='campaignSubject' label='Subject' className='col-12'>
							<Input
								name='campaignSubject'
								value={subject}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
								placeholder='Falls back to the campaign name if left blank'
							/>
						</FormGroup>
					)}
					<FormGroup id='campaignBody' label='Message' className='col-12'>
						<textarea
							id='campaignBody'
							className='form-control'
							rows={6}
							value={body}
							onChange={(e) => setBody(e.target.value)}
							placeholder='Hi {{firstName}}, ...'
						/>
						<div className='text-muted small mt-1'>
							Supports <code>{'{{firstName}}'}</code>, <code>{'{{fullName}}'}</code>,{' '}
							<code>{'{{points}}'}</code> and <code>{'{{storeCredit}}'}</code>. An opt-out
							line is added automatically — don't write one in.
						</div>
					</FormGroup>
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='primary' isDisable={saveMutation.isPending} onClick={handleSave}>
					{saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Campaign' : 'Create Campaign'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const CampaignLogModal: React.FC<{
	campaign: Campaign | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ campaign, isOpen, setIsOpen }) => {
	const [statusFilter, setStatusFilter] = useState<CampaignRecipientStatus | ''>('');

	const { data: log = [], isLoading } = useQuery({
		queryKey: ['campaignLog', campaign?.id, statusFilter],
		queryFn: () => getCampaignLogApi(campaign!.id, statusFilter || undefined),
		enabled: isOpen && campaign !== null,
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='campaign-log-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='campaign-log-modal'>
					Delivery Log — {campaign?.name}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='d-flex align-items-center gap-3 mb-3'>
					{campaign && (
						<div className='d-flex gap-2'>
							<Badge color='success' isLight>{campaign.sentCount ?? 0} sent</Badge>
							<Badge color='danger' isLight>{campaign.failedCount ?? 0} failed</Badge>
							<Badge color='warning' isLight>{campaign.skippedCount ?? 0} skipped</Badge>
						</div>
					)}
					<select
						className='form-select form-select-sm ms-auto'
						style={{ maxWidth: 180 }}
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as CampaignRecipientStatus | '')}>
						<option value=''>All statuses</option>
						<option value='PENDING'>Pending</option>
						<option value='SENT'>Sent</option>
						<option value='FAILED'>Failed</option>
						<option value='SKIPPED'>Skipped</option>
					</select>
				</div>
				{isLoading ? (
					<div className='text-center py-4'>
						<Spinner isSmall />
					</div>
				) : log.length === 0 ? (
					<div className='text-muted fst-italic text-center py-3'>No recipients match this filter.</div>
				) : (
					<div className='table-responsive' style={{ maxHeight: 420, overflowY: 'auto' }}>
						<table className='table table-sm table-hover align-middle mb-0'>
							<thead className='table-light'>
								<tr>
									<th>Customer</th>
									<th>Destination</th>
									<th>Status</th>
									<th>Error</th>
									<th>Sent at</th>
								</tr>
							</thead>
							<tbody>
								{log.map((r) => (
									<tr key={r.id}>
										<td>{r.customerName}</td>
										<td className='text-muted small'>{r.destination ?? '—'}</td>
										<td>
											<Badge color={RECIPIENT_STATUS_COLORS[r.status]} isLight>
												{r.status}
											</Badge>
										</td>
										<td className='text-danger small'>{r.error ?? ''}</td>
										<td className='text-muted small'>
											{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const CampaignsPage = () => {
	const queryClient = useQueryClient();
	const [composerTarget, setComposerTarget] = useState<Campaign | null>(null);
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [logTarget, setLogTarget] = useState<Campaign | null>(null);
	const [isLogOpen, setIsLogOpen] = useState(false);

	const { data: campaigns = [], isLoading } = useQuery({
		queryKey: ['campaigns'],
		queryFn: getCampaignsApi,
	});

	const queueMutation = useMutation({
		mutationFn: queueCampaignApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Campaign Queued</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to queue campaign'), 'danger'),
	});

	const cancelMutation = useMutation({
		mutationFn: cancelCampaignApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			showNotification('Campaign Cancelled', 'Whatever already went out has gone out.', 'info');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to cancel campaign'), 'danger'),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteCampaignApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Campaign Deleted</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to delete campaign'), 'danger'),
	});

	return (
		<PageWrapper title='Campaigns' requiredPermission={PERMISSIONS.MANAGE_CUSTOMER_CAMPAIGNS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Campaign' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Campaigns</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setComposerTarget(null);
							setIsComposerOpen(true);
						}}>
						New Campaign
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page>
				<Card>
					<CardBody>
						{isLoading ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
							</div>
						) : campaigns.length === 0 ? (
							<div className='text-muted fst-italic text-center py-4'>
								No campaigns yet. Build a segment first, then send something to it.
							</div>
						) : (
							<div className='table-responsive'>
								<table className='table table-hover align-middle mb-0'>
									<thead className='table-light'>
										<tr>
											<th>Name</th>
											<th>Segment</th>
											<th>Channel</th>
											<th>Status</th>
											<th>Results</th>
											<th className='text-end'>&nbsp;</th>
										</tr>
									</thead>
									<tbody>
										{campaigns.map((c) => (
											<tr key={c.id}>
												<td>
													<div className='fw-bold'>{c.name}</div>
													<div className='text-muted small'>
														{c.scheduledAt
															? `Scheduled ${new Date(c.scheduledAt).toLocaleString()}`
															: c.createdByName
																? `By ${c.createdByName}`
																: ''}
													</div>
												</td>
												<td className='text-muted small'>{c.segmentName ?? '—'}</td>
												<td>
													<Badge color='light' isLight className='text-dark'>
														{c.channel}
													</Badge>
												</td>
												<td>
													<Badge color={STATUS_COLORS[c.status]} isLight>
														{c.status}
													</Badge>
												</td>
												<td className='small text-muted'>
													{c.totalCount ? (
														<>
															{c.sentCount ?? 0}/{c.totalCount} sent
															{(c.failedCount ?? 0) > 0 && `, ${c.failedCount} failed`}
														</>
													) : (
														'—'
													)}
												</td>
												<td className='text-end'>
													<Button
														size='sm'
														color='light'
														icon='ListAlt'
														onClick={() => {
															setLogTarget(c);
															setIsLogOpen(true);
														}}
													/>
													{c.status === 'DRAFT' && (
														<>
															<Button
																size='sm'
																color='light'
																icon='Edit'
																className='ms-1'
																onClick={() => {
																	setComposerTarget(c);
																	setIsComposerOpen(true);
																}}
															/>
															<Button
																size='sm'
																color='light'
																icon='Send'
																className='text-success ms-1'
																isDisable={queueMutation.isPending}
																onClick={() => queueMutation.mutate(c.id)}
															/>
															<Button
																size='sm'
																color='light'
																icon='Delete'
																className='text-danger ms-1'
																isDisable={deleteMutation.isPending}
																onClick={() => {
																	if (window.confirm(`Delete campaign "${c.name}"?`)) {
																		deleteMutation.mutate(c.id);
																	}
																}}
															/>
														</>
													)}
													{(c.status === 'SCHEDULED' || c.status === 'SENDING') && (
														<Button
															size='sm'
															color='light'
															icon='Cancel'
															className='text-danger ms-1'
															isDisable={cancelMutation.isPending}
															onClick={() => cancelMutation.mutate(c.id)}>
															Cancel
														</Button>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardBody>
				</Card>
			</Page>

			<CampaignComposerModal
				campaign={composerTarget}
				isOpen={isComposerOpen}
				setIsOpen={setIsComposerOpen}
			/>
			<CampaignLogModal campaign={logTarget} isOpen={isLogOpen} setIsOpen={setIsLogOpen} />
		</PageWrapper>
	);
};

export default CampaignsPage;

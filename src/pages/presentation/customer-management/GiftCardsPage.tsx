import React, { useMemo, useState } from 'react';
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
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import {
	GiftCard,
	GiftCardStatus,
	getGiftCardHistoryApi,
	getGiftCardsApi,
	issueGiftCardApi,
	voidGiftCardApi,
} from '../../../api/giftCard.api';

/**
 * Gift Card Log — "need gift card log too". Every card ever issued or sold,
 * what it started with, what is left on it, and (per card) every movement
 * that got it there. Reading needs customer-insights-view; issuing a card
 * from here and voiding one need customer-giftcard-manage. Selling a card
 * to a customer still happens at the POS — this page is the back-office
 * record, plus the place to issue one that isn't a sale (a prize, a
 * goodwill gesture).
 */

const STATUS_COLORS: Record<GiftCardStatus, string> = {
	ACTIVE: 'success',
	USED_UP: 'secondary',
	VOID: 'danger',
	EXPIRED: 'warning',
};

const STATUS_LABELS: Record<GiftCardStatus, string> = {
	ACTIVE: 'Active',
	USED_UP: 'Used up',
	VOID: 'Void',
	EXPIRED: 'Expired',
};

const ENTRY_LABELS: Record<string, string> = {
	ISSUE: 'Issued',
	SPEND: 'Redeemed on a sale',
	REFUND: 'Refunded to card',
	VOID: 'Voided',
	ADJUST: 'Manual adjustment',
	REVERSE: 'Reversed',
};

const entryColor = (entryType: string): any =>
	({ ISSUE: 'success', REFUND: 'success', SPEND: 'warning', VOID: 'danger', ADJUST: 'info', REVERSE: 'dark' })[
		entryType
	] ?? 'secondary';

const dateOnly = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

// ─── One card's movements ───────────────────────────────────────────────────
const GiftCardHistoryModal: React.FC<{
	card: GiftCard | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ card, isOpen, setIsOpen }) => {
	const { data: history, isLoading } = useQuery({
		queryKey: ['giftCardHistory', card?.id],
		queryFn: () => getGiftCardHistoryApi(card!.id),
		enabled: isOpen && !!card,
	});

	if (!card) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='gift-card-history-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='gift-card-history-modal'>
					<Icon icon='CardGiftcard' className='me-2 text-primary' />
					Gift Card — {card.code}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3 mb-4'>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>Initial Value</div>
							<div className='fs-5 fw-bold'>{formatCurrency(card.initialValue || 0)}</div>
						</div>
					</div>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>Redeemed</div>
							<div className='fs-5 fw-bold text-danger'>
								-{formatCurrency(Math.max(0, (card.initialValue || 0) - (card.balance || 0)))}
							</div>
						</div>
					</div>
					<div className='col-4'>
						<div className='bg-light rounded-3 p-3 text-center h-100'>
							<div className='text-muted small text-uppercase fw-semibold mb-1'>Balance</div>
							<div className='fs-5 fw-bold text-success'>{formatCurrency(card.balance || 0)}</div>
						</div>
					</div>
				</div>

				<div className='row g-3 mb-4'>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Status</label>
						<p className='mb-0'>
							<Badge color={STATUS_COLORS[card.status] as any} isLight>
								{STATUS_LABELS[card.status] ?? card.status}
							</Badge>
						</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Issued To</label>
						<p className='mb-0'>{card.issuedToCustomerName || '—'}</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Sold On</label>
						<p className='mb-0'>{card.soldOnOrderNo || 'Issued from back office'}</p>
					</div>
					<div className='col-md-3'>
						<label className='text-muted small fw-semibold text-uppercase'>Expires</label>
						<p className='mb-0'>{card.expiresAt ? dateOnly(card.expiresAt) : 'Never'}</p>
					</div>
					{card.note && (
						<div className='col-12'>
							<label className='text-muted small fw-semibold text-uppercase'>Note</label>
							<p className='mb-0'>{card.note}</p>
						</div>
					)}
				</div>

				<h6 className='fw-bold mb-2'>Movements</h6>
				{isLoading ? (
					<div className='text-center py-4'>
						<Spinner color='primary' />
					</div>
				) : history && history.length > 0 ? (
					<div className='table-responsive'>
						<table className='table table-sm table-hover align-middle mb-0'>
							<thead className='table-light'>
								<tr>
									<th>Date</th>
									<th>What happened</th>
									<th>Order</th>
									<th>By</th>
									<th>Note</th>
									<th className='text-end'>Amount</th>
								</tr>
							</thead>
							<tbody>
								{history.map((entry) => (
									<tr key={entry.id}>
										<td className='text-muted small'>
											{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
										</td>
										<td>
											<Badge color={entryColor(entry.entryType)} isLight>
												{ENTRY_LABELS[entry.entryType] ?? entry.entryType}
											</Badge>
										</td>
										<td>{entry.orderNo || '—'}</td>
										<td className='text-muted'>{entry.createdByName || '—'}</td>
										<td className='text-muted small'>{entry.note || '—'}</td>
										<td
											className={`text-end fw-bold ${
												entry.amount < 0 ? 'text-danger' : 'text-success'
											}`}>
											{entry.amount > 0 ? '+' : ''}
											{formatCurrency(entry.amount)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className='text-center py-4 text-muted'>No movements recorded for this card.</div>
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

// ─── Issue a card that isn't a sale ─────────────────────────────────────────
const IssueGiftCardModal: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({
	isOpen,
	setIsOpen,
}) => {
	const queryClient = useQueryClient();
	const [value, setValue] = useState<number | ''>('');
	const [code, setCode] = useState('');
	const [expiresOn, setExpiresOn] = useState('');
	const [note, setNote] = useState('');
	const [issued, setIssued] = useState<GiftCard | null>(null);

	React.useEffect(() => {
		if (!isOpen) return;
		setValue('');
		setCode('');
		setExpiresOn('');
		setNote('');
		setIssued(null);
	}, [isOpen]);

	const issueMutation = useMutation({
		mutationFn: () =>
			issueGiftCardApi({
				initialValue: Number(value),
				...(code.trim() ? { code: code.trim() } : {}),
				// End of the chosen day, so a card "expiring on the 31st" still
				// works on the 31st.
				...(expiresOn ? { expiresAt: `${expiresOn}T23:59:59` } : {}),
				...(note.trim() ? { note: note.trim() } : {}),
			}),
		onSuccess: (card) => {
			queryClient.invalidateQueries({ queryKey: ['giftCards'] });
			setIssued(card);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Could not issue the gift card'), 'danger'),
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='issue-gift-card-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='issue-gift-card-modal'>Issue Gift Card</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{issued ? (
					<div className='text-center py-3'>
						<Icon icon='CheckCircle' size='3x' color='success' />
						<p className='mt-3 mb-1 text-muted'>Gift card issued — hand this code to the customer</p>
						<div className='fs-3 fw-bold' style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
							{issued.code}
						</div>
						<div className='fs-5 text-success fw-semibold'>{formatCurrency(issued.balance)}</div>
					</div>
				) : (
					<div className='row g-3'>
						<FormGroup id='giftCardValue' label='Value' className='col-12'>
							<Input
								name='giftCardValue'
								type='number'
								min={0}
								placeholder='e.g. 5000'
								value={value}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setValue(e.target.value === '' ? '' : Number(e.target.value))
								}
							/>
						</FormGroup>
						<FormGroup id='giftCardCode' label='Code (optional — generated if left blank)' className='col-12'>
							<Input
								name='giftCardCode'
								value={code}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
							/>
						</FormGroup>
						<FormGroup id='giftCardExpiry' label='Expires on (optional)' className='col-12'>
							<Input
								name='giftCardExpiry'
								type='date'
								value={expiresOn}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresOn(e.target.value)}
							/>
						</FormGroup>
						<FormGroup id='giftCardNote' label='Note' className='col-12'>
							<Input
								name='giftCardNote'
								placeholder='Why it was issued'
								value={note}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
							/>
						</FormGroup>
					</div>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					{issued ? 'Done' : 'Cancel'}
				</Button>
				{!issued && (
					<Button
						color='primary'
						isDisable={value === '' || Number(value) <= 0 || issueMutation.isPending}
						onClick={() => issueMutation.mutate()}>
						{issueMutation.isPending ? 'Issuing...' : 'Issue card'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

// ─── Void a card ────────────────────────────────────────────────────────────
const VoidGiftCardModal: React.FC<{
	card: GiftCard | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ card, isOpen, setIsOpen }) => {
	const queryClient = useQueryClient();
	const [note, setNote] = useState('');

	React.useEffect(() => {
		if (isOpen) setNote('');
	}, [isOpen]);

	const voidMutation = useMutation({
		mutationFn: () => voidGiftCardApi(card!.id, note.trim()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['giftCards'] });
			queryClient.invalidateQueries({ queryKey: ['giftCardHistory'] });
			showNotification('Gift card voided', '', 'success');
			setIsOpen(false);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Could not void the gift card'), 'danger'),
	});

	if (!card) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='void-gift-card-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='void-gift-card-modal'>Void Gift Card — {card.code}</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='alert alert-danger py-2 px-3 small'>
					This cancels the card and writes off the {formatCurrency(card.balance || 0)} left on it. It
					cannot be undone.
				</div>
				<FormGroup id='voidNote' label='Reason (required)'>
					<Input
						name='voidNote'
						value={note}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
					/>
				</FormGroup>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='danger'
					isDisable={!note.trim() || voidMutation.isPending}
					onClick={() => voidMutation.mutate()}>
					{voidMutation.isPending ? 'Voiding...' : 'Void card'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const GiftCardsPage = () => {
	const { hasPermission } = usePermission();
	const canManage = hasPermission(PERMISSIONS.MANAGE_GIFT_CARDS);

	const [statusFilter, setStatusFilter] = useState<GiftCardStatus | 'ALL'>('ALL');
	const [viewCard, setViewCard] = useState<GiftCard | null>(null);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [voidCard, setVoidCard] = useState<GiftCard | null>(null);
	const [isVoidOpen, setIsVoidOpen] = useState(false);
	const [isIssueOpen, setIsIssueOpen] = useState(false);

	const {
		data: cards = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['giftCards'],
		queryFn: () => getGiftCardsApi(),
	});

	const visibleCards = statusFilter === 'ALL' ? cards : cards.filter((card) => card.status === statusFilter);

	const totals = useMemo(
		() =>
			cards.reduce(
				(acc, card) => {
					acc.issued += card.initialValue || 0;
					if (card.status === 'ACTIVE') {
						acc.active += 1;
						acc.outstanding += card.balance || 0;
					}
					// Only what was actually spent — a voided or expired card's
					// written-off balance was never redeemed.
					if (card.status === 'ACTIVE' || card.status === 'USED_UP') {
						acc.redeemed += Math.max(0, (card.initialValue || 0) - (card.balance || 0));
					}
					return acc;
				},
				{ issued: 0, active: 0, outstanding: 0, redeemed: 0 },
			),
		[cards],
	);

	const countFor = (status: GiftCardStatus) => cards.filter((card) => card.status === status).length;

	const openHistory = (card: GiftCard) => {
		setViewCard(card);
		setIsHistoryOpen(true);
	};

	const columns: DataTableColumn<GiftCard>[] = [
		{
			key: 'code',
			label: 'Code',
			render: (row) => (
				<button
					type='button'
					className='btn btn-link p-0 fw-bold text-decoration-none'
					style={{ fontFamily: 'monospace' }}
					onClick={() => openHistory(row)}>
					{row.code}
				</button>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={STATUS_COLORS[row.status] as any} isLight>
					{STATUS_LABELS[row.status] ?? row.status}
				</Badge>
			),
		},
		{
			key: 'initialValue',
			label: 'Initial Value',
			align: 'right',
			render: (row) => <span>{formatCurrency(row.initialValue || 0)}</span>,
		},
		{
			key: 'redeemed',
			label: 'Redeemed',
			align: 'right',
			searchable: false,
			sortValue: (row) => (row.initialValue || 0) - (row.balance || 0),
			exportValue: (row) => (row.initialValue || 0) - (row.balance || 0),
			render: (row) => {
				const used = Math.max(0, (row.initialValue || 0) - (row.balance || 0));
				return <span className={used > 0 ? 'text-danger' : 'text-muted'}>-{formatCurrency(used)}</span>;
			},
		},
		{
			key: 'balance',
			label: 'Balance',
			align: 'right',
			render: (row) => <span className='fw-bold text-success'>{formatCurrency(row.balance || 0)}</span>,
		},
		{
			key: 'issuedToCustomerName',
			label: 'Issued To',
			render: (row) => <span>{row.issuedToCustomerName || '—'}</span>,
		},
		{
			key: 'soldOnOrderNo',
			label: 'Sold On',
			render: (row) => <span className='text-muted'>{row.soldOnOrderNo || 'Back office'}</span>,
		},
		{
			key: 'issuedByName',
			label: 'Issued By',
			render: (row) => <span className='text-muted'>{row.issuedByName || '—'}</span>,
		},
		{
			key: 'expiresAt',
			label: 'Expires',
			render: (row) => <span className='text-muted small'>{row.expiresAt ? dateOnly(row.expiresAt) : 'Never'}</span>,
		},
		{
			key: 'createdAt',
			label: 'Issued',
			render: (row) => <span className='text-muted small'>{dateOnly(row.createdAt)}</span>,
		},
		{
			key: 'actions',
			label: '',
			align: 'right' as any,
			sortable: false,
			searchable: false,
			render: (row) => (
				<DataTableActionMenu
					actions={[
						{
							key: 'history',
							label: 'View Movements',
							icon: 'ti ti-eye',
							className: 'text-info',
							onClick: () => openHistory(row),
						},
						...(canManage && row.status === 'ACTIVE'
							? [
									{
										key: 'void',
										label: 'Void Card',
										icon: 'ti ti-ban',
										className: 'text-danger',
										onClick: () => {
											setVoidCard(row);
											setIsVoidOpen(true);
										},
									},
								]
							: []),
					]}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Gift Card Log' requiredPermission={PERMISSIONS.SHOW_CUSTOMER_INSIGHTS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='CardGiftcard' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Gift Card Log</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canManage && (
						<Button color='primary' icon='Add' onClick={() => setIsIssueOpen(true)}>
							Issue Gift Card
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<div className='mb-3 d-flex flex-wrap justify-content-between align-items-end gap-3'>
							<div className='btn-group' role='group' aria-label='Filter by card status'>
								<Button
									size='sm'
									color={statusFilter === 'ALL' ? 'primary' : 'light'}
									isLight={statusFilter !== 'ALL'}
									onClick={() => setStatusFilter('ALL')}>
									All ({cards.length})
								</Button>
								{(Object.keys(STATUS_LABELS) as GiftCardStatus[]).map((status) => (
									<Button
										key={status}
										size='sm'
										color={statusFilter === status ? 'primary' : 'light'}
										isLight={statusFilter !== status}
										onClick={() => setStatusFilter(status)}>
										{STATUS_LABELS[status]} ({countFor(status)})
									</Button>
								))}
							</div>
							<div className='d-flex flex-wrap gap-4 text-end'>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Active Cards</div>
									<div className='fs-5 fw-bold'>{totals.active}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Total Issued</div>
									<div className='fs-5 fw-bold'>{formatCurrency(totals.issued)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Redeemed</div>
									<div className='fs-5 fw-bold text-danger'>-{formatCurrency(totals.redeemed)}</div>
								</div>
								<div>
									<div className='text-muted small text-uppercase fw-semibold'>Outstanding</div>
									<div className='fs-5 fw-bold text-success'>{formatCurrency(totals.outstanding)}</div>
								</div>
							</div>
						</div>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={visibleCards}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='gift-cards'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<GiftCardHistoryModal card={viewCard} isOpen={isHistoryOpen} setIsOpen={setIsHistoryOpen} />
			<VoidGiftCardModal card={voidCard} isOpen={isVoidOpen} setIsOpen={setIsVoidOpen} />
			<IssueGiftCardModal isOpen={isIssueOpen} setIsOpen={setIsIssueOpen} />
		</PageWrapper>
	);
};

export default GiftCardsPage;

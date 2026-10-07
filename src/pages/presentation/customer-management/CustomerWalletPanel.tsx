import React, { FC, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import Spinner from '../../../components/bootstrap/Spinner';
import Input from '../../../components/bootstrap/forms/Input';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import {
	WalletType,
	getWalletStatementApi,
	getWalletSummaryApi,
	issueStoreCreditApi,
	setCreditLimitApi,
	settleAccountApi,
} from '../../../api/wallet.api';

/**
 * The customer's Wallet tab — "where customer credits configured in front
 * end". Until this existed the backend could issue store credit, grant an
 * account (credit limit) and take account payments, and wallet.api.ts had
 * the calls, but no screen used them: balances were read-only and a customer
 * could only ever get credit through a direct API call.
 * <p>
 * Reading needs customer-insights-view (the tab itself is only shown with
 * it); the three actions need customer-wallet-manage and are simply not
 * rendered without it — the backend enforces the same rule regardless.
 */

/** Colour by what the movement did to the balance. */
const entryColor = (entryType: string): any =>
	({
		ISSUE: 'success',
		SETTLE: 'success',
		SPEND: 'warning',
		CHARGE: 'danger',
		EXPIRE: 'danger',
		ADJUST: 'info',
		REVERSE: 'dark',
	})[entryType] ?? 'secondary';

const entryLabel: Record<string, string> = {
	ISSUE: 'Credit issued',
	SPEND: 'Spent on a sale',
	EXPIRE: 'Expired',
	CHARGE: 'Charged to account',
	SETTLE: 'Payment received',
	ADJUST: 'Manual adjustment',
	REVERSE: 'Reversed',
};

const toAmount = (value: number | ''): number => (value === '' ? 0 : Number(value));

const amountChange =
	(setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setter(e.target.value === '' ? '' : Number(e.target.value));

const CustomerWalletPanel: FC<{ customerId: string }> = ({ customerId }) => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canManage = hasPermission(PERMISSIONS.MANAGE_CUSTOMER_WALLET);

	const [statementWallet, setStatementWallet] = useState<WalletType>('STORE_CREDIT');
	const [creditAmount, setCreditAmount] = useState<number | ''>('');
	const [creditNote, setCreditNote] = useState('');
	const [limitAmount, setLimitAmount] = useState<number | ''>('');
	const [settleAmount, setSettleAmount] = useState<number | ''>('');
	const [settleNote, setSettleNote] = useState('');

	const { data: wallet, isLoading: isLoadingWallet } = useQuery({
		queryKey: ['walletSummary', Number(customerId)],
		queryFn: () => getWalletSummaryApi(customerId),
		enabled: !!customerId,
	});

	const { data: statement, isLoading: isLoadingStatement } = useQuery({
		queryKey: ['walletStatement', customerId, statementWallet],
		queryFn: () => getWalletStatementApi(customerId, statementWallet),
		enabled: !!customerId,
	});

	// Every action moves a balance the summary strip, the statement, the
	// customer's 360 header and the POS checkout all read.
	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['walletSummary'] });
		queryClient.invalidateQueries({ queryKey: ['walletStatement', customerId] });
		queryClient.invalidateQueries({ queryKey: ['customer-summary'] });
	};

	const onError = (fallback: string) => (e: unknown) =>
		showNotification('Error', getApiErrorMessage(e, fallback), 'danger');

	const issueMutation = useMutation({
		mutationFn: () =>
			issueStoreCreditApi(customerId, { amount: toAmount(creditAmount), note: creditNote.trim() }),
		onSuccess: () => {
			refresh();
			setCreditAmount('');
			setCreditNote('');
			setStatementWallet('STORE_CREDIT');
			showNotification('Store credit issued', '', 'success');
		},
		onError: onError('Could not issue store credit'),
	});

	const limitMutation = useMutation({
		mutationFn: () => setCreditLimitApi(customerId, toAmount(limitAmount)),
		onSuccess: () => {
			refresh();
			setLimitAmount('');
			showNotification('Credit limit updated', '', 'success');
		},
		onError: onError('Could not update the credit limit'),
	});

	const settleMutation = useMutation({
		mutationFn: () =>
			settleAccountApi(customerId, { amount: toAmount(settleAmount), note: settleNote.trim() }),
		onSuccess: () => {
			refresh();
			setSettleAmount('');
			setSettleNote('');
			setStatementWallet('ON_ACCOUNT');
			showNotification('Account payment recorded', '', 'success');
		},
		onError: onError('Could not record the payment'),
	});

	if (isLoadingWallet) {
		return (
			<div className='text-center py-5'>
				<Spinner color='primary' />
				<p className='mt-2 text-muted'>Loading wallet...</p>
			</div>
		);
	}

	const owes = wallet?.accountBalance ?? 0;

	return (
		<div className='mt-3'>
			<div className='row g-3 mb-4'>
				<div className='col-6 col-md-3'>
					<div className='bg-light rounded-3 p-3 text-center h-100'>
						<div className='text-muted small text-uppercase fw-semibold mb-1'>Store Credit</div>
						<div className='fs-5 fw-bold text-success'>
							{formatCurrency(wallet?.storeCreditBalance ?? 0)}
						</div>
					</div>
				</div>
				<div className='col-6 col-md-3'>
					<div className='bg-light rounded-3 p-3 text-center h-100'>
						<div className='text-muted small text-uppercase fw-semibold mb-1'>Owes on Account</div>
						<div className={`fs-5 fw-bold ${owes > 0 ? 'text-danger' : ''}`}>{formatCurrency(owes)}</div>
					</div>
				</div>
				<div className='col-6 col-md-3'>
					<div className='bg-light rounded-3 p-3 text-center h-100'>
						<div className='text-muted small text-uppercase fw-semibold mb-1'>Credit Limit</div>
						<div className='fs-5 fw-bold'>
							{wallet?.hasAccountFacility ? formatCurrency(wallet.creditLimit) : 'No account'}
						</div>
					</div>
				</div>
				<div className='col-6 col-md-3'>
					<div className='bg-light rounded-3 p-3 text-center h-100'>
						<div className='text-muted small text-uppercase fw-semibold mb-1'>Available Credit</div>
						<div className='fs-5 fw-bold'>{formatCurrency(wallet?.availableCredit ?? 0)}</div>
					</div>
				</div>
			</div>

			{canManage && (
				<div className='row g-3 mb-4'>
					<div className='col-lg-4'>
						<div className='border rounded p-3 h-100'>
							<div className='fw-bold mb-1'>
								<Icon icon='AccountBalanceWallet' className='me-1' />
								Issue store credit
							</div>
							<div className='text-muted small mb-3'>
								A refund taken as credit, or a goodwill gesture. Spendable at the till.
							</div>
							<Input
								name='creditAmount'
								type='number'
								min={0}
								placeholder='Amount'
								className='mb-2'
								value={creditAmount}
								onChange={amountChange(setCreditAmount)}
							/>
							<Input
								name='creditNote'
								placeholder='Reason (required)'
								className='mb-2'
								value={creditNote}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreditNote(e.target.value)}
							/>
							<Button
								color='primary'
								className='w-100'
								isDisable={toAmount(creditAmount) <= 0 || !creditNote.trim() || issueMutation.isPending}
								onClick={() => issueMutation.mutate()}>
								{issueMutation.isPending ? 'Saving...' : 'Issue credit'}
							</Button>
						</div>
					</div>

					<div className='col-lg-4'>
						<div className='border rounded p-3 h-100'>
							<div className='fw-bold mb-1'>
								<Icon icon='AccountBalance' className='me-1' />
								Credit limit
							</div>
							<div className='text-muted small mb-3'>
								How much this customer may owe at once. Zero withdraws the account.
							</div>
							<Input
								name='limitAmount'
								type='number'
								min={0}
								placeholder={`Current: ${formatCurrency(wallet?.creditLimit ?? 0)}`}
								className='mb-2'
								value={limitAmount}
								onChange={amountChange(setLimitAmount)}
							/>
							<Button
								color='primary'
								className='w-100'
								isDisable={limitAmount === '' || toAmount(limitAmount) < 0 || limitMutation.isPending}
								onClick={() => limitMutation.mutate()}>
								{limitMutation.isPending ? 'Saving...' : 'Set limit'}
							</Button>
						</div>
					</div>

					<div className='col-lg-4'>
						<div className='border rounded p-3 h-100'>
							<div className='fw-bold mb-1'>
								<Icon icon='Payments' className='me-1' />
								Record account payment
							</div>
							<div className='text-muted small mb-3'>
								Money received against what they owe ({formatCurrency(owes)}).
							</div>
							<Input
								name='settleAmount'
								type='number'
								min={0}
								placeholder='Amount'
								className='mb-2'
								value={settleAmount}
								onChange={amountChange(setSettleAmount)}
							/>
							<Input
								name='settleNote'
								placeholder='Note, e.g. cash / receipt no (required)'
								className='mb-2'
								value={settleNote}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettleNote(e.target.value)}
							/>
							<Button
								color='primary'
								className='w-100'
								isDisable={
									toAmount(settleAmount) <= 0 ||
									owes <= 0 ||
									!settleNote.trim() ||
									settleMutation.isPending
								}
								onClick={() => settleMutation.mutate()}>
								{settleMutation.isPending ? 'Saving...' : 'Record payment'}
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className='d-flex align-items-center justify-content-between mb-2'>
				<h6 className='fw-bold mb-0'>Statement</h6>
				<div className='btn-group' role='group' aria-label='Which wallet'>
					<Button
						size='sm'
						color={statementWallet === 'STORE_CREDIT' ? 'primary' : 'light'}
						isLight={statementWallet !== 'STORE_CREDIT'}
						onClick={() => setStatementWallet('STORE_CREDIT')}>
						Store credit
					</Button>
					<Button
						size='sm'
						color={statementWallet === 'ON_ACCOUNT' ? 'primary' : 'light'}
						isLight={statementWallet !== 'ON_ACCOUNT'}
						onClick={() => setStatementWallet('ON_ACCOUNT')}>
						Account
					</Button>
				</div>
			</div>

			{isLoadingStatement ? (
				<div className='text-center py-4'>
					<Spinner color='primary' />
				</div>
			) : statement && statement.length > 0 ? (
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
							{statement.map((entry) => (
								<tr key={entry.id}>
									<td className='text-muted small'>
										{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
									</td>
									<td>
										<Badge color={entryColor(entry.entryType)} isLight>
											{entryLabel[entry.entryType] ?? entry.entryType}
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
				<div className='text-center py-4 text-muted'>
					No {statementWallet === 'STORE_CREDIT' ? 'store credit' : 'account'} movements yet.
				</div>
			)}
		</div>
	);
};

export default CustomerWalletPanel;

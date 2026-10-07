import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Spinner from '../../../components/bootstrap/Spinner';
import Input from '../../../components/bootstrap/forms/Input';
import showNotification from '../../../components/extras/showNotification';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import {
	Customer,
	getCustomerSummaryApi,
	quickCreateCustomerApi,
	searchCustomersForPosApi,
} from '../../../api/customers.api';

interface Props {
	customer: Customer | null;
	onSelect: (customer: Customer | null) => void;
	/**
	 * True when the customer came from a Sew & Sell order rather than being
	 * chosen here. The order owns it, so it is shown but not changeable.
	 */
	locked?: boolean;
	/**
	 * False on a made-to-order sale. Loyalty is ready-made only for now, so
	 * the bar says so rather than showing a points balance next to a sale
	 * that will not add to it.
	 */
	earnsLoyalty?: boolean;
}

const fullName = (c: Customer) =>
	`${c.first_name ?? c.firstName ?? ''} ${c.last_name ?? c.lastName ?? ''}`.trim() ||
	(c.customer_code ?? c.customerCode ?? 'Customer');

/**
 * Attaches a customer to the sale in progress.
 * <p>
 * Without this, a ready-made sale goes through with nobody on it — which
 * means no points earned, no purchase history, and nothing to show the
 * cashier about who they are serving. It is the piece that connects the
 * customer module to the till.
 *
 * Deliberately small and keyboard-first: this sits in the cashier's way on
 * every single sale, so the whole interaction is one field, and a walk-in is
 * served by simply not touching it.
 */
const PosCustomerBar: React.FC<Props> = ({
	customer,
	onSelect,
	locked = false,
	earnsLoyalty = true,
}) => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canLookUp = hasPermission(PERMISSIONS.SHOW_CUSTOMER_INSIGHTS);
	const canQuickAdd = hasPermission(PERMISSIONS.QUICK_CREATE_CUSTOMER);

	const [search, setSearch] = useState('');
	const [debounced, setDebounced] = useState('');
	const [isAdding, setIsAdding] = useState(false);
	const [newFirstName, setNewFirstName] = useState('');
	const [newLastName, setNewLastName] = useState('');
	const [newPhone, setNewPhone] = useState('');
	const [newSmsOptIn, setNewSmsOptIn] = useState(false);

	// A cashier types a phone number a digit at a time; firing a search on
	// every keystroke would put ten requests behind one customer.
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(search.trim()), 300);
		return () => clearTimeout(timer);
	}, [search]);

	const { data: results = [], isFetching } = useQuery({
		queryKey: ['posCustomerSearch', debounced],
		queryFn: () => searchCustomersForPosApi(debounced),
		enabled: canLookUp && !customer && debounced.length >= 2,
	});

	// Loaded only once somebody is attached — tier, points and credit are what
	// the cashier can act on.
	const { data: summary } = useQuery({
		queryKey: ['customer-summary', customer?.id],
		queryFn: () => getCustomerSummaryApi(customer!.id),
		enabled: canLookUp && !!customer,
	});

	const quickAddMutation = useMutation({
		mutationFn: quickCreateCustomerApi,
		onSuccess: (created) => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			resetAddForm();
			setSearch('');
			onSelect(created);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Customer Added</>,
				`${fullName(created)} is attached to this sale.`,
				'success',
			);
		},
		onError: (e) =>
			showNotification('Could not add customer', getApiErrorMessage(e, 'Failed to add'), 'danger'),
	});

	const resetAddForm = () => {
		setIsAdding(false);
		setNewFirstName('');
		setNewLastName('');
		setNewPhone('');
		setNewSmsOptIn(false);
	};

	// If the typed search looks like a phone number, offer it as the new
	// customer's number — that is almost always what was being typed.
	const looksLikePhone = useMemo(() => /^[0-9+\-\s]{6,}$/.test(debounced), [debounced]);

	const startAdding = () => {
		setIsAdding(true);
		if (looksLikePhone) {
			setNewPhone(debounced);
		} else {
			setNewFirstName(debounced);
		}
	};

	if (!canLookUp) {
		return null;
	}

	// ─── Attached ─────────────────────────────────────────────────────────
	if (customer) {
		return (
			<div
				className='d-flex align-items-center flex-wrap gap-2'
				style={{
					marginTop: 14,
					padding: '10px 12px',
					background: '#F4F1EB',
					borderRadius: 10,
				}}>
				<Icon icon='AccountCircle' size='lg' style={{ color: '#1F6F4C' }} />
				<div style={{ minWidth: 0, flex: 1 }}>
					<div className='d-flex align-items-center gap-2 flex-wrap'>
						<span style={{ fontWeight: 600, fontSize: 14, color: '#1A1917' }}>
							{fullName(customer)}
						</span>
						{summary?.loyaltyTierName && (
							<Badge color='warning' isLight>
								{summary.loyaltyTierName}
							</Badge>
						)}
					</div>
					<div
						className='d-flex align-items-center flex-wrap gap-3'
						style={{ fontSize: 12, color: '#6B6862', marginTop: 2 }}>
						{customer.phone && <span>{customer.phone}</span>}
						{earnsLoyalty && summary && summary.pointsBalance > 0 && (
							<span>{summary.pointsBalance} points</span>
						)}
						{summary && summary.storeCreditBalance > 0 && (
							<span style={{ color: '#1F6F4C', fontWeight: 600 }}>
								{formatCurrency(summary.storeCreditBalance)} credit
							</span>
						)}
						{summary && summary.accountBalance > 0 && (
							<span style={{ color: '#B5502E', fontWeight: 600 }}>
								owes {formatCurrency(summary.accountBalance)}
							</span>
						)}
					</div>
				</div>
				{!locked && (
					<Button
						size='sm'
						color='light'
						icon='Close'
						onClick={() => onSelect(null)}
						title='Remove customer from this sale'
					/>
				)}
				{!earnsLoyalty && (
					<div
						className='w-100'
						style={{ fontSize: 11, color: '#6B6862', marginTop: 2 }}>
						Points are earned on ready-made items only — this sale will not add any.
					</div>
				)}
			</div>
		);
	}

	// ─── Quick add ────────────────────────────────────────────────────────
	if (isAdding) {
		const canSave = newFirstName.trim().length > 0 && newPhone.trim().length > 0;
		return (
			<div
				style={{
					marginTop: 14,
					padding: '12px',
					background: '#F4F1EB',
					borderRadius: 10,
				}}>
				<div className='d-flex align-items-center justify-content-between mb-2'>
					<span style={{ fontWeight: 600, fontSize: 13, color: '#1A1917' }}>
						New customer
					</span>
					<Button size='sm' color='light' icon='Close' onClick={resetAddForm} />
				</div>
				<div className='row g-2'>
					<div className='col-6'>
						<Input
							name='newFirstName'
							placeholder='First name'
							value={newFirstName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setNewFirstName(e.target.value)
							}
						/>
					</div>
					<div className='col-6'>
						<Input
							name='newLastName'
							placeholder='Last name (optional)'
							value={newLastName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setNewLastName(e.target.value)
							}
						/>
					</div>
					<div className='col-12'>
						<Input
							name='newPhone'
							placeholder='Phone number'
							value={newPhone}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setNewPhone(e.target.value)
							}
						/>
					</div>
					<div className='col-12'>
						<div className='form-check'>
							<input
								id='posNewSmsOptIn'
								type='checkbox'
								className='form-check-input'
								checked={newSmsOptIn}
								onChange={(e) => setNewSmsOptIn(e.target.checked)}
							/>
							<label
								className='form-check-label'
								htmlFor='posNewSmsOptIn'
								style={{ fontSize: 12 }}>
								Happy to receive SMS offers
							</label>
						</div>
					</div>
					<div className='col-12'>
						<Button
							color='primary'
							className='w-100'
							isDisable={!canSave || quickAddMutation.isPending}
							onClick={() =>
								quickAddMutation.mutate({
									firstName: newFirstName.trim(),
									lastName: newLastName.trim() || undefined,
									phone: newPhone.trim(),
									smsOptIn: newSmsOptIn,
								})
							}>
							{quickAddMutation.isPending ? 'Adding...' : 'Add & attach'}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// ─── Searching ────────────────────────────────────────────────────────
	return (
		<div style={{ marginTop: 14, position: 'relative' }}>
			<div className='d-flex align-items-center gap-2'>
				<Icon icon='PersonSearch' style={{ color: '#6B6862' }} />
				<Input
					name='posCustomerSearch'
					placeholder='Attach customer — phone or name (optional)'
					value={search}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
				/>
				{isFetching && <Spinner isSmall />}
			</div>

			{debounced.length >= 2 && (
				<div
					style={{
						position: 'absolute',
						zIndex: 20,
						left: 0,
						right: 0,
						marginTop: 4,
						background: '#FFFFFF',
						border: '1px solid #E3DED4',
						borderRadius: 10,
						boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
						maxHeight: 260,
						overflowY: 'auto',
					}}>
					{results.map((result) => (
						<button
							key={result.id}
							type='button'
							className='d-block w-100 text-start border-0 bg-transparent px-3 py-2'
							style={{ cursor: 'pointer' }}
							onClick={() => {
								onSelect(result);
								setSearch('');
							}}>
							<div style={{ fontWeight: 600, fontSize: 13 }}>{fullName(result)}</div>
							<div style={{ fontSize: 12, color: '#6B6862' }}>
								{result.phone || '—'}
								{result.customer_code || result.customerCode
									? ` · ${result.customer_code ?? result.customerCode}`
									: ''}
							</div>
						</button>
					))}

					{!isFetching && results.length === 0 && (
						<div className='px-3 py-2' style={{ fontSize: 13, color: '#6B6862' }}>
							No customer found.
						</div>
					)}

					{canQuickAdd && (
						<button
							type='button'
							className='d-block w-100 text-start border-0 px-3 py-2'
							style={{
								cursor: 'pointer',
								background: '#F4F1EB',
								borderTop: '1px solid #E3DED4',
								fontWeight: 600,
								fontSize: 13,
								color: '#1F6F4C',
							}}
							onClick={startAdding}>
							<Icon icon='PersonAdd' size='sm' className='me-1' />
							Add "{debounced}" as a new customer
						</button>
					)}
				</div>
			)}
		</div>
	);
};

export default PosCustomerBar;

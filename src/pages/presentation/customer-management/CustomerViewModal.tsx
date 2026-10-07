import React, { FC, useState } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import {
	Customer,
	getCustomerFavoriteItemsApi,
	getCustomerMeasurementsApi,
	getCustomerOrdersApi,
	getCustomerSummaryApi,
} from '../../../api/customers.api';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import Nav, { NavItem } from '../../../components/bootstrap/Nav';
import { useQuery } from '@tanstack/react-query';
import Spinner from '../../../components/bootstrap/Spinner';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import { formatCurrency } from '../../../helpers/currency';
import {
	LoyaltyLedgerEntry,
	adjustLoyaltyPointsApi,
	getLoyaltyLedgerApi,
} from '../../../api/loyalty.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Input from '../../../components/bootstrap/forms/Input';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import CustomerWalletPanel from './CustomerWalletPanel';

const getCustomerCode = (customer: Customer) =>
	customer.customer_code ?? customer.customerCode ?? '—';
const getCustomerFirstName = (customer: Customer) =>
	customer.first_name ?? customer.firstName ?? '';
const getCustomerLastName = (customer: Customer) => customer.last_name ?? customer.lastName ?? '';
const getCustomerFullName = (customer: Customer) =>
	`${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`.trim() || '—';
const getCustomerDateOfBirth = (customer: Customer) =>
	(customer.date_of_birth ?? customer.dateOfBirth ?? '').slice(0, 10);

interface ICustomerViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	customers: Customer[];
}

/** Reads as an em dash rather than "0" when a customer has never bought anything. */
const money = (value: number | null | undefined) =>
	value === null || value === undefined ? '—' : formatCurrency(value);

const shortDate = (value: string | null | undefined) =>
	value ? new Date(value).toLocaleDateString() : '—';

/** Colour by what the movement did: green added, red took away, grey neutral. */
const ledgerColor = (entryType: string): any =>
	({
		EARN: 'success',
		BONUS: 'success',
		REDEEM: 'warning',
		EXPIRE: 'danger',
		REVERSE: 'dark',
		ADJUST: 'info',
	})[entryType] ?? 'secondary';

const orderStatusColor = (status: string): any =>
	({
		PENDING: 'warning',
		CONFIRMED: 'primary',
		PROCESSING: 'info',
		READY: 'info',
		DELIVERED: 'success',
		CANCELLED: 'danger',
	})[status] ?? 'secondary';

const paymentStatusColor = (status: string): any =>
	({ UNPAID: 'danger', PARTIAL: 'warning', PAID: 'success', REFUNDED: 'dark' })[status] ??
	'secondary';

const CustomerViewModal: FC<ICustomerViewModalProps> = ({ id, isOpen, setIsOpen, customers }) => {
	const customer = customers.find((item) => item.id.toString() === id?.toString());
	const { hasPermission } = usePermission();
	const canSeeInsights = hasPermission(PERMISSIONS.SHOW_CUSTOMER_INSIGHTS);
	const [activeTab, setActiveTab] = useState<
		'profile' | 'measurements' | 'orders' | 'favorites' | 'loyalty' | 'wallet'
	>('profile');
	const queryClient = useQueryClient();
	const canAdjustPoints = hasPermission(PERMISSIONS.ADJUST_LOYALTY_POINTS);
	const [adjustPoints, setAdjustPoints] = useState<number | ''>('');
	const [adjustNote, setAdjustNote] = useState('');

	const { data: measurements, isLoading: isLoadingMeasurements } = useQuery({
		queryKey: ['customer-measurements', id],
		queryFn: () => getCustomerMeasurementsApi(id!),
		enabled: !!id && activeTab === 'measurements',
	});

	// The spend strip sits above the tabs, so it loads as soon as the modal
	// opens rather than waiting for a tab click — it's the first thing
	// someone looks at.
	const { data: summary } = useQuery({
		queryKey: ['customer-summary', id],
		queryFn: () => getCustomerSummaryApi(id!),
		enabled: !!id && isOpen && canSeeInsights,
	});

	const { data: orders, isLoading: isLoadingOrders } = useQuery({
		queryKey: ['customer-orders', id],
		queryFn: () => getCustomerOrdersApi(id!),
		enabled: !!id && activeTab === 'orders' && canSeeInsights,
	});

	const { data: favorites, isLoading: isLoadingFavorites } = useQuery({
		queryKey: ['customer-favorites', id],
		queryFn: () => getCustomerFavoriteItemsApi(id!),
		enabled: !!id && activeTab === 'favorites' && canSeeInsights,
	});

	const { data: ledger, isLoading: isLoadingLedger } = useQuery({
		queryKey: ['customer-loyalty-ledger', id],
		queryFn: () => getLoyaltyLedgerApi(id!),
		enabled: !!id && activeTab === 'loyalty' && canSeeInsights,
	});

	const adjustMutation = useMutation({
		mutationFn: (payload: { points: number; note: string }) =>
			adjustLoyaltyPointsApi(id!, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-loyalty-ledger', id] });
			queryClient.invalidateQueries({ queryKey: ['customer-summary', id] });
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			setAdjustPoints('');
			setAdjustNote('');
		},
	});

	if (!customer && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='xl'
			titleId='customer-view-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 bg-light'>
				<ModalTitle id='customer-view-modal'>
					<div className='d-flex align-items-center'>
						<Icon icon='ContactPage' size='2x' className='me-2 text-primary' />
						<div>
							<h5 className='mb-0 fw-bold'>Customer Details</h5>
							<small className='text-muted'>View complete customer information</small>
						</div>
					</div>
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-5 py-4'>
				{/* Lifetime spend at a glance — "total spending right from the
				    POS". Computed live from the sales orders, so it can't go
				    stale against the cached columns on the customer row. */}
				{canSeeInsights && summary && (
					<div className='row g-3 mb-4'>
						<div className='col-6 col-md-3'>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>
									Total Spend
								</div>
								<div className='fs-5 fw-bold text-success'>
									{money(summary.totalSpend)}
								</div>
							</div>
						</div>
						<div className='col-6 col-md-3'>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>
									Visits
								</div>
								<div className='fs-5 fw-bold'>{summary.visitCount}</div>
							</div>
						</div>
						<div className='col-6 col-md-3'>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>
									Avg Order
								</div>
								<div className='fs-5 fw-bold'>
									{money(summary.averageOrderValue)}
								</div>
							</div>
						</div>
						<div className='col-6 col-md-3'>
							<div className='bg-light rounded-3 p-3 text-center h-100'>
								<div className='text-muted small text-uppercase fw-semibold mb-1'>
									Last Visit
								</div>
								<div className='fs-5 fw-bold'>{shortDate(summary.lastVisitAt)}</div>
								{summary.firstVisitAt && (
									<div className='text-muted' style={{ fontSize: 11 }}>
										since {shortDate(summary.firstVisitAt)}
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				<Nav pills className='mb-4 border-bottom pb-3'>
					<NavItem isActive={activeTab === 'profile'}>
						<span
							onClick={() => setActiveTab('profile')}
							className='cursor-pointer fw-bold px-4 py-2'>
							Profile
						</span>
					</NavItem>
					<NavItem isActive={activeTab === 'measurements'}>
						<span
							onClick={() => setActiveTab('measurements')}
							className='cursor-pointer fw-bold px-4 py-2'>
							Measurements
						</span>
					</NavItem>
					{canSeeInsights && (
						<>
							<NavItem isActive={activeTab === 'orders'}>
								<span
									onClick={() => setActiveTab('orders')}
									className='cursor-pointer fw-bold px-4 py-2'>
									Order History
								</span>
							</NavItem>
							<NavItem isActive={activeTab === 'favorites'}>
								<span
									onClick={() => setActiveTab('favorites')}
									className='cursor-pointer fw-bold px-4 py-2'>
									Favourite Items
								</span>
							</NavItem>
							<NavItem isActive={activeTab === 'loyalty'}>
								<span
									onClick={() => setActiveTab('loyalty')}
									className='cursor-pointer fw-bold px-4 py-2'>
									Loyalty
								</span>
							</NavItem>
							<NavItem isActive={activeTab === 'wallet'}>
								<span
									onClick={() => setActiveTab('wallet')}
									className='cursor-pointer fw-bold px-4 py-2'>
									Wallet
								</span>
							</NavItem>
						</>
					)}
				</Nav>

				{customer && activeTab === 'profile' && (
					<div className='row g-4'>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>
								Customer Code
							</p>
							<p className='fs-6 fw-bold mb-0 text-dark'>
								{getCustomerCode(customer)}
							</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Name</p>
							<p className='fs-5 fw-bold mb-0 text-dark'>
								{getCustomerFullName(customer)}
							</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Status</p>
							<Badge
								color={customer.status === 'ACTIVE' ? 'success' : 'danger'}
								isLight
								className='fs-6 py-1 px-3 mt-1'>
								{customer.status}
							</Badge>
						</div>

						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Email</p>
							<div className='d-flex align-items-center'>
								<Icon icon='Email' className='me-2 text-muted' />
								<p className='fs-6 mb-0'>{customer.email || '—'}</p>
							</div>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Phone</p>
							<div className='d-flex align-items-center'>
								<Icon icon='Phone' className='me-2 text-muted' />
								<p className='fs-6 mb-0'>{customer.phone || '—'}</p>
							</div>
						</div>

						<div className='col-12 mt-4'>
							<h6 className='fw-bold border-bottom pb-2'>Address Information</h6>
						</div>

						<div className='col-12 mt-2'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>
								Street Address
							</p>
							<p className='fs-6 mb-0'>{customer.address || '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>City</p>
							<p className='fs-6 mb-0'>{customer.city || '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>
								Date of Birth
							</p>
							<p className='fs-6 mb-0'>{getCustomerDateOfBirth(customer) || '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Gender</p>
							<p className='fs-6 mb-0'>{customer.gender || '—'}</p>
						</div>

						{/* Shopping preferences — a salesperson's notes on what
						    this customer likes, so they can be served without
						    opening the edit form. Only shown to roles that can
						    see insights, same as the spend strip. */}
						{canSeeInsights && summary && (
							<>
								<div className='col-12 mt-4'>
									<h6 className='fw-bold border-bottom pb-2'>
										Shopping Preferences
									</h6>
								</div>
								<div className='col-md-4'>
									<p className='text-muted mb-1 small text-uppercase fw-bold'>
										Preferred Sizes
									</p>
									<p className='fs-6 mb-0'>{summary.preferredSizes || '—'}</p>
								</div>
								<div className='col-md-4'>
									<p className='text-muted mb-1 small text-uppercase fw-bold'>
										Preferred Categories
									</p>
									<p className='fs-6 mb-0'>
										{summary.preferredCategories || '—'}
									</p>
								</div>
								<div className='col-md-4'>
									<p className='text-muted mb-1 small text-uppercase fw-bold'>
										Marketing Consent
									</p>
									<div className='d-flex gap-2 mt-1'>
										<Badge
											color={summary.smsOptIn ? 'success' : 'secondary'}
											isLight>
											SMS {summary.smsOptIn ? 'on' : 'off'}
										</Badge>
										<Badge
											color={summary.emailOptIn ? 'success' : 'secondary'}
											isLight>
											Email {summary.emailOptIn ? 'on' : 'off'}
										</Badge>
									</div>
								</div>
								{summary.preferenceNotes && (
									<div className='col-12'>
										<p className='text-muted mb-1 small text-uppercase fw-bold'>
											Preference Notes
										</p>
										<p className='fs-6 mb-0'>{summary.preferenceNotes}</p>
									</div>
								)}
							</>
						)}

						<div className='col-12 mt-4'>
							<h6 className='fw-bold border-bottom pb-2'>Additional Details</h6>
						</div>

						<div className='col-12 mt-2'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Notes</p>
							<div className='p-3 bg-light rounded text-dark'>
								{customer.notes || (
									<span className='text-muted fst-italic'>
										No notes available
									</span>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'measurements' && (
					<div className='mt-3'>
						{isLoadingMeasurements ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
								<p className='mt-2 text-muted'>Loading measurements...</p>
							</div>
						) : measurements && measurements.length > 0 ? (
							<div className='row g-4'>
								{measurements.map((measurement) => (
									<div key={measurement.id} className='col-md-6'>
										<Card className='shadow-sm h-100 border-0'>
											<CardBody>
												<div className='d-flex justify-content-between align-items-start mb-3'>
													<div>
														<h5 className='fw-bold mb-1 text-primary'>
															{measurement.productName}
														</h5>
														<small className='text-muted'>
															{measurement.measurementTypeName} • v
															{measurement.version}
														</small>
													</div>
													<Badge
														color={
															measurement.status === 'ACTIVE'
																? 'success'
																: 'warning'
														}
														isLight>
														{measurement.status}
													</Badge>
												</div>

												<div className='d-flex align-items-center text-muted small mt-4'>
													<Icon icon='Person' className='me-2' />
													<span>Taken by: {measurement.takenBy}</span>
												</div>
												<div className='d-flex align-items-center text-muted small mt-1'>
													<Icon icon='Event' className='me-2' />
													<span>
														Date:{' '}
														{new Date(
															measurement.createdAt,
														).toLocaleDateString()}
													</span>
												</div>
											</CardBody>
										</Card>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-5 text-muted'>
								<Icon icon='Straighten' size='3x' className='mb-3 text-light' />
								<h5>No Measurements Found</h5>
								<p>This customer does not have any recorded measurements yet.</p>
							</div>
						)}
					</div>
				)}

				{activeTab === 'orders' && (
					<div className='mt-3'>
						{isLoadingOrders ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
								<p className='mt-2 text-muted'>Loading order history...</p>
							</div>
						) : orders && orders.length > 0 ? (
							<div className='table-responsive'>
								<table className='table table-sm table-hover align-middle mb-0'>
									<thead className='table-light'>
										<tr>
											<th>Order No</th>
											<th>Date</th>
											<th>Showroom</th>
											<th className='text-center'>Items</th>
											<th className='text-center'>Status</th>
											<th className='text-center'>Payment</th>
											<th className='text-end'>Net Amount</th>
										</tr>
									</thead>
									<tbody>
										{orders.map((order) => (
											<tr key={order.id}>
												<td className='fw-bold text-primary'>
													{order.orderNo}
												</td>
												<td className='text-muted small'>
													{shortDate(order.createdAt)}
												</td>
												<td className='text-muted'>
													{order.showroomName || '—'}
												</td>
												<td className='text-center'>{order.itemCount}</td>
												<td className='text-center'>
													<Badge
														color={orderStatusColor(order.status)}
														isLight>
														{order.status}
													</Badge>
												</td>
												<td className='text-center'>
													<Badge
														color={paymentStatusColor(
															order.paymentStatus,
														)}
														isLight>
														{order.paymentStatus}
													</Badge>
												</td>
												<td className='text-end fw-bold'>
													{money(order.netAmount)}
													{/* "should show customer used 100 points
													    likewise" — same denormalized field as
													    the Sales Orders views (V89). */}
													{(order.pointsRedeemed ?? 0) > 0 && (
														<div className='text-muted small fw-normal'>
															<Icon
																icon='Stars'
																size='sm'
																className='me-1'
															/>
															{order.pointsRedeemed} pts redeemed
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='text-center py-5 text-muted'>
								<Icon icon='Receipt' size='3x' className='mb-3 text-light' />
								<h5>No Purchases Yet</h5>
								<p>This customer has not bought anything so far.</p>
							</div>
						)}
					</div>
				)}

				{activeTab === 'favorites' && (
					<div className='mt-3'>
						{isLoadingFavorites ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
								<p className='mt-2 text-muted'>Loading favourite items...</p>
							</div>
						) : favorites && favorites.length > 0 ? (
							<>
								<p className='text-muted small mb-3'>
									What this customer buys most, by quantity — grouped per
									size and colour.
								</p>
								<div className='table-responsive'>
									<table className='table table-sm table-hover align-middle mb-0'>
										<thead className='table-light'>
											<tr>
												<th>Item</th>
												<th>Size / Colour</th>
												<th className='text-center'>Qty Bought</th>
												<th className='text-center'>Times</th>
												<th>Last Bought</th>
												<th className='text-end'>Spent</th>
											</tr>
										</thead>
										<tbody>
											{favorites.map((item, index) => (
												<tr key={item.variantId ?? `row-${index}`}>
													<td>
														<div className='fw-bold'>
															{item.productName || item.sku || '—'}
														</div>
														{item.sku && (
															<div className='text-muted small'>
																SKU: {item.sku}
															</div>
														)}
													</td>
													<td className='text-muted'>
														{[item.size, item.color]
															.filter(Boolean)
															.join(' / ') || '—'}
													</td>
													<td className='text-center fw-bold'>
														{item.totalQty}
													</td>
													<td className='text-center'>
														{item.timesBought}
													</td>
													<td className='text-muted small'>
														{shortDate(item.lastBoughtAt)}
													</td>
													<td className='text-end fw-bold'>
														{money(item.totalSpend)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						) : (
							<div className='text-center py-5 text-muted'>
								<Icon icon='Favorite' size='3x' className='mb-3 text-light' />
								<h5>No Favourites Yet</h5>
								<p>
									Favourites appear once this customer has bought stock items at
									the counter.
								</p>
							</div>
						)}
					</div>
				)}

				{/* Store credit, credit limit and account payments — see
				    CustomerWalletPanel. */}
				{activeTab === 'wallet' && id && canSeeInsights && (
					<CustomerWalletPanel customerId={id} />
				)}

				{activeTab === 'loyalty' && (
					<div className='mt-3'>
						{/* Balance first — it is the number anyone opening this
						    tab came to find. */}
						<div className='row g-3 mb-4'>
							<div className='col-6 col-md-3'>
								<div className='bg-light rounded-3 p-3 text-center h-100'>
									<div className='text-muted small text-uppercase fw-semibold mb-1'>
										Points
									</div>
									<div className='fs-4 fw-bold'>{summary?.pointsBalance ?? 0}</div>
								</div>
							</div>
							<div className='col-6 col-md-3'>
								<div className='bg-light rounded-3 p-3 text-center h-100'>
									<div className='text-muted small text-uppercase fw-semibold mb-1'>
										Tier
									</div>
									<div className='fs-5 fw-bold'>
										{summary?.loyaltyTierName || '—'}
									</div>
								</div>
							</div>
							<div className='col-6 col-md-3'>
								<div className='bg-light rounded-3 p-3 text-center h-100'>
									<div className='text-muted small text-uppercase fw-semibold mb-1'>
										Store Credit
									</div>
									<div className='fs-5 fw-bold text-success'>
										{money(summary?.storeCreditBalance)}
									</div>
								</div>
							</div>
							<div className='col-6 col-md-3'>
								<div className='bg-light rounded-3 p-3 text-center h-100'>
									<div className='text-muted small text-uppercase fw-semibold mb-1'>
										Owes on Account
									</div>
									<div
										className={`fs-5 fw-bold ${
											(summary?.accountBalance ?? 0) > 0 ? 'text-danger' : ''
										}`}>
										{money(summary?.accountBalance)}
									</div>
								</div>
							</div>
						</div>

						{canAdjustPoints && (
							<div className='border rounded p-3 mb-4'>
								<div className='fw-bold mb-1'>Manual adjustment</div>
								<div className='text-muted small mb-3'>
									The only way points move without a sale behind them, so the
									reason is required and is kept on the ledger for good.
								</div>
								<div className='row g-2 align-items-start'>
									<div className='col-md-3'>
										<Input
											name='adjustPoints'
											type='number'
											placeholder='e.g. 50 or -50'
											value={adjustPoints}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setAdjustPoints(
													e.target.value === ''
														? ''
														: Number(e.target.value),
												)
											}
										/>
									</div>
									<div className='col-md-7'>
										<Input
											name='adjustNote'
											placeholder='Reason (required)'
											value={adjustNote}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setAdjustNote(e.target.value)
											}
										/>
									</div>
									<div className='col-md-2'>
										<Button
											color='primary'
											className='w-100'
											isDisable={
												adjustPoints === '' ||
												Number(adjustPoints) === 0 ||
												!adjustNote.trim() ||
												adjustMutation.isPending
											}
											onClick={() =>
												adjustMutation.mutate({
													points: Number(adjustPoints),
													note: adjustNote.trim(),
												})
											}>
											{adjustMutation.isPending ? '...' : 'Apply'}
										</Button>
									</div>
								</div>
							</div>
						)}

						{isLoadingLedger ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
								<p className='mt-2 text-muted'>Loading points history...</p>
							</div>
						) : ledger && ledger.length > 0 ? (
							<div className='table-responsive'>
								<table className='table table-sm table-hover align-middle mb-0'>
									<thead className='table-light'>
										<tr>
											<th>Date</th>
											<th>What happened</th>
											<th className='text-end'>Points</th>
											<th className='text-end'>Unspent</th>
											<th>Expires</th>
											<th>Note</th>
										</tr>
									</thead>
									<tbody>
										{ledger.map((entry: LoyaltyLedgerEntry) => (
											<tr key={entry.id}>
												<td className='text-muted small'>
													{shortDate(entry.createdAt)}
												</td>
												<td>
													<Badge
														color={ledgerColor(entry.entryType)}
														isLight>
														{entry.entryType}
													</Badge>
													{entry.orderNo && (
														<div className='text-muted small'>
															{entry.orderNo}
														</div>
													)}
												</td>
												<td
													className={`text-end fw-bold ${
														entry.points >= 0
															? 'text-success'
															: 'text-danger'
													}`}>
													{entry.points > 0 ? '+' : ''}
													{entry.points}
												</td>
												<td className='text-end text-muted'>
													{entry.remainingPoints > 0
														? entry.remainingPoints
														: '—'}
												</td>
												<td className='text-muted small'>
													{shortDate(entry.expiresAt)}
												</td>
												<td className='small'>
													{entry.note || '—'}
													{entry.createdByName && (
														<div className='text-muted'>
															by {entry.createdByName}
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='text-center py-5 text-muted'>
								<Icon icon='CardGiftcard' size='3x' className='mb-3 text-light' />
								<h5>No Points Activity</h5>
								<p>Points appear here once this customer earns or spends any.</p>
							</div>
						)}
					</div>
				)}
			</ModalBody>
			<ModalFooter className='px-4 pb-4 border-0'>
				<Button color='primary' isLight onClick={() => setIsOpen(false)} className='px-4'>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default CustomerViewModal;

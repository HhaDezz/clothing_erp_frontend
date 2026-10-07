import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { getUsersApi, User } from '../../../api/users.api';
import { formatCurrency } from '../../../helpers/currency';

type Invoice = {
	id: number;
	invoiceNo: string;
	orderId: number;
	orderNo: string;
	cartId: number;
	cashierId: number;
	cashierName: string;
	grossTotal: number;
	totalDiscount: number;
	netTotal: number;
	notes: string;
	createdAt: string;
};

const getInvoiceOrderLabel = (invoice: Invoice, orders: Record<string, any>[] = []) =>
	invoice.orderNo || orders.find((order) => order.id === Number(invoice.orderId))?.orderNo || '—';

const getInvoiceCashierLabel = (invoice: Invoice, users: User[] = []) =>
	invoice.cashierName || users.find((user) => user.id === Number(invoice.cashierId))?.name || '—';

// "should show everywhere that sales order displays" — an invoice doesn't
// carry points itself (Invoice has no redemption fields, see the entity),
// but it links 1:1 to the sales order that does (V89), the same way
// getInvoiceOrderLabel above already resolves the order number.
const getInvoicePointsRedeemed = (invoice: Invoice, orders: Record<string, any>[] = []): number =>
	orders.find((order) => order.id === Number(invoice.orderId))?.pointsRedeemed || 0;

const getInvoiceRedeemedValue = (invoice: Invoice, orders: Record<string, any>[] = []): number =>
	orders.find((order) => order.id === Number(invoice.orderId))?.redeemedValue || 0;

const InvoiceViewModal = ({
	invoice,
	isOpen,
	setIsOpen,
	orders,
	users,
}: {
	invoice: Invoice | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	orders: Record<string, any>[];
	users: User[];
}) => {
	if (!invoice) return null;
	const pointsRedeemed = getInvoicePointsRedeemed(invoice, orders);
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='invoice-view-title'>
					<Icon icon='AccountBalanceWallet' className='me-2 text-success' />
					Invoice — {invoice.invoiceNo}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Invoice No
						</label>
						<p className='fw-bold mb-0'>{invoice.invoiceNo}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Order Ref
						</label>
						<p className='mb-0'>{getInvoiceOrderLabel(invoice, orders)}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Cashier
						</label>
						<p className='mb-0'>{getInvoiceCashierLabel(invoice, users)}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>Date</label>
						<p className='mb-0 text-muted'>
							{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '—'}
						</p>
					</div>
					<div className='col-12'>
						<hr className='my-1' />
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Gross Total</p>
						<h5 className='fw-bold'>{formatCurrency(invoice.grossTotal || 0)}</h5>
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Discount</p>
						<h5 className='fw-bold text-danger'>
							-{formatCurrency(invoice.totalDiscount || 0)}
						</h5>
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Net Total</p>
						<h5 className='fw-bold text-success'>
							{formatCurrency(invoice.netTotal || 0)}
						</h5>
					</div>
					{pointsRedeemed > 0 && (
						<div className='col-12'>
							<div className='alert alert-info d-flex align-items-center mb-0' role='alert'>
								<Icon icon='Stars' className='me-2' />
								<span>
									<strong>{pointsRedeemed} loyalty points</strong> redeemed on this
									sale — worth{' '}
									{formatCurrency(getInvoiceRedeemedValue(invoice, orders))}.
								</span>
							</div>
						</div>
					)}
					{invoice.notes && (
						<div className='col-12'>
							<label className='text-muted small fw-semibold text-uppercase'>
								Notes
							</label>
							<p className='mb-0'>{invoice.notes}</p>
						</div>
					)}
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const InvoicesPage = () => {
	const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const { data: users = [] } = useQuery<User[]>({
		queryKey: ['users'],
		queryFn: getUsersApi,
	});
	const { data: orders = [] } = useQuery<Record<string, any>[]>({
		queryKey: ['salesOrders'],
		queryFn: async () => {
			const res = await api.get('/sales-orders');
			return res.data.data ?? [];
		},
	});

	const {
		data: invoices = [],
		isLoading,
		error,
	} = useQuery<Invoice[]>({
		queryKey: ['invoices'],
		queryFn: async () => {
			const res = await api.get('/invoices');
			return res.data.data ?? [];
		},
	});

	const columns: DataTableColumn<Invoice>[] = [
		{
			key: 'invoiceNo',
			label: 'Invoice No',
			render: (row) => (
				<>
					<span className='fw-bold text-success'>{row.invoiceNo}</span>
					{/* "should show everywhere that sales order displays" (V89) —
					    resolved through the linked sales order, same as the order
					    number above. */}
					{getInvoicePointsRedeemed(row, orders) > 0 && (
						<>
							<br />
							<span className='text-muted small'>
								<Icon icon='Stars' size='sm' className='me-1' />
								{getInvoicePointsRedeemed(row, orders)} pts redeemed
							</span>
						</>
					)}
				</>
			),
		},
		{
			key: 'orderNo',
			label: 'Order Ref',
			render: (row) => <span>{getInvoiceOrderLabel(row, orders)}</span>,
		},
		{
			key: 'cashierName',
			label: 'Cashier',
			render: (row) => <span>{getInvoiceCashierLabel(row, users)}</span>,
		},
		{
			key: 'grossTotal',
			label: 'Gross',
			align: 'right',
			render: (row) => <span>{formatCurrency(row.grossTotal || 0)}</span>,
		},
		{
			key: 'totalDiscount',
			label: 'Discount',
			align: 'right',
			render: (row) => (
				<span className='text-danger'>-{formatCurrency(row.totalDiscount || 0)}</span>
			),
		},
		{
			key: 'netTotal',
			label: 'Net Total',
			align: 'right',
			render: (row) => (
				<span className='fw-bold text-success'>
					{formatCurrency(row.netTotal || 0)}
				</span>
			),
		},
		{
			key: 'createdAt',
			label: 'Date',
			render: (row) => (
				<span className='text-muted small'>
					{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
				</span>
			),
		},
	];

	return (
		<PageWrapper title='Invoices & Payments' requiredPermission={PERMISSIONS.SHOW_INVOICE}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='AccountBalanceWallet' size='2x' color='success' />
					<span className='fs-5 fw-bold ms-2'>Invoices &amp; Payments</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={[
										...columns,
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
															key: 'view',
															label: 'View Details',
															icon: 'ti ti-eye',
															className: 'text-info',
															onClick: () => {
																setViewInvoice(row);
																setIsViewModalOpen(true);
															},
														},
													]}
												/>
											),
										},
									]}
									data={invoices}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='invoices'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<InvoiceViewModal
				invoice={viewInvoice}
				isOpen={isViewModalOpen}
				setIsOpen={setIsViewModalOpen}
				orders={orders}
				users={users}
			/>
		</PageWrapper>
	);
};

export default InvoicesPage;

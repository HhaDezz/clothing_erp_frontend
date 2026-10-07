import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import CreateSewAndSellModal from './CreateSewAndSellModal';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import { Customer, getCustomersApi } from '../../../api/customers.api';
import SewAndSellPreviewModal, { SewAndSellPreviewData } from './SewAndSellPreviewModal';

type SewAndSellOrder = {
	id: number;
	orderNo: string;
	customerId: number;
	customerName?: string;
	customer?: {
		firstName?: string;
		first_name?: string;
		lastName?: string;
		last_name?: string;
		name?: string;
	};
	status: string;
	createdAt: string;
};

const customerFullName = (customer?: Customer | null) =>
	customer
		? `${customer.first_name ?? customer.firstName ?? ''} ${customer.last_name ?? customer.lastName ?? ''}`.trim()
		: '';

const getOrderCustomerName = (order: SewAndSellOrder, customers: Customer[] = []) => {
	const embeddedName =
		order.customerName ||
		order.customer?.name ||
		`${order.customer?.first_name ?? order.customer?.firstName ?? ''} ${
			order.customer?.last_name ?? order.customer?.lastName ?? ''
		}`.trim();
	return (
		embeddedName ||
		customerFullName(customers.find((customer) => customer.id === order.customerId)) ||
		'—'
	);
};

const SewAndSellViewModal = ({
	order,
	isOpen,
	setIsOpen,
	customers,
}: {
	order: SewAndSellOrder | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	customers: Customer[];
}) => {
	if (!order) return null;
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='sew-and-sell-view-title'>
					<Icon icon='Assignment' className='me-2 text-primary' />
					Order Details — {order.orderNo}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Order No
						</label>
						<p className='fw-bold mb-0'>{order.orderNo}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Status
						</label>
						<p className='mb-0'>
							<Badge
								color={
									order.status === 'CONFIRMED'
										? 'success'
										: order.status === 'CANCELLED'
											? 'danger'
											: 'warning'
								}
								isLight>
								{order.status}
							</Badge>
						</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Customer
						</label>
						<p className='fw-bold mb-0'>{getOrderCustomerName(order, customers)}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Created
						</label>
						<p className='mb-0 text-muted'>
							{new Date(order.createdAt).toLocaleDateString()}
						</p>
					</div>
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

const SewAndSellOrdersPage = () => {
	const { hasPermission } = usePermission();
	const queryClient = useQueryClient();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [previewOrder, setPreviewOrder] = useState<SewAndSellPreviewData | null>(null);
	const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
	const [viewOrder, setViewOrder] = useState<SewAndSellOrder | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const { data: customers = [] } = useQuery<Customer[]>({
		queryKey: ['customers'],
		queryFn: getCustomersApi,
	});

	const {
		data: orders = [],
		isLoading,
		error,
	} = useQuery<SewAndSellOrder[]>({
		queryKey: ['sewAndSellOrders'],
		queryFn: async () => {
			const res = await api.get('/sales-orders');
			return res.data.data ?? [];
		},
	});

	const confirmMutation = useMutation({
		mutationFn: async (id: number) => {
			const res = await api.put(`/sew-and-sell-orders/${id}/confirm`);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sewAndSellOrders'] });
		},
	});

	const columns: DataTableColumn<SewAndSellOrder>[] = [
		{
			key: 'orderNo',
			label: 'Order No',
			render: (row) => <span className='fw-bold text-primary'>{row.orderNo}</span>,
		},
		{
			key: 'customerId',
			label: 'Customer',
			render: (row) => <span>{getOrderCustomerName(row, customers)}</span>,
		},
		{
			key: 'createdAt',
			label: 'Date',
			render: (row) => (
				<span className='text-muted'>{new Date(row.createdAt).toLocaleDateString()}</span>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge
					color={
						row.status === 'CONFIRMED'
							? 'success'
							: row.status === 'CANCELLED'
								? 'danger'
								: 'warning'
					}
					isLight>
					{row.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper
			title='Sew & Sell Orders'
			requiredPermission={PERMISSIONS.SHOW_SEW_AND_SELL_ORDER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='ContentCut' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Sew &amp; Sell Orders</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{hasPermission(PERMISSIONS.CREATE_SEW_AND_SELL_ORDER) && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-new-sew-sell-order'
								icon='Add'
								color='primary'
								isLight
								onClick={() => setIsCreateModalOpen(true)}>
								New Custom Order
							</Button>
						</>
					)}
				</SubHeaderRight>
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
											align: 'right',
											sortable: false,
											searchable: false,
											render: (row) => (
												<DataTableActionMenu
													actions={[
														{
															key: 'view',
															label: 'View',
															icon: 'ti ti-eye',
															className: 'text-info',
															onClick: () => {
																setViewOrder(row);
																setIsViewModalOpen(true);
															},
														},
														...(row.status === 'PENDING'
															? [
																	{
																		key: 'confirm',
																		label: 'Confirm Order',
																		icon: 'ti ti-check',
																		className: 'text-success',
																		onClick: () => {
																			if (
																				window.confirm(
																					`Confirm order ${row.orderNo}?`,
																				)
																			) {
																				confirmMutation.mutate(
																					row.id,
																				);
																			}
																		},
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={orders}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='sew-and-sell-orders'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateSewAndSellModal
				isOpen={isCreateModalOpen}
				setIsOpen={setIsCreateModalOpen}
				onSuccess={(preview) => {
					setIsCreateModalOpen(false);
					setPreviewOrder(preview);
					setIsPreviewModalOpen(true);
					queryClient.invalidateQueries({ queryKey: ['sewAndSellOrders'] });
				}}
			/>

			<SewAndSellPreviewModal
				preview={previewOrder}
				isOpen={isPreviewModalOpen}
				setIsOpen={(isOpen) => {
					setIsPreviewModalOpen(isOpen);
					if (!isOpen) {
						setPreviewOrder(null);
					}
				}}
			/>

			<SewAndSellViewModal
				order={viewOrder}
				isOpen={isViewModalOpen}
				setIsOpen={setIsViewModalOpen}
				customers={customers}
			/>
		</PageWrapper>
	);
};

export default SewAndSellOrdersPage;

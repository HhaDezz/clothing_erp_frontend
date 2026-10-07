import React, { FC, useState } from 'react';
import { useFormik } from 'formik';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
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
import api from '../../../lib/axios';
import {
	confirmDeliveryDispatchApi,
	createDeliveryApi,
	DeliveryPayload,
	DeliveryResponse,
	getDeliveriesBySalesOrderApi,
	getProductionStagesByWorkOrderApi,
	getWorkOrdersApi,
	ProductionStageResponse,
	WorkOrderResponse,
} from '../../../api/production.api';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import {
	getLatestProductionStage,
	isSalesOrderDeliveryReady,
	isWorkOrderDeliveryReady,
} from '../../../utils/productionFlow';

type SalesOrder = {
	id?: number | string;
	salesOrderId?: number | string;
	sales_order_id?: number | string;
	orderId?: number | string;
	order_id?: number | string;
	orderNo?: string;
	order_no?: string;
	orderNumber?: string;
	salesOrderNo?: string;
	sales_order_no?: string;
	orderType?: string;
	order_type?: string;
	status?: string;
	customerName?: string;
	customer_name?: string;
	salesOrder?: Partial<SalesOrder>;
	sales_order?: Partial<SalesOrder>;
	order?: Partial<SalesOrder>;
	customer?: {
		firstName?: string;
		first_name?: string;
		lastName?: string;
		last_name?: string;
		name?: string;
		fullName?: string;
		full_name?: string;
	};
};
type Invoice = {
	id: number;
	invoiceNo?: string;
	invoice_no?: string;
	orderId?: number | string;
	order_id?: number | string;
	salesOrderId?: number | string;
	sales_order_id?: number | string;
	order?: { id?: number | string };
	salesOrder?: { id?: number | string };
	sales_order?: { id?: number | string };
};

const getApiList = <T,>(response: unknown): T[] => {
	let value = response;
	for (let depth = 0; depth < 4; depth += 1) {
		if (Array.isArray(value)) return value as T[];
		if (!value || typeof value !== 'object') return [];
		const row = value as Record<string, unknown>;
		for (const key of ['data', 'content', 'items', 'rows', 'salesOrders']) {
			if (Array.isArray(row[key])) return row[key] as T[];
		}
		if (!('data' in row)) return [];
		value = row.data;
	}
	return [];
};

const optionalNumber = (value: unknown) => {
	if (value === null || value === undefined || value === '') return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};

const getSalesOrderId = (order: SalesOrder) =>
	optionalNumber(order.id) ??
	optionalNumber(order.salesOrderId) ??
	optionalNumber(order.sales_order_id) ??
	optionalNumber(order.orderId) ??
	optionalNumber(order.order_id) ??
	optionalNumber(order.salesOrder?.id) ??
	optionalNumber(order.sales_order?.id) ??
	optionalNumber(order.order?.id) ??
	0;
const getSalesOrderNo = (order?: SalesOrder | null) => {
	const orderNo =
		order?.orderNo ??
		order?.order_no ??
		order?.orderNumber ??
		order?.salesOrderNo ??
		order?.sales_order_no ??
		order?.salesOrder?.orderNo ??
		order?.salesOrder?.order_no ??
		order?.salesOrder?.orderNumber ??
		order?.salesOrder?.salesOrderNo ??
		order?.salesOrder?.sales_order_no ??
		order?.sales_order?.orderNo ??
		order?.sales_order?.order_no ??
		order?.sales_order?.orderNumber ??
		order?.sales_order?.salesOrderNo ??
		order?.sales_order?.sales_order_no ??
		order?.order?.orderNo ??
		order?.order?.order_no;
	if (orderNo) return orderNo;
	const orderId = order ? getSalesOrderId(order) : 0;
	return orderId ? `Order ${orderId}` : 'Sales order';
};
const getSalesOrderCustomerName = (order?: SalesOrder | null) => {
	const customerName =
		order?.customerName ??
		order?.customer_name ??
		order?.salesOrder?.customerName ??
		order?.salesOrder?.customer_name ??
		order?.sales_order?.customerName ??
		order?.sales_order?.customer_name ??
		order?.order?.customerName ??
		order?.order?.customer_name ??
		order?.customer?.fullName ??
		order?.customer?.full_name ??
		order?.customer?.name;
	if (customerName) return customerName;
	return [
		order?.customer?.firstName ?? order?.customer?.first_name,
		order?.customer?.lastName ?? order?.customer?.last_name,
	]
		.filter(Boolean)
		.join(' ');
};
const getSalesOrderStatus = (order?: SalesOrder | null) =>
	String(
		order?.status ??
			order?.salesOrder?.status ??
			order?.sales_order?.status ??
			order?.order?.status ??
			'',
	).toUpperCase();
const getSalesOrderType = (order?: SalesOrder | null) =>
	String(
		order?.orderType ??
			order?.order_type ??
			order?.salesOrder?.orderType ??
			order?.salesOrder?.order_type ??
			order?.sales_order?.orderType ??
			order?.sales_order?.order_type ??
			order?.order?.orderType ??
			order?.order?.order_type ??
			'',
	).toUpperCase();
const getInvoiceNo = (invoice: Invoice) => invoice.invoiceNo ?? invoice.invoice_no ?? 'Invoice';
const getInvoiceSalesOrderId = (invoice: Invoice) => {
	const value =
		invoice.salesOrderId ??
		invoice.sales_order_id ??
		invoice.orderId ??
		invoice.order_id ??
		invoice.salesOrder?.id ??
		invoice.sales_order?.id ??
		invoice.order?.id;
	return optionalNumber(value);
};

interface ICreateDeliveryModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	salesOrder: SalesOrder | null;
	invoices: Invoice[];
	onSuccess: () => void;
}

const toLocalDateTime = (value: string) =>
	value
		? `${value.length === 16 ? value : value.slice(0, 19)}${value.length === 16 ? ':00' : ''}`
		: undefined;

const CreateDeliveryModal: FC<ICreateDeliveryModalProps> = ({
	isOpen,
	setIsOpen,
	salesOrder,
	invoices,
	onSuccess,
}) => {
	const mutation = useMutation({
		mutationFn: createDeliveryApi,
		onSuccess,
		onError: (error) =>
			showNotification(
				'Unable to create delivery',
				getApiErrorMessage(error, 'The delivery could not be created.'),
				'danger',
			),
	});
	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			invoiceId: '',
			dispatchDate: '',
			courierName: '',
			courierReference: '',
			notes: '',
		},
		onSubmit: (values) => {
			if (!salesOrder) return;
			const payload: DeliveryPayload = {
				salesOrderId: getSalesOrderId(salesOrder),
				invoiceId: values.invoiceId ? Number(values.invoiceId) : undefined,
				dispatchDate: toLocalDateTime(values.dispatchDate),
				courierName: values.courierName.trim() || undefined,
				courierReference: values.courierReference.trim() || undefined,
				notes: values.notes.trim() || undefined,
			};
			mutation.mutate(payload);
		},
	});
	if (!isOpen || !salesOrder) return null;
	const salesOrderId = getSalesOrderId(salesOrder);
	const orderInvoices = invoices.filter(
		(invoice) => getInvoiceSalesOrderId(invoice) === salesOrderId,
	);
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='create-delivery-title'>
						<Icon icon='LocalShipping' className='me-2 text-primary' />
						Create Delivery — {getSalesOrderNo(salesOrder)}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='row g-3'>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='deliveryInvoice'>
								Invoice <span className='text-muted'>(optional)</span>
							</label>
							<select
								id='deliveryInvoice'
								name='invoiceId'
								className='form-select'
								value={formik.values.invoiceId}
								onChange={formik.handleChange}>
								<option value=''>Continue without an invoice</option>
								{orderInvoices.map((invoice) => (
									<option value={invoice.id} key={invoice.id}>
										{getInvoiceNo(invoice)}
									</option>
								))}
							</select>
							{/* {orderInvoices.length === 0 && (
								<div className='form-text'>
									No invoice is linked to this sales order. You can still create
									the delivery because only the sales order is required.
								</div>
							)} */}
						</div>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='dispatchDate'>
								Dispatch Date & Time
							</label>
							<input
								id='dispatchDate'
								name='dispatchDate'
								type='datetime-local'
								step='1'
								className='form-control'
								value={formik.values.dispatchDate}
								onChange={formik.handleChange}
							/>
						</div>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='courierName'>
								Courier Name
							</label>
							<input
								id='courierName'
								name='courierName'
								className='form-control'
								value={formik.values.courierName}
								onChange={formik.handleChange}
							/>
						</div>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='courierReference'>
								Courier Reference
							</label>
							<input
								id='courierReference'
								name='courierReference'
								className='form-control'
								value={formik.values.courierReference}
								onChange={formik.handleChange}
							/>
						</div>
						<div className='col-12'>
							<label className='form-label' htmlFor='deliveryNotes'>
								Notes
							</label>
							<textarea
								id='deliveryNotes'
								name='notes'
								rows={3}
								className='form-control'
								value={formik.values.notes}
								onChange={formik.handleChange}
							/>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button type='button' color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button
						type='submit'
						color='primary'
						icon='Save'
						isDisable={mutation.isPending}>
						{mutation.isPending ? 'Creating...' : 'Create Delivery'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

const DeliveriesPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [salesOrderId, setSalesOrderId] = useState('');
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const canCreate = hasPermission(PERMISSIONS.CREATE_DELIVERY);
	const canDispatch = hasPermission(PERMISSIONS.UPDATE_DELIVERY);
	const {
		data: salesOrders = [],
		isLoading: isLoadingSalesOrders,
		error: salesOrdersError,
	} = useQuery<SalesOrder[]>({
		queryKey: ['salesOrders'],
		queryFn: async () => {
			const res = await api.get('/sales-orders');
			return getApiList<SalesOrder>(res.data).filter(
				(order) =>
					getSalesOrderId(order) > 0 && getSalesOrderType(order) === 'SEW_AND_SELL',
			);
		},
	});
	const { data: invoices = [] } = useQuery<Invoice[]>({
		queryKey: ['invoices'],
		queryFn: async () => getApiList<Invoice>((await api.get('/invoices')).data),
	});
	const { data: workOrders = [] } = useQuery<WorkOrderResponse[]>({
		queryKey: ['workOrders'],
		queryFn: getWorkOrdersApi,
	});
	const stageQueries = useQueries({
		queries: workOrders.map((workOrder) => ({
			queryKey: ['productionStages', workOrder.id],
			queryFn: () => getProductionStagesByWorkOrderApi(workOrder.id),
		})),
	});
	const selectedOrder =
		salesOrders.find((order) => getSalesOrderId(order) === Number(salesOrderId)) || null;
	const {
		data: deliveries = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['deliveries', salesOrderId],
		queryFn: () => getDeliveriesBySalesOrderApi(Number(salesOrderId)),
		enabled: Boolean(salesOrderId),
	});
	const dispatchMutation = useMutation({
		mutationFn: confirmDeliveryDispatchApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['deliveries', salesOrderId] });
			queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
			showNotification(
				'Delivery dispatched',
				'The delivery and sales order statuses were updated.',
				'success',
			);
		},
		onError: (mutationError) =>
			showNotification(
				'Unable to dispatch',
				getApiErrorMessage(mutationError, 'The delivery could not be dispatched.'),
				'danger',
			),
	});
	const getSalesOrderNoById = (id?: number | string | null) => {
		const matchingOrder = salesOrders.find((order) => getSalesOrderId(order) === Number(id));
		if (matchingOrder) return getSalesOrderNo(matchingOrder);
		if (selectedOrder) return getSalesOrderNo(selectedOrder);
		return '—';
	};
	const getWorkOrderStages = (workOrderId: number) =>
		(stageQueries[workOrders.findIndex((workOrder) => workOrder.id === workOrderId)]?.data ||
			[]) as ProductionStageResponse[];
	const isDeliveryReadyOrder = (order: SalesOrder | null) => {
		if (!order) return false;
		const orderWorkOrders = workOrders.filter(
			(workOrder) => workOrder.salesOrderId === getSalesOrderId(order),
		);
		const workOrderReady = orderWorkOrders.some((workOrder) =>
			isWorkOrderDeliveryReady(
				workOrder,
				getLatestProductionStage(getWorkOrderStages(workOrder.id)),
			),
		);
		return isSalesOrderDeliveryReady(getSalesOrderStatus(order), workOrderReady);
	};
	const selectedOrderDeliveryReady = isDeliveryReadyOrder(selectedOrder);
	const columns: DataTableColumn<any>[] = [
		{
			key: 'deliveryNo',
			label: 'Delivery No',
			render: (row) => (
				<span className='fw-bold text-primary'>
					{row.deliveryNo || `Delivery ${row.id}`}
				</span>
			),
		},
		{
			key: 'salesOrderNo',
			label: 'Sales Order',
			render: (row) => row.salesOrderNo || getSalesOrderNoById(row.salesOrderId),
		},
		{ key: 'invoiceNo', label: 'Invoice', render: (row) => row.invoiceNo || '—' },
		{ key: 'courierName', label: 'Courier', render: (row) => row.courierName || '—' },
		{
			key: 'courierReference',
			label: 'Tracking Ref',
			render: (row) => row.courierReference || '—',
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge
					color={
						row.status === 'DISPATCHED' || row.status === 'DELIVERED'
							? 'success'
							: 'warning'
					}
					isLight>
					{row.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper title='Deliveries & Dispatch' requiredPermission={PERMISSIONS.SHOW_DELIVERY}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='LocalShipping' size='2x' color='info' />
					<span className='fs-5 fw-bold ms-2'>Deliveries &amp; Dispatch</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && selectedOrder && selectedOrderDeliveryReady && (
						<Button
							color='primary'
							isLight
							icon='Add'
							onClick={() => setIsCreateOpen(true)}>
							New Delivery
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>
			<Page>
				<Card>
					<CardBody>
						<div className='row g-3 mb-4'>
							<div className='col-md-6'>
								<label
									className='form-label fw-semibold'
									htmlFor='deliverySalesOrder'>
									Sales Order
								</label>
								<select
									id='deliverySalesOrder'
									className='form-select'
									value={salesOrderId}
									onChange={(event) => setSalesOrderId(event.target.value)}
									disabled={isLoadingSalesOrders || Boolean(salesOrdersError)}>
									<option value=''>
										{isLoadingSalesOrders
											? 'Loading sales orders...'
											: salesOrdersError
												? 'Could not load sales orders'
												: 'Select a sales order to view deliveries...'}
									</option>
									{salesOrders.map((order) => (
										<option
											value={getSalesOrderId(order)}
											key={getSalesOrderId(order)}>
											{getSalesOrderNo(order)}
											{getSalesOrderCustomerName(order)
												? ` — ${getSalesOrderCustomerName(order)}`
												: ''}
											{' — '}
											{getSalesOrderStatus(order)}
										</option>
									))}
								</select>
								{salesOrdersError && (
									<div className='form-text text-danger'>
										{getApiErrorMessage(
											salesOrdersError,
											'Sales orders could not be loaded.',
										)}
									</div>
								)}
								{!isLoadingSalesOrders &&
									!salesOrdersError &&
									salesOrders.length === 0 && (
										<div className='form-text text-muted'>
											No Sew &amp; Sell sales orders were returned by the
											sales-order API.
										</div>
									)}
								{selectedOrder && !selectedOrderDeliveryReady && (
									<div className='form-text text-warning'>
										Delivery is available after production reaches Packing or
										the sales order is ready for dispatch.
									</div>
								)}
							</div>
						</div>
						{salesOrderId ? (
							<DataTable
								columns={[
									...columns,
									{
										key: 'actions',
										label: '',
										align: 'right',
										sortable: false,
										searchable: false,
										render: (row: DeliveryResponse) => (
											<DataTableActionMenu
												actions={
													canDispatch &&
													row.status === 'PENDING' &&
													selectedOrderDeliveryReady
														? [
																{
																	key: 'dispatch',
																	label: 'Dispatch',
																	icon: 'ti ti-truck',
																	className: 'text-success',
																	onClick: () =>
																		dispatchMutation.mutate(
																			row.id,
																		),
																},
															]
														: []
												}
											/>
										),
									},
								]}
								data={deliveries}
								rowKey='id'
								loading={isLoading}
								error={error}
								fileName='deliveries'
								showActions={false}
							/>
						) : (
							<div className='text-center text-muted py-5'>
								Select a sales order to load its delivery history.
							</div>
						)}
					</CardBody>
				</Card>
				<CreateDeliveryModal
					isOpen={isCreateOpen}
					setIsOpen={setIsCreateOpen}
					salesOrder={selectedOrder}
					invoices={invoices}
					onSuccess={() => {
						setIsCreateOpen(false);
						queryClient.invalidateQueries({ queryKey: ['deliveries', salesOrderId] });
					}}
				/>
			</Page>
		</PageWrapper>
	);
};

export default DeliveriesPage;

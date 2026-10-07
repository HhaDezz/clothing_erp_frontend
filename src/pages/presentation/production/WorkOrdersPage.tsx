import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody, CardHeader, CardTitle } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getProductionStagesByWorkOrderApi,
	getWorkOrdersApi,
	ProductionStageResponse,
	WorkOrderResponse,
} from '../../../api/production.api';
import api from '../../../lib/axios';
import ProductionStageModal from './ProductionStageModal';
import CreateWorkOrderModal from './CreateWorkOrderModal';
import { usePermission } from '../../../hooks/usePermission';
import {
	getLatestProductionStage,
	getLatestProductionStageRecord,
} from '../../../utils/productionFlow';

const numberValue = (value: unknown, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const WorkOrdersPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [activeWo, setActiveWo] = useState<any>(null);
	const [isStageModalOpen, setIsStageModalOpen] = useState(false);
	const [selectedSalesOrder, setSelectedSalesOrder] = useState<Record<string, any> | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const canCreateWorkOrder = hasPermission(PERMISSIONS.CREATE_WORK_ORDER);
	const canRecordStage = hasPermission(PERMISSIONS.CREATE_PRODUCTION_STAGE);

	const { data: salesOrders = [] } = useQuery({
		queryKey: ['pendingSewAndSell'],
		queryFn: async () => {
			const res = await api.get('/sales-orders');
			return (
				res.data.data?.filter(
					(order: any) =>
						order.orderType === 'SEW_AND_SELL' &&
						order.status !== 'PENDING' &&
						order.status !== 'CANCELLED',
				) || []
			);
		},
	});

	const {
		data: workOrders = [],
		isLoading,
		error,
	} = useQuery<WorkOrderResponse[]>({
		queryKey: ['workOrders'],
		queryFn: getWorkOrdersApi,
	});
	const stageQueries = useQueries({
		queries: workOrders.map((workOrder) => ({
			queryKey: ['productionStages', workOrder.id],
			queryFn: () => getProductionStagesByWorkOrderApi(workOrder.id),
		})),
	});
	const getWorkOrderStages = (workOrderId: number) =>
		(stageQueries[workOrders.findIndex((workOrder) => workOrder.id === workOrderId)]?.data ||
			[]) as ProductionStageResponse[];
	const getWorkOrderProgress = (workOrder: WorkOrderResponse) => {
		const latestStageRecord = getLatestProductionStageRecord(getWorkOrderStages(workOrder.id));
		return Math.min(
			numberValue(workOrder.plannedQty),
			latestStageRecord
				? numberValue(latestStageRecord.outputQty)
				: numberValue(workOrder.completedQty),
		);
	};

	const workOrderSalesIds = new Set(workOrders.map((order) => order.salesOrderId));
	const eligibleOrders = salesOrders.filter((order: any) => !workOrderSalesIds.has(order.id));
	const getSalesOrderLabel = (salesOrderId?: number | string | null, salesOrderNo?: string) =>
		salesOrderNo ||
		salesOrders.find((order: any) => order.id === Number(salesOrderId))?.orderNo ||
		'—';
	const getCustomerLabel = (order: any) => order.customerName || order.customer?.name || '—';

	const columns: DataTableColumn<any>[] = [
		{
			key: 'woNo',
			label: 'WO No',
			render: (row) => <span className='fw-bold text-primary'>{row.woNo}</span>,
		},
		{
			key: 'salesOrderNo',
			label: 'Order Ref',
			render: (row) => <span>{getSalesOrderLabel(row.salesOrderId, row.salesOrderNo)}</span>,
		},
		{
			key: 'plannedQty',
			label: 'Progress',
			render: (row) => {
				const completedQty = getWorkOrderProgress(row);
				const plannedQty = numberValue(row.plannedQty);
				return (
					<span>
						{completedQty} / {plannedQty}
					</span>
				);
			},
		},
		{
			key: 'assignedTeam',
			label: 'Team',
			render: (row) => <span>{row.assignedTeam}</span>,
		},
		{
			key: 'status',
			label: 'Current Stage',
			align: 'center',
			render: (row) => (
				<Badge color='info' className='text-dark' isLight>
					{getLatestProductionStage(getWorkOrderStages(row.id)) || 'Not Started'}
				</Badge>
			),
		},
		{
			key: 'workOrderStatus',
			label: 'WO Status',
			align: 'center',
			render: (row) => (
				<Badge color={row.status === 'COMPLETED' ? 'success' : 'secondary'} isLight>
					{row.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper
			title='Work Orders & Production'
			requiredPermission={PERMISSIONS.SHOW_WORK_ORDER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Build' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Work Orders &amp; Production</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page>
				<div className='row g-4 h-100'>
					<div className='col-lg-4'>
						<Card stretch>
							<CardHeader>
								<CardTitle>Pending Custom Orders</CardTitle>
							</CardHeader>
							<CardBody className='p-0'>
								<ul className='list-group list-group-flush'>
									{eligibleOrders.length === 0 && (
										<li className='list-group-item text-muted text-center py-4'>
											No pending orders
										</li>
									)}
									{eligibleOrders.map((order: any) => (
										<li key={order.id} className='list-group-item p-3'>
											<div className='d-flex justify-content-between align-items-center mb-2'>
												<span className='fw-bold'>{order.orderNo}</span>
												<Badge color='primary'>Custom</Badge>
											</div>
											<div className='d-flex justify-content-between align-items-center'>
												<small className='text-muted'>
													{getCustomerLabel(order)}
												</small>
												{canCreateWorkOrder && (
													<Button
														color='success'
														size='sm'
														isLight
														onClick={() => {
															setSelectedSalesOrder(order);
															setIsCreateModalOpen(true);
														}}>
														Create WO
													</Button>
												)}
											</div>
										</li>
									))}
								</ul>
							</CardBody>
						</Card>
					</div>

					<div className='col-lg-8'>
						<Card stretch>
							<CardHeader>
								<CardTitle>Active Work Orders</CardTitle>
							</CardHeader>
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
													actions={
														canRecordStage &&
														!['COMPLETED', 'CANCELLED'].includes(
															row.status,
														)
															? [
																	{
																		key: 'update',
																		label: 'Update Stage',
																		icon: 'ti ti-edit',
																		className: 'text-primary',
																		onClick: () => {
																			setActiveWo(row);
																			setIsStageModalOpen(
																				true,
																			);
																		},
																	},
																]
															: []
													}
												/>
											),
										},
									]}
									data={workOrders}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='work-orders'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>

				<ProductionStageModal
					workOrder={activeWo}
					productionStages={activeWo ? getWorkOrderStages(activeWo.id) : []}
					isOpen={isStageModalOpen}
					setIsOpen={setIsStageModalOpen}
					onSuccess={() => {
						setIsStageModalOpen(false);
						queryClient.invalidateQueries({ queryKey: ['workOrders'] });
						if (activeWo) {
							queryClient.invalidateQueries({
								queryKey: ['productionStages', activeWo.id],
							});
						}
					}}
				/>
				<CreateWorkOrderModal
					salesOrder={selectedSalesOrder}
					workOrders={workOrders}
					isOpen={isCreateModalOpen}
					setIsOpen={setIsCreateModalOpen}
					onSuccess={() => {
						setIsCreateModalOpen(false);
						setSelectedSalesOrder(null);
						queryClient.invalidateQueries({ queryKey: ['workOrders'] });
						queryClient.invalidateQueries({ queryKey: ['pendingSewAndSell'] });
					}}
				/>
			</Page>
		</PageWrapper>
	);
};

export default WorkOrdersPage;

import React, { FC, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody, CardHeader, CardTitle } from '../../../components/bootstrap/Card';
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
import {
	getProductionStagesByWorkOrderApi,
	getWorkOrdersApi,
	ProductionStagePayload,
	ProductionStageResponse,
	QualityCheckPayload,
	recordQualityCheckApi,
	WorkOrderResponse,
} from '../../../api/production.api';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import api from '../../../lib/axios';
import { getLatestProductionStage, isQcReadyStage } from '../../../utils/productionFlow';

const QC_STAGES: QualityCheckPayload['stage'][] = ['QC', 'PACKING'];
const DEFAULT_DEFECT_TYPES = [
	'Stitching Issue',
	'Measurement Issue',
	'Fabric Defect',
	'Color Mismatch',
	'Button/Trim Issue',
	'Finishing Issue',
];
const DEFAULT_QC_TEAMS = ['QC Team', 'Production Supervisor', 'Finishing Team'];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

interface IRecordQcModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	workOrder: WorkOrderResponse | null;
	currentStage: ProductionStagePayload['stage'] | null;
	onSuccess: () => void;
}

const RecordQcModal: FC<IRecordQcModalProps> = ({
	isOpen,
	setIsOpen,
	workOrder,
	currentStage,
	onSuccess,
}) => {
	const mutation = useMutation({
		mutationFn: recordQualityCheckApi,
		onSuccess: () => {
			showNotification(
				'QC recorded',
				'The quality check was recorded successfully.',
				'success',
			);
			onSuccess();
		},
		onError: (error) =>
			showNotification(
				'Unable to record QC',
				getApiErrorMessage(error, 'The quality check could not be saved.'),
				'danger',
			),
	});

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			stage: (currentStage && QC_STAGES.includes(currentStage)
				? currentStage
				: 'QC') as QualityCheckPayload['stage'],
			checkedQty: Number(workOrder?.plannedQty || 1),
			passedQty: Number(workOrder?.plannedQty || 1),
			rejectedQty: 0,
			decision: 'PASS' as QualityCheckPayload['decision'],
			defectType: '',
			checkedBy: '',
			notes: '',
		},
		validationSchema: Yup.object({
			checkedQty: Yup.number().min(1, 'Checked quantity must be at least 1').required(),
			passedQty: Yup.number()
				.min(0)
				.required()
				.test(
					'within-checked',
					'Passed plus rejected quantity cannot exceed checked quantity',
					(value, context) =>
						Number(value || 0) + Number(context.parent.rejectedQty || 0) <=
						Number(context.parent.checkedQty || 0),
				),
			rejectedQty: Yup.number().min(0).required(),
			decision: Yup.string().oneOf(['PASS', 'REWORK', 'REJECT']).required(),
		}),
		onSubmit: (values) => {
			if (!workOrder) return;
			mutation.mutate({
				workOrderId: workOrder.id,
				stage: values.stage,
				defectType: values.defectType.trim() || undefined,
				checkedQty: Number(values.checkedQty),
				passedQty: Number(values.passedQty),
				rejectedQty: Number(values.rejectedQty),
				decision: values.decision,
				checkedBy: values.checkedBy.trim() || undefined,
				notes: values.notes.trim() || undefined,
			});
		},
	});

	if (!isOpen || !workOrder) return null;
	const accountedQty =
		Number(formik.values.passedQty || 0) + Number(formik.values.rejectedQty || 0);
	const availableStages =
		currentStage && QC_STAGES.includes(currentStage) ? [currentStage] : ['QC'];
	const checkedByOptions = compactUnique([workOrder.assignedTeam, ...DEFAULT_QC_TEAMS]);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='qc-title'>
						<Icon icon='Verified' className='me-2 text-primary' />
						Record Quality Check — {workOrder.woNo}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='row g-3 mb-3'>
						<div className='col-md-6'>
							<label className='form-label fw-bold' htmlFor='qcStage'>
								Production Stage
							</label>
							<select
								id='qcStage'
								className='form-select'
								name='stage'
								value={formik.values.stage}
								onChange={formik.handleChange}>
								{availableStages.map((stage) => (
									<option value={stage} key={stage}>
										{stage}
									</option>
								))}
							</select>
						</div>
						<div className='col-md-6'>
							<label className='form-label fw-bold' htmlFor='qcDecision'>
								Decision
							</label>
							<select
								id='qcDecision'
								className='form-select'
								name='decision'
								value={formik.values.decision}
								onChange={formik.handleChange}>
								<option value='PASS'>Pass</option>
								<option value='REWORK'>Rework</option>
								<option value='REJECT'>Reject</option>
							</select>
						</div>
					</div>
					<div className='row g-3 mb-3'>
						{(['checkedQty', 'passedQty', 'rejectedQty'] as const).map((field) => (
							<div className='col-md-4' key={field}>
								<label className='form-label fw-bold' htmlFor={field}>
									{field === 'checkedQty'
										? 'Checked Quantity'
										: field === 'passedQty'
											? 'Passed Quantity'
											: 'Rejected Quantity'}
								</label>
								<input
									id={field}
									name={field}
									type='number'
									min={field === 'checkedQty' ? 1 : 0}
									className='form-control'
									value={formik.values[field]}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
								/>
								{formik.touched[field] && formik.errors[field] && (
									<div className='text-danger small mt-1'>
										{formik.errors[field]}
									</div>
								)}
							</div>
						))}
					</div>
					<div className='alert alert-info d-flex justify-content-between align-items-center'>
						<span>Accounted quantity (passed + rejected)</span>
						<strong
							className={
								accountedQty > Number(formik.values.checkedQty) ? 'text-danger' : ''
							}>
							{accountedQty} / {formik.values.checkedQty}
						</strong>
					</div>
					<div className='row g-3'>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='qcDefect'>
								Defect Type
							</label>
							<select
								id='qcDefect'
								name='defectType'
								className='form-select'
								value={formik.values.defectType}
								onChange={formik.handleChange}>
								<option value=''>No defect</option>
								{DEFAULT_DEFECT_TYPES.map((defectType) => (
									<option value={defectType} key={defectType}>
										{defectType}
									</option>
								))}
							</select>
						</div>
						<div className='col-md-6'>
							<label className='form-label' htmlFor='qcCheckedBy'>
								Checked By
							</label>
							<select
								id='qcCheckedBy'
								name='checkedBy'
								className='form-select'
								value={formik.values.checkedBy}
								onChange={formik.handleChange}>
								<option value=''>Select checker...</option>
								{checkedByOptions.map((checker) => (
									<option value={checker} key={checker}>
										{checker}
									</option>
								))}
							</select>
						</div>
						<div className='col-12'>
							<label className='form-label' htmlFor='qcNotes'>
								Notes
							</label>
							<textarea
								id='qcNotes'
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
					<Button color='light' type='button' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button
						color='primary'
						type='submit'
						icon='Save'
						isDisable={mutation.isPending}>
						{mutation.isPending ? 'Saving...' : 'Record QC'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

const QualityCheckPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrderResponse | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const canCreate = hasPermission(PERMISSIONS.CREATE_QUALITY_CHECK);
	const {
		data: workOrders = [],
		isLoading,
		error,
	} = useQuery<WorkOrderResponse[]>({ queryKey: ['workOrders'], queryFn: getWorkOrdersApi });
	const stageQueries = useQueries({
		queries: workOrders.map((workOrder) => ({
			queryKey: ['productionStages', workOrder.id],
			queryFn: () => getProductionStagesByWorkOrderApi(workOrder.id),
		})),
	});
	const { data: salesOrders = [] } = useQuery<Record<string, any>[]>({
		queryKey: ['salesOrders'],
		queryFn: async () => {
			const res = await api.get('/sales-orders');
			return res.data.data ?? [];
		},
	});
	const getWorkOrderStages = (workOrderId: number) =>
		(stageQueries[workOrders.findIndex((workOrder) => workOrder.id === workOrderId)]?.data ||
			[]) as ProductionStageResponse[];
	const inspectableOrders = workOrders.filter(
		(order) =>
			order.status !== 'CANCELLED' &&
			isQcReadyStage(getLatestProductionStage(getWorkOrderStages(order.id))),
	);
	const getSalesOrderLabel = (salesOrderId?: number | string | null, salesOrderNo?: string) =>
		salesOrderNo ||
		salesOrders.find((order) => order.id === Number(salesOrderId))?.orderNo ||
		'—';
	const columns: DataTableColumn<any>[] = [
		{
			key: 'woNo',
			label: 'WO No',
			render: (row) => <span className='fw-bold text-primary'>{row.woNo}</span>,
		},
		{
			key: 'salesOrderNo',
			label: 'Sales Order',
			render: (row) => getSalesOrderLabel(row.salesOrderId, row.salesOrderNo),
		},
		{ key: 'assignedTeam', label: 'Team', render: (row) => row.assignedTeam || '—' },
		{ key: 'plannedQty', label: 'Planned Qty', align: 'right' },
		{
			key: 'status',
			label: 'Current Stage',
			align: 'center',
			render: (row) => (
				<Badge color='info' isLight>
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
		<PageWrapper title='Quality Checks' requiredPermission={PERMISSIONS.SHOW_QUALITY_CHECK}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Verified' size='2x' color='success' />
					<span className='fs-5 fw-bold ms-2'>Quality Checks (QC)</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page>
				<Card stretch>
					<CardHeader>
						<CardTitle>Work Orders Ready for Inspection</CardTitle>
					</CardHeader>
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
											actions={
												canCreate
													? [
															{
																key: 'record',
																label: 'Record QC',
																icon: 'ti ti-check',
																className: 'text-success',
																onClick: () => {
																	setActiveWorkOrder(row);
																	setIsModalOpen(true);
																},
															},
														]
													: []
											}
										/>
									),
								},
							]}
							data={inspectableOrders}
							rowKey='id'
							loading={isLoading}
							error={error}
							fileName='quality-checks'
							showActions={false}
						/>
					</CardBody>
				</Card>
				<RecordQcModal
					workOrder={activeWorkOrder}
					currentStage={
						activeWorkOrder
							? getLatestProductionStage(getWorkOrderStages(activeWorkOrder.id))
							: null
					}
					isOpen={isModalOpen}
					setIsOpen={setIsModalOpen}
					onSuccess={() => {
						setIsModalOpen(false);
						setActiveWorkOrder(null);
						queryClient.invalidateQueries({ queryKey: ['workOrders'] });
						if (activeWorkOrder) {
							queryClient.invalidateQueries({
								queryKey: ['productionStages', activeWorkOrder.id],
							});
						}
					}}
				/>
			</Page>
		</PageWrapper>
	);
};

export default QualityCheckPage;

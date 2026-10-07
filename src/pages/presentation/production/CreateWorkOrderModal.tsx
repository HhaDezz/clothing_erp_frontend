import React, { FC } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import { createWorkOrderApi, WorkOrderPayload } from '../../../api/production.api';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { WorkOrderResponse } from '../../../api/production.api';

interface ICreateWorkOrderModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	salesOrder: Record<string, any> | null;
	workOrders?: WorkOrderResponse[];
	onSuccess: () => void;
}

const DEFAULT_PRODUCTION_TEAMS = [
	'Team A',
	'Cutting Team',
	'Sewing Team',
	'Fitting Team',
	'Alteration Team',
	'Finishing Team',
	'QC Team',
	'Packing Team',
];

const numberValue = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

const getItemQty = (item: Record<string, any>) =>
	numberValue(item.qty) ??
	numberValue(item.quantity) ??
	numberValue(item.orderQty) ??
	numberValue(item.order_qty) ??
	numberValue(item.totalQty) ??
	numberValue(item.total_qty) ??
	0;

const getSalesOrderPlannedQty = (salesOrder?: Record<string, any> | null) => {
	if (!salesOrder) return 1;
	const directQty =
		numberValue(salesOrder.qty) ??
		numberValue(salesOrder.quantity) ??
		numberValue(salesOrder.plannedQty) ??
		numberValue(salesOrder.planned_qty) ??
		numberValue(salesOrder.totalQty) ??
		numberValue(salesOrder.total_qty) ??
		numberValue(salesOrder.orderQty) ??
		numberValue(salesOrder.order_qty);
	if (directQty && directQty > 0) return directQty;

	const items = Array.isArray(salesOrder.items)
		? salesOrder.items
		: Array.isArray(salesOrder.salesOrderItems)
			? salesOrder.salesOrderItems
			: Array.isArray(salesOrder.sales_order_items)
				? salesOrder.sales_order_items
				: [];
	const itemQty = items.reduce(
		(total: number, item: Record<string, any>) => total + getItemQty(item),
		0,
	);
	return itemQty > 0 ? itemQty : 1;
};

const getSalesOrderId = (salesOrder: Record<string, any>) =>
	numberValue(salesOrder.id) ??
	numberValue(salesOrder.salesOrderId) ??
	numberValue(salesOrder.sales_order_id) ??
	numberValue(salesOrder.orderId) ??
	numberValue(salesOrder.order_id) ??
	0;

const getSalesOrderNo = (salesOrder: Record<string, any>) =>
	salesOrder.orderNo ??
	salesOrder.order_no ??
	salesOrder.orderNumber ??
	salesOrder.salesOrderNo ??
	salesOrder.sales_order_no ??
	'Sales order';

const getSalesOrderGarmentType = (salesOrder?: Record<string, any> | null) =>
	salesOrder?.garmentType ??
	salesOrder?.garment_type ??
	salesOrder?.productName ??
	salesOrder?.product_name ??
	salesOrder?.product?.name ??
	salesOrder?.item?.name ??
	salesOrder?.items?.[0]?.productName ??
	salesOrder?.items?.[0]?.product_name ??
	salesOrder?.items?.[0]?.product?.name ??
	'';

const CreateWorkOrderModal: FC<ICreateWorkOrderModalProps> = ({
	isOpen,
	setIsOpen,
	salesOrder,
	workOrders = [],
	onSuccess,
}) => {
	const garmentTypeOptions = compactUnique([
		getSalesOrderGarmentType(salesOrder),
		...(Array.isArray(salesOrder?.items)
			? salesOrder.items.flatMap((item: Record<string, any>) => [
					item.productName,
					item.product_name,
					item.product?.name,
					item.garmentType,
					item.garment_type,
				])
			: []),
	]);
	const teamOptions = compactUnique([
		salesOrder?.assignedTeam,
		salesOrder?.assigned_team,
		...workOrders.map((workOrder) => workOrder.assignedTeam),
		...DEFAULT_PRODUCTION_TEAMS,
	]);
	const mutation = useMutation({
		mutationFn: createWorkOrderApi,
		onSuccess,
		onError: (error) =>
			showNotification(
				'Unable to create work order',
				getApiErrorMessage(error, 'The work order could not be created.'),
				'danger',
			),
	});

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			garmentType: salesOrder?.garmentType || '',
			plannedQty: getSalesOrderPlannedQty(salesOrder),
			assignedTeam: '',
			dueDate: salesOrder?.expectedDate?.slice(0, 10) || '',
			notes: '',
		},
		validationSchema: Yup.object({
			plannedQty: Yup.number()
				.integer()
				.min(1, 'Planned quantity must be at least 1')
				.required(),
			dueDate: Yup.string().nullable(),
		}),
		onSubmit: (values) => {
			if (!salesOrder) return;
			const payload: WorkOrderPayload = {
				salesOrderId: getSalesOrderId(salesOrder),
				garmentType: values.garmentType.trim() || undefined,
				plannedQty: Number(values.plannedQty),
				assignedTeam: values.assignedTeam.trim() || undefined,
				dueDate: values.dueDate || undefined,
				notes: values.notes.trim() || undefined,
			};
			mutation.mutate(payload);
		},
	});

	if (!isOpen || !salesOrder) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='create-work-order-title'>
						<Icon icon='Assignment' className='me-2 text-primary' />
						Create Work Order — {getSalesOrderNo(salesOrder)}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='alert alert-info'>
						Creating this work order will move the confirmed sales order to processing.
					</div>
					<div className='row g-3'>
						<div className='col-md-6'>
							<label className='form-label fw-semibold' htmlFor='woGarmentType'>
								Garment Type
							</label>
							<select
								id='woGarmentType'
								name='garmentType'
								className='form-select'
								value={formik.values.garmentType}
								onChange={formik.handleChange}>
								<option value=''>Select garment type...</option>
								{garmentTypeOptions.map((garmentType) => (
									<option value={garmentType} key={garmentType}>
										{garmentType}
									</option>
								))}
							</select>
						</div>
						<div className='col-md-6'>
							<label className='form-label fw-semibold' htmlFor='woPlannedQty'>
								Planned Quantity *
							</label>
							<input
								id='woPlannedQty'
								name='plannedQty'
								type='number'
								min={1}
								className='form-control'
								value={formik.values.plannedQty}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
							/>
							{formik.touched.plannedQty && formik.errors.plannedQty && (
								<div className='text-danger small mt-1'>
									{formik.errors.plannedQty}
								</div>
							)}
						</div>
						<div className='col-md-6'>
							<label className='form-label fw-semibold' htmlFor='woAssignedTeam'>
								Assigned Team
							</label>
							<select
								id='woAssignedTeam'
								name='assignedTeam'
								className='form-select'
								value={formik.values.assignedTeam}
								onChange={formik.handleChange}>
								<option value=''>Select production team...</option>
								{teamOptions.map((team) => (
									<option value={team} key={team}>
										{team}
									</option>
								))}
							</select>
						</div>
						<div className='col-md-6'>
							<label className='form-label fw-semibold' htmlFor='woDueDate'>
								Due Date
							</label>
							<input
								id='woDueDate'
								name='dueDate'
								type='date'
								className='form-control'
								value={formik.values.dueDate}
								onChange={formik.handleChange}
							/>
						</div>
						<div className='col-12'>
							<label className='form-label fw-semibold' htmlFor='woNotes'>
								Notes
							</label>
							<textarea
								id='woNotes'
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
						{mutation.isPending ? 'Creating...' : 'Create Work Order'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreateWorkOrderModal;

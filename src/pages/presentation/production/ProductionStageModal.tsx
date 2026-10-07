import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import {
	ProductionStageResponse,
	recordProductionStageApi,
	WorkOrderResponse,
} from '../../../api/production.api';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import {
	getLatestProductionStage,
	getNextProductionStage,
	PRODUCTION_STAGES,
} from '../../../utils/productionFlow';

const DEFAULT_PRODUCTION_TEAMS = [
	'Cutting Team',
	'Sewing Team',
	'Fitting Team',
	'Alteration Team',
	'Finishing Team',
	'QC Team',
	'Packing Team',
];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

interface ProductionStageModalProps {
	workOrder: WorkOrderResponse | null;
	productionStages: ProductionStageResponse[];
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSuccess: () => void;
}

const ProductionStageModal: React.FC<ProductionStageModalProps> = ({
	workOrder,
	productionStages,
	isOpen,
	setIsOpen,
	onSuccess,
}) => {
	const latestStage = getLatestProductionStage(productionStages);
	const nextStage = getNextProductionStage(productionStages);
	const selectableStages = PRODUCTION_STAGES.slice(PRODUCTION_STAGES.indexOf(nextStage));
	const assignedToOptions = compactUnique([
		workOrder?.assignedTeam,
		...productionStages.map((stage) => stage.assignedTo),
		...DEFAULT_PRODUCTION_TEAMS,
	]);
	const stageMutation = useMutation({
		mutationFn: recordProductionStageApi,
		onSuccess,
		onError: (error) =>
			showNotification(
				'Unable to record stage',
				getApiErrorMessage(error, 'The production stage could not be recorded.'),
				'danger',
			),
	});

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			stage: nextStage,
			inputQty: workOrder?.plannedQty || 1,
			outputQty: workOrder?.plannedQty || 1,
			rejectQty: 0,
			assignedTo: workOrder?.assignedTeam || '',
			notes: '',
		},
		validationSchema: Yup.object({
			stage: Yup.string().required('Stage is required'),
			inputQty: Yup.number().min(1, 'Input quantity must be at least 1').required(),
			outputQty: Yup.number()
				.min(0)
				.required()
				.test(
					'within-input',
					'Output plus rejects cannot exceed input quantity',
					(value, context) =>
						Number(value || 0) + Number(context.parent.rejectQty || 0) <=
						Number(context.parent.inputQty || 0),
				),
			rejectQty: Yup.number().min(0).required(),
		}),
		onSubmit: (values) => {
			if (!workOrder) return;
			stageMutation.mutate({
				workOrderId: workOrder.id,
				stage: values.stage,
				inputQty: Number(values.inputQty),
				outputQty: Number(values.outputQty),
				rejectQty: Number(values.rejectQty),
				assignedTo: values.assignedTo.trim() || undefined,
				notes: values.notes.trim() || undefined,
			});
		},
	});

	if (!isOpen || !workOrder) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='prod-stage-title'>
						<Icon icon='Build' className='me-2 text-primary' />
						Record Production Stage
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='mb-4 text-center'>
						<h5 className='text-primary fw-bold mb-1'>{workOrder.woNo}</h5>
						<p className='text-muted small'>
							Work-order status: <Badge color='info'>{workOrder.status}</Badge>
						</p>
						<p className='text-muted small mb-0'>
							Current stage:{' '}
							<Badge color={latestStage ? 'primary' : 'warning'}>
								{latestStage || 'Not started'}
							</Badge>
						</p>
					</div>
					<div className='mb-3'>
						<label className='form-label fw-bold' htmlFor='productionStage'>
							Stage
						</label>
						<select
							id='productionStage'
							className='form-select'
							name='stage'
							onChange={formik.handleChange}
							value={formik.values.stage}>
							{selectableStages.map((stage) => (
								<option key={stage} value={stage}>
									{stage}
								</option>
							))}
						</select>
					</div>
					<div className='row g-3 mb-3'>
						{(['inputQty', 'outputQty', 'rejectQty'] as const).map((field) => (
							<div className='col-4' key={field}>
								<label className='form-label' htmlFor={field}>
									{field === 'inputQty'
										? 'Input Qty'
										: field === 'outputQty'
											? 'Output Qty'
											: 'Reject Qty'}
								</label>
								<input
									id={field}
									type='number'
									min={0}
									className='form-control'
									name={field}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
									value={formik.values[field]}
								/>
								{formik.touched[field] && formik.errors[field] && (
									<div className='text-danger small mt-1'>
										{formik.errors[field]}
									</div>
								)}
							</div>
						))}
					</div>
					<div className='mb-3'>
						<label className='form-label' htmlFor='assignedTo'>
							Assigned To
						</label>
						<select
							id='assignedTo'
							className='form-select'
							name='assignedTo'
							value={formik.values.assignedTo}
							onChange={formik.handleChange}>
							<option value=''>Select assigned team...</option>
							{assignedToOptions.map((team) => (
								<option value={team} key={team}>
									{team}
								</option>
							))}
						</select>
					</div>
					<div className='mb-3'>
						<label className='form-label' htmlFor='stageNotes'>
							Notes
						</label>
						<textarea
							id='stageNotes'
							className='form-control'
							name='notes'
							rows={2}
							onChange={formik.handleChange}
							value={formik.values.notes}
						/>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button
						color='light'
						onClick={() => setIsOpen(false)}
						isDisable={stageMutation.isPending}
						type='button'>
						Cancel
					</Button>
					<Button color='primary' type='submit' isDisable={stageMutation.isPending}>
						{stageMutation.isPending ? 'Saving...' : 'Record Progress'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ProductionStageModal;

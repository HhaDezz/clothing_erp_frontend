import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import showNotification from '../../../components/extras/showNotification';
import Icon from '../../../components/icon/Icon';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Checks from '../../../components/bootstrap/forms/Checks';
import Button from '../../../components/bootstrap/Button';
import {
	createDefectiveReasonApi,
	updateDefectiveReasonApi,
	DefectiveReason,
} from '../../../api/defectiveReasons.api';

export type TDefectiveReasonFormMode = 'add' | 'edit' | 'view';

interface IDefectiveReasonFormModalProps {
	mode: TDefectiveReasonFormMode;
	id: number | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	reasons: DefectiveReason[];
	onEdit?(id: number): void;
}

type TFormValues = {
	code: string;
	label: string;
	active: boolean;
};

const DefectiveReasonFormModal: FC<IDefectiveReasonFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	reasons,
	onEdit,
}) => {
	const queryClient = useQueryClient();
	const isViewing = mode === 'view';
	const isEditing = mode === 'edit';
	const isAdding = mode === 'add';
	const item = isAdding ? null : reasons.find((r) => r.id === id) || null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			code: item?.code || '',
			label: item?.label || '',
			active: item?.active ?? true,
		},
		validate: (values) => {
			if (isViewing) return {};
			const errors: Partial<Record<keyof TFormValues, string>> = {};
			if (!values.code) errors.code = 'Code is required';
			if (!values.label) errors.label = 'Label is required';
			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (isViewing) return;
			try {
				const payload = {
					code: values.code,
					label: values.label,
					active: values.active,
				};

				if (isAdding) {
					await createDefectiveReasonApi(payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='ReportProblem' size='lg' className='me-1' />
							<span>Defective Reason Created</span>
						</span>,
						`${values.label} has been added successfully.`,
					);
				} else if (isEditing) {
					if (!id) return;
					await updateDefectiveReasonApi(id, payload);
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='Edit' size='lg' className='me-1' />
							<span>Defective Reason Updated</span>
						</span>,
						`${values.label} has been updated successfully.`,
					);
				}

				await queryClient.invalidateQueries({ queryKey: ['defective-reasons'] });
				resetForm();
				setIsOpen(false);
			} catch (error) {
				const axiosError = error as {
					response?: { data?: { message?: string } };
				};
				showNotification(
					'Request failed',
					axiosError.response?.data?.message || 'Failed to save defective reason.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (!isAdding && !item) return null;

	const modalTitle = isAdding
		? 'New Defective Reason'
		: isEditing
			? `Edit Defective Reason - ${item?.label || ''}`
			: 'Defective Reason Details';

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='defective-reason-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='defective-reason-form-modal'>{modalTitle}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='code' label='Code' className='col-12'>
							<Input
								name='code'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.code}
								isValid={formik.isValid}
								isTouched={formik.touched.code}
								invalidFeedback={formik.errors.code}
								placeholder='e.g. STAIN, TORN, MISPRINT'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='label' label='Label' className='col-12'>
							<Input
								name='label'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.label}
								isValid={formik.isValid}
								isTouched={formik.touched.label}
								invalidFeedback={formik.errors.label}
								placeholder='e.g. Stained fabric'
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='active' className='col-12'>
							<Checks
								type='switch'
								id='active'
								label='Active (selectable during QA)'
								name='active'
								checked={formik.values.active}
								onChange={formik.handleChange}
								disabled={isViewing || formik.isSubmitting}
							/>
						</FormGroup>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					{isViewing ? 'Close' : 'Cancel'}
				</Button>
				{isViewing && item && onEdit && (
					<Button
						color='primary'
						icon='Edit'
						onClick={() => {
							setIsOpen(false);
							onEdit(item.id);
						}}>
						Edit
					</Button>
				)}
				{!isViewing && (
					<Button
						color='primary'
						icon={isAdding ? 'Add' : 'Save'}
						isDisable={formik.isSubmitting}
						onClick={() => formik.handleSubmit()}>
						{isAdding ? 'Add' : 'Update'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

export default DefectiveReasonFormModal;

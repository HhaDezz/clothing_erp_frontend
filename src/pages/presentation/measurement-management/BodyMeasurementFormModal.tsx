import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Select from '../../../components/bootstrap/forms/Select';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import { createBodyMeasurementApi, updateBodyMeasurementApi, BodyMeasurement } from '../../../api/measurements.api';

type TModalMode = 'add' | 'edit';

interface IBodyMeasurementFormModalProps {
	mode: TModalMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	bodyMeasurements: BodyMeasurement[];
}

type TFormValues = {
	code: string;
	name: string;
	bodyArea: string;
	unit: 'INCHES' | 'CM';
	inputType: 'NUMBER' | 'TEXT';
	minValue: number | '';
	maxValue: number | '';
	displayOrder: number;
	instruction: string;
};

const BodyMeasurementFormModal: FC<IBodyMeasurementFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	bodyMeasurements,
}) => {
	const queryClient = useQueryClient();
	const isEditing = mode === 'edit';
	const bm = isEditing
		? bodyMeasurements.find((item) => item.id.toString() === id?.toString()) || null
		: null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			code: bm?.code || '',
			name: bm?.name || '',
			bodyArea: bm?.bodyArea || 'OTHER',
			unit: bm?.unit || 'INCHES',
			inputType: bm?.inputType || 'NUMBER',
			minValue: bm?.minValue ?? '',
			maxValue: bm?.maxValue ?? '',
			displayOrder: bm?.displayOrder || 0,
			instruction: bm?.instruction || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.code.trim()) errors.code = 'Code is required';
			if (!values.name.trim()) errors.name = 'Name is required';
			if (values.minValue !== '' && values.maxValue !== '' && Number(values.minValue) > Number(values.maxValue)) {
				errors.minValue = 'Must be less than Max Value';
				errors.maxValue = 'Must be greater than Min Value';
			}

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload: any = {
					code: values.code.trim(),
					name: values.name.trim(),
					bodyArea: values.bodyArea,
					unit: values.unit,
					inputType: values.inputType,
					displayOrder: Number(values.displayOrder),
					instruction: values.instruction.trim() || undefined,
				};

				if (values.minValue !== '') payload.minValue = Number(values.minValue);
				if (values.maxValue !== '') payload.maxValue = Number(values.maxValue);

				if (isEditing && id) {
					await updateBodyMeasurementApi(id, payload);
				} else {
					await createBodyMeasurementApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon
							icon={isEditing ? 'Edit' : 'Straighten'}
							size='lg'
							className='me-1'
						/>
						<span>Measurement Parameter {isEditing ? 'Updated' : 'Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['body-measurements'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save body measurement.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !bm && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='bm-form-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='bm-form-modal'>
					{isEditing ? `Edit Parameter - ${bm?.name}` : 'Create Parameter'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='code' label='Code' className='col-md-6'>
							<Input
								name='code'
								placeholder='e.g. CHEST_CIRC'
								value={formik.values.code}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.code}
								invalidFeedback={formik.errors.code}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='name' label='Name' className='col-md-6'>
							<Input
								name='name'
								placeholder='e.g. Chest Circumference'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup id='bodyArea' label='Body Area' className='col-md-4'>
							<Select
								name='bodyArea'
								value={formik.values.bodyArea}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value='UPPER_BODY'>Upper Body</option>
								<option value='LOWER_BODY'>Lower Body</option>
								<option value='FULL_BODY'>Full Body</option>
								<option value='OTHER'>Other</option>
							</Select>
						</FormGroup>
						<FormGroup id='unit' label='Unit' className='col-md-4'>
							<Select
								name='unit'
								value={formik.values.unit}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value='INCHES'>Inches</option>
								<option value='CM'>Centimeters</option>
							</Select>
						</FormGroup>
						<FormGroup id='inputType' label='Input Type' className='col-md-4'>
							<Select
								name='inputType'
								value={formik.values.inputType}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value='NUMBER'>Number</option>
								<option value='TEXT'>Text</option>
							</Select>
						</FormGroup>

						<FormGroup id='minValue' label='Min Value' className='col-md-4'>
							<Input
								name='minValue'
								type='number'
								step='0.01'
								placeholder='Optional'
								value={formik.values.minValue}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.minValue}
								invalidFeedback={formik.errors.minValue}
								disabled={formik.isSubmitting || formik.values.inputType !== 'NUMBER'}
							/>
						</FormGroup>
						<FormGroup id='maxValue' label='Max Value' className='col-md-4'>
							<Input
								name='maxValue'
								type='number'
								step='0.01'
								placeholder='Optional'
								value={formik.values.maxValue}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.maxValue}
								invalidFeedback={formik.errors.maxValue}
								disabled={formik.isSubmitting || formik.values.inputType !== 'NUMBER'}
							/>
						</FormGroup>
						<FormGroup id='displayOrder' label='Display Order' className='col-md-4'>
							<Input
								name='displayOrder'
								type='number'
								value={formik.values.displayOrder}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup id='instruction' label='Instructions' className='col-12'>
							<Textarea
								name='instruction'
								rows={2}
								placeholder='How to measure this part'
								value={formik.values.instruction}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon={isEditing ? 'Save' : 'Straighten'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Parameter' : 'Create Parameter'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default BodyMeasurementFormModal;

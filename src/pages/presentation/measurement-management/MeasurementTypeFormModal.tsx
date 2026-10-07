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
import {
	createMeasurementTypeApi,
	updateMeasurementTypeApi,
	MeasurementType,
} from '../../../api/measurements.api';

type TModalMode = 'add' | 'edit';

interface IMeasurementTypeFormModalProps {
	mode: TModalMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	measurementTypes: MeasurementType[];
}

type TFormValues = {
	code: string;
	name: string;
	garmentCategory: string;
	defaultUnit: 'INCHES' | 'CM';
	description: string;
};

const DEFAULT_GARMENT_CATEGORIES = ['Tops', 'Bottoms', 'Suits', 'Dresses', 'Outerwear', 'Uniforms'];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

const MeasurementTypeFormModal: FC<IMeasurementTypeFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	measurementTypes,
}) => {
	const queryClient = useQueryClient();
	const isEditing = mode === 'edit';
	const mt = isEditing
		? measurementTypes.find((item) => item.id.toString() === id?.toString()) || null
		: null;
	const garmentCategoryOptions = compactUnique([
		mt?.garmentCategory,
		...measurementTypes.map((item) => item.garmentCategory),
		...DEFAULT_GARMENT_CATEGORIES,
	]);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			code: mt?.code || '',
			name: mt?.name || '',
			garmentCategory: mt?.garmentCategory || '',
			defaultUnit: mt?.defaultUnit || 'INCHES',
			description: mt?.description || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.code.trim()) errors.code = 'Code is required';
			if (!values.name.trim()) errors.name = 'Name is required';
			if (!values.defaultUnit) errors.defaultUnit = 'Default Unit is required';

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					code: values.code.trim(),
					name: values.name.trim(),
					garmentCategory: values.garmentCategory.trim() || undefined,
					defaultUnit: values.defaultUnit,
					description: values.description.trim() || undefined,
				};

				if (isEditing && id) {
					await updateMeasurementTypeApi(id, payload);
				} else {
					await createMeasurementTypeApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon icon={isEditing ? 'Edit' : 'Straighten'} size='lg' className='me-1' />
						<span>Measurement Type {isEditing ? 'Updated' : 'Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['measurement-types'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save measurement type.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !mt && isOpen) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='mt-form-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='mt-form-modal'>
					{isEditing ? `Edit Measurement Type - ${mt?.name}` : 'Create Measurement Type'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='code' label='Code' className='col-md-6'>
							<Input
								name='code'
								placeholder='e.g. MENS_SHIRT'
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
								placeholder='e.g. Men`s Shirt Measurements'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup
							id='garmentCategory'
							label='Garment Category'
							className='col-md-6'>
							<Select
								name='garmentCategory'
								value={formik.values.garmentCategory}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value=''>Select garment category...</option>
								{garmentCategoryOptions.map((category) => (
									<option value={category} key={category}>
										{category}
									</option>
								))}
							</Select>
						</FormGroup>
						<FormGroup id='defaultUnit' label='Default Unit' className='col-md-6'>
							<Select
								name='defaultUnit'
								value={formik.values.defaultUnit}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value='INCHES'>Inches</option>
								<option value='CM'>Centimeters</option>
							</Select>
						</FormGroup>

						<FormGroup id='description' label='Description' className='col-12'>
							<Textarea
								name='description'
								rows={3}
								placeholder='Optional description'
								value={formik.values.description}
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
					{isEditing ? 'Update Template' : 'Create Template'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default MeasurementTypeFormModal;

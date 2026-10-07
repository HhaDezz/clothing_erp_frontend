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
import { createMaterialApi, updateMaterialApi, Material } from '../../../api/materials.api';

type TMaterialFormMode = 'add' | 'edit';

interface IMaterialFormModalProps {
	mode: TMaterialFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	materials: Material[];
}

type TFormValues = {
	materialCode: string;
	name: string;
	unit: string;
	materialType: string;
	reorderLevel: number | '';
	description: string;
};

const DEFAULT_UNITS = ['Meters', 'Yards', 'Pieces', 'Rolls', 'Kg', 'Grams', 'Liters', 'Boxes'];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

const MaterialFormModal: FC<IMaterialFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	materials,
}) => {
	const queryClient = useQueryClient();
	const isEditing = mode === 'edit';
	const material = isEditing
		? materials.find((item) => item.id.toString() === id?.toString()) || null
		: null;
	const unitOptions = compactUnique([
		material?.unit,
		...materials.map((item) => item.unit),
		...DEFAULT_UNITS,
	]);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			materialCode: material?.materialCode || '',
			name: material?.name || '',
			unit: material?.unit || 'Meters',
			materialType: material?.materialType || 'FABRIC',
			reorderLevel: material?.reorderLevel || 0,
			description: material?.description || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.materialCode.trim()) errors.materialCode = 'Material code is required';
			if (!values.name.trim()) errors.name = 'Material name is required';
			if (!values.unit.trim()) errors.unit = 'Unit is required';
			if (values.reorderLevel && Number(values.reorderLevel) < 0)
				errors.reorderLevel = 'Must be non-negative';

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					materialCode: values.materialCode.trim(),
					name: values.name.trim(),
					unit: values.unit.trim(),
					materialType: values.materialType.trim() || undefined,
					reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : undefined,
					description: values.description.trim() || undefined,
				};

				if (isEditing && id) {
					await updateMaterialApi(id, payload);
				} else {
					await createMaterialApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon
							icon={isEditing ? 'Edit' : 'Architecture'}
							size='lg'
							className='me-1'
						/>
						<span>{isEditing ? 'Material Updated' : 'Material Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['materials'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save material.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !material && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='material-form-modal'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='material-form-modal'>
					{isEditing ? `Edit Material - ${material?.name}` : 'Create Material'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='materialCode' label='Material Code' className='col-md-6'>
							<Input
								name='materialCode'
								placeholder='e.g. MAT-001'
								value={formik.values.materialCode}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.materialCode}
								invalidFeedback={formik.errors.materialCode}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='name' label='Material Name' className='col-md-6'>
							<Input
								name='name'
								placeholder='Enter material name'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup id='materialType' label='Material Type' className='col-md-6'>
							<Select
								name='materialType'
								value={formik.values.materialType}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value='FABRIC'>Fabric</option>
								<option value='LINING'>Lining</option>
								<option value='TRIM'>Trim</option>
								<option value='ACCESSORY'>Accessory</option>
								<option value='THREAD'>Thread</option>
								<option value='LABEL'>Label</option>
							</Select>
						</FormGroup>
						<FormGroup id='unit' label='Unit of Measure' className='col-md-6'>
							<Select
								name='unit'
								value={formik.values.unit}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.unit}
								invalidFeedback={formik.errors.unit}
								disabled={formik.isSubmitting}>
								<option value=''>Select unit...</option>
								{unitOptions.map((unit) => (
									<option value={unit} key={unit}>
										{unit}
									</option>
								))}
							</Select>
						</FormGroup>

						<FormGroup id='reorderLevel' label='Reorder Level' className='col-md-6'>
							<Input
								name='reorderLevel'
								type='number'
								step='0.01'
								placeholder='0.00'
								value={formik.values.reorderLevel}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.reorderLevel}
								invalidFeedback={formik.errors.reorderLevel}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup id='description' label='Description' className='col-12'>
							<Textarea
								name='description'
								rows={2}
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
					icon={isEditing ? 'Save' : 'Architecture'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Material' : 'Create Material'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default MaterialFormModal;

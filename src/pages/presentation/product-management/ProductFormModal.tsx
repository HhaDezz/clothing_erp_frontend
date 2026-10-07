import React, { FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import Checks from '../../../components/bootstrap/forms/Checks';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import { createProductApi, updateProductApi, Product } from '../../../api/products.api';
import { useMeasurementTypes } from '../../../hooks/useMeasurementTypes';
import { getBrandsApi } from '../../../api/brands.api';

type TProductFormMode = 'add' | 'edit';

interface IProductFormModalProps {
	mode: TProductFormMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	products: Product[];
}

type TFormValues = {
	styleCode: string;
	name: string;
	description: string;
	brand: string;
	category: string;
	garmentType: string;
	productType: 'READY_MADE' | 'SEW_AND_SELL';
	measurementTypeId: string;
	measurementRequired: boolean;
	season: string;
};

const DEFAULT_CATEGORIES = ['Shirts', 'Pants', 'Suits', 'Dresses', 'Skirts', 'Jackets', 'Uniforms'];
const DEFAULT_GARMENT_TYPES = [
	'Menswear',
	'Womenswear',
	'Kidswear',
	'Formalwear',
	'Casualwear',
	'Workwear',
];
const DEFAULT_SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

const ProductFormModal: FC<IProductFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	products,
}) => {
	const queryClient = useQueryClient();
	const { data: measurementTypes = [], isLoading: isLoadingMeasurementTypes } =
		useMeasurementTypes();
	const isEditing = mode === 'edit';
	const product = isEditing
		? products.find((item) => item.id.toString() === id?.toString()) || null
		: null;
	const categoryOptions = compactUnique([
		product?.category,
		...products.map((item) => item.category),
		...DEFAULT_CATEGORIES,
	]);
	const garmentTypeOptions = compactUnique([
		product?.garmentType,
		...products.map((item) => item.garmentType),
		...DEFAULT_GARMENT_TYPES,
	]);
	// Brands come from the managed Brands list (Master Data → Brands), active
	// ones only. This used to offer just the brands some other product
	// already had, so a new system had nothing to pick. The product being
	// edited keeps its own brand in the list even if that brand has since
	// been made inactive, so opening and saving it doesn't silently clear it.
	const { data: brands = [], isLoading: isLoadingBrands } = useQuery({
		queryKey: ['brands'],
		queryFn: getBrandsApi,
		enabled: isOpen,
	});
	const brandOptions = compactUnique([
		product?.brand,
		...brands.filter((brand) => brand.active).map((brand) => brand.name),
	]);
	const seasonOptions = compactUnique([
		product?.season,
		...products.map((item) => item.season),
		...DEFAULT_SEASONS,
	]);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			styleCode: product?.styleCode || '',
			name: product?.name || '',
			description: product?.description || '',
			brand: product?.brand || '',
			category: product?.category || '',
			garmentType: product?.garmentType || '',
			productType: product?.productType || 'READY_MADE',
			measurementTypeId: product?.measurementTypeId?.toString() || '',
			measurementRequired: product?.measurementRequired || false,
			season: product?.season || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.styleCode.trim()) errors.styleCode = 'Style code is required';
			if (!values.name.trim()) errors.name = 'Product name is required';
			if (!values.productType) errors.productType = 'Product type is required';
			if (values.productType === 'SEW_AND_SELL' && !values.measurementTypeId) {
				errors.measurementTypeId = 'Measurement type is required for sew & sell products';
			}

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					styleCode: values.styleCode.trim(),
					name: values.name.trim(),
					description: values.description.trim() || undefined,
					brand: values.brand.trim() || undefined,
					category: values.category.trim() || undefined,
					garmentType: values.garmentType.trim() || undefined,
					productType: values.productType,
					measurementTypeId:
						values.productType === 'SEW_AND_SELL'
							? Number(values.measurementTypeId)
							: undefined,
					measurementRequired:
						values.productType === 'SEW_AND_SELL' || values.measurementRequired,
					season: values.season.trim() || undefined,
				};

				if (isEditing && id) {
					await updateProductApi(id, payload);
				} else {
					await createProductApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon icon={isEditing ? 'Edit' : 'Checkroom'} size='lg' className='me-1' />
						<span>{isEditing ? 'Product Updated' : 'Product Created'}</span>
					</span>,
					`${values.name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['products'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save product.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !product && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='product-form-modal'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='product-form-modal'>
					{isEditing ? `Edit Product - ${product?.name}` : 'Create Product'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<FormGroup id='styleCode' label='Style Code' className='col-md-6'>
							<Input
								name='styleCode'
								placeholder='e.g. STY-001'
								value={formik.values.styleCode}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.styleCode}
								invalidFeedback={formik.errors.styleCode}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='name' label='Product Name' className='col-md-6'>
							<Input
								name='name'
								placeholder='Enter product name'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<FormGroup id='category' label='Category' className='col-md-6'>
							<Select
								ariaLabel='Category'
								name='category'
								value={formik.values.category}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value=''>Select category...</option>
								{categoryOptions.map((category) => (
									<option value={category} key={category}>
										{category}
									</option>
								))}
							</Select>
						</FormGroup>
						<FormGroup id='garmentType' label='Garment Type' className='col-md-6'>
							<Select
								ariaLabel='Garment type'
								name='garmentType'
								value={formik.values.garmentType}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value=''>Select garment type...</option>
								{garmentTypeOptions.map((garmentType) => (
									<option value={garmentType} key={garmentType}>
										{garmentType}
									</option>
								))}
							</Select>
						</FormGroup>

						<FormGroup id='productType' label='Product Type' className='col-md-6'>
							<Select
								ariaLabel='Product type'
								name='productType'
								value={formik.values.productType}
								onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
									const productType = event.target
										.value as TFormValues['productType'];
									formik.setFieldValue('productType', productType);
									if (productType === 'SEW_AND_SELL') {
										formik.setFieldValue('measurementRequired', true);
									} else {
										formik.setFieldValue('measurementTypeId', '');
									}
								}}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.productType}
								invalidFeedback={formik.errors.productType}
								disabled={formik.isSubmitting}>
								<option value='READY_MADE'>Ready Made (Retail)</option>
								<option value='SEW_AND_SELL'>Sew & Sell (Custom Made)</option>
							</Select>
						</FormGroup>

						{formik.values.productType === 'SEW_AND_SELL' && (
							<FormGroup
								id='measurementTypeId'
								label='Measurement Type / Template'
								className='col-md-6'>
								<Select
									ariaLabel='Measurement type'
									name='measurementTypeId'
									value={formik.values.measurementTypeId}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
									isValid={formik.isValid}
									isTouched={formik.touched.measurementTypeId}
									invalidFeedback={formik.errors.measurementTypeId}
									disabled={formik.isSubmitting || isLoadingMeasurementTypes}>
									<option value=''>
										Select the product measurement template
									</option>
									{measurementTypes
										.filter(
											(measurementType) =>
												measurementType.status === 'ACTIVE',
										)
										.map((measurementType) => (
											<option
												key={measurementType.id}
												value={measurementType.id.toString()}>
												{measurementType.name} (
												{measurementType.defaultUnit})
											</option>
										))}
								</Select>
								<small className='text-muted'>
									This template controls the measurements shown during order
									capture.
								</small>
							</FormGroup>
						)}

						<FormGroup id='brand' label='Brand' className='col-md-6'>
							<Select
								ariaLabel='Brand'
								name='brand'
								value={formik.values.brand}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting || isLoadingBrands}>
								<option value=''>
									{isLoadingBrands ? 'Loading brands...' : 'Select brand...'}
								</option>
								{brandOptions.map((brand) => (
									<option value={brand} key={brand}>
										{brand}
									</option>
								))}
							</Select>
							{!isLoadingBrands && brandOptions.length === 0 && (
								<small className='text-muted'>
									No brands yet — add them under Master Data → Brands.
								</small>
							)}
						</FormGroup>

						<FormGroup id='season' label='Season' className='col-md-6'>
							<Select
								ariaLabel='Season'
								name='season'
								value={formik.values.season}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value=''>Select season...</option>
								{seasonOptions.map((season) => (
									<option value={season} key={season}>
										{season}
									</option>
								))}
							</Select>
						</FormGroup>

						<FormGroup id='measurementRequired' label='Settings' className='col-md-6'>
							<Checks
								id='measurementRequired'
								name='measurementRequired'
								label='Requires Body Measurements'
								checked={formik.values.measurementRequired}
								onChange={formik.handleChange}
								disabled={
									formik.isSubmitting ||
									formik.values.productType === 'SEW_AND_SELL'
								}
							/>
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
					icon={isEditing ? 'Save' : 'Checkroom'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Product' : 'Create Product'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ProductFormModal;

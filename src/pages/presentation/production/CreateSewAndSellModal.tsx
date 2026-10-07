import React, { FC, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useQuery } from '@tanstack/react-query';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Spinner from '../../../components/bootstrap/Spinner';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import showNotification from '../../../components/extras/showNotification';
import { createSewAndSellOrderApi } from '../../../api/production.api';
import { formatCurrency } from '../../../helpers/currency';
import { createCustomerMeasurementApi, getCustomersApi } from '../../../api/customers.api';
import {
	getProductMeasurementTemplateApi,
	getProductsApi,
	ProductMeasurementTemplate,
} from '../../../api/products.api';
import { getMaterialsApi } from '../../../api/materials.api';
import { SewAndSellPreviewData } from './SewAndSellPreviewModal';

const getCustomerFirstName = (customer: any) => customer.first_name ?? customer.firstName ?? '';
const getCustomerLastName = (customer: any) => customer.last_name ?? customer.lastName ?? '';
const getCustomerFullName = (customer: any) =>
	`${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`.trim();

interface ICreateSewAndSellModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	onSuccess: (preview: SewAndSellPreviewData) => void;
}

type TFormValues = {
	productId: string;
	customerId: string;
	qty: number;
	unitPrice: number;
	advancePayment: number;
	expectedDate: string;
	fabricId: string;
	liningId: string;
	buttonId: string;
	designOptions: string;
	tailorNotes: string;
	notes: string;
	measurementValues: Record<number, string | number>;
};

const normalizeMeasurementValue = (value: unknown): string =>
	value === null || value === undefined ? '' : String(value).trim();

const formatMeasurementUnit = (unit?: 'INCHES' | 'CM') => (unit === 'CM' ? 'CM' : 'INCHES');

const CreateSewAndSellModal: FC<ICreateSewAndSellModalProps> = ({
	isOpen,
	setIsOpen,
	onSuccess,
}) => {
	const [measurementTemplate, setMeasurementTemplate] =
		useState<ProductMeasurementTemplate | null>(null);
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	const [templateError, setTemplateError] = useState('');

	const { data: customers = [] } = useQuery({
		queryKey: ['customers'],
		queryFn: getCustomersApi,
		enabled: isOpen,
	});
	const { data: products = [] } = useQuery({
		queryKey: ['products'],
		queryFn: getProductsApi,
		enabled: isOpen,
	});
	const { data: materials = [] } = useQuery({
		queryKey: ['materials'],
		queryFn: getMaterialsApi,
		enabled: isOpen,
	});

	const formik = useFormik<TFormValues>({
		initialValues: {
			productId: '',
			customerId: '',
			qty: 1,
			unitPrice: 0,
			advancePayment: 0,
			expectedDate: '',
			fabricId: '',
			liningId: '',
			buttonId: '',
			designOptions: '',
			tailorNotes: '',
			notes: '',
			measurementValues: {},
		},
		validationSchema: Yup.object({
			productId: Yup.string().required('Select a product before continuing'),
			customerId: Yup.string().required('Customer is required'),
			qty: Yup.number().integer().min(1).required('Quantity is required'),
			unitPrice: Yup.number().min(0).required('Price is required'),
			advancePayment: Yup.number()
				.min(0)
				.test(
					'not-more-than-total',
					'Advance must be less than the order total. Collect the final balance in POS.',
					(value, context) => {
						const total =
							Number(context.parent.qty || 0) * Number(context.parent.unitPrice || 0);
						const advance = Number(value || 0);
						if (total <= 0) return advance === 0;
						return advance < total;
					},
				),
			expectedDate: Yup.string().required('Expected delivery date is required'),
		}),
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (!measurementTemplate) {
				setTemplateError(
					'The selected product does not have a usable measurement template.',
				);
				setSubmitting(false);
				return;
			}

			const measurementErrors: Record<number, string> = {};
			measurementTemplate.fields.forEach((field) => {
				const rawValue = normalizeMeasurementValue(
					values.measurementValues[field.bodyMeasurementId],
				);
				if (field.isRequired && rawValue === '') {
					measurementErrors[field.bodyMeasurementId] =
						`${field.bodyMeasurementName} is required`;
					return;
				}
				if (field.inputType === 'NUMBER' && rawValue !== '') {
					const numericValue = Number(rawValue);
					if (Number.isNaN(numericValue)) {
						measurementErrors[field.bodyMeasurementId] = 'Enter a valid number';
					} else if (field.minValue !== undefined && numericValue < field.minValue) {
						measurementErrors[field.bodyMeasurementId] = `Minimum is ${field.minValue}`;
					} else if (field.maxValue !== undefined && numericValue > field.maxValue) {
						measurementErrors[field.bodyMeasurementId] = `Maximum is ${field.maxValue}`;
					}
				}
			});

			if (Object.keys(measurementErrors).length > 0) {
				Object.entries(measurementErrors).forEach(([fieldId, message]) => {
					formik.setFieldError(`measurementValues.${fieldId}`, message);
				});
				setSubmitting(false);
				return;
			}

			try {
				const measurement = await createCustomerMeasurementApi(values.customerId, {
					productId: Number(values.productId),
					measurementTypeId: measurementTemplate.id,
					notes: values.tailorNotes.trim() || undefined,
					values: measurementTemplate.fields
						.filter(
							(field) =>
								normalizeMeasurementValue(
									values.measurementValues[field.bodyMeasurementId],
								) !== '',
						)
						.map((field) => {
							const rawValue = normalizeMeasurementValue(
								values.measurementValues[field.bodyMeasurementId],
							);
							return {
								bodyMeasurementId: field.bodyMeasurementId,
								value: field.inputType === 'NUMBER' ? Number(rawValue) : rawValue,
								unit: field.defaultUnit || measurementTemplate.defaultUnit,
							};
						}),
				});

				const savedOrder = await createSewAndSellOrderApi({
					customerId: Number(values.customerId),
					productId: Number(values.productId),
					measurementId: measurement.id,
					qty: Number(values.qty),
					unitPrice: Number(values.unitPrice),
					advancePayment:
						Number(values.advancePayment) > 0
							? Number(values.advancePayment)
							: undefined,
					expectedDate: `${values.expectedDate}T00:00:00`,
					fabricId: values.fabricId ? Number(values.fabricId) : undefined,
					liningId: values.liningId ? Number(values.liningId) : undefined,
					buttonId: values.buttonId ? Number(values.buttonId) : undefined,
					designOptions: values.designOptions.trim() || undefined,
					tailorNotes: values.tailorNotes.trim() || undefined,
					notes: values.notes.trim() || undefined,
				});

				const selectedCustomer = customers.find(
					(customer) => customer.id === Number(values.customerId),
				);
				const selectedFabric = activeMaterials.find(
					(material) => material.id === Number(values.fabricId),
				);
				const selectedLining = activeMaterials.find(
					(material) => material.id === Number(values.liningId),
				);
				const selectedButton = activeMaterials.find(
					(material) => material.id === Number(values.buttonId),
				);

				onSuccess({
					orderNo: savedOrder.orderNo,
					customerName: selectedCustomer
						? getCustomerFullName(selectedCustomer)
						: 'Selected customer',
					product: {
						id: Number(selectedProduct?.id ?? values.productId),
						styleCode: selectedProduct?.styleCode || 'Selected product',
						name: selectedProduct?.name || 'Selected product',
						brand: selectedProduct?.brand,
						garmentType: selectedProduct?.garmentType,
						imageUrl: selectedProduct?.imageUrl,
					},
					measurementTemplate: {
						id: measurementTemplate.id,
						name: measurementTemplate.name,
						defaultUnit: formatMeasurementUnit(measurementTemplate.defaultUnit),
						fields: measurementTemplate.fields.map((field) => ({
							bodyMeasurementId: field.bodyMeasurementId,
							bodyMeasurementName: field.bodyMeasurementName,
							value:
								normalizeMeasurementValue(
									values.measurementValues[field.bodyMeasurementId],
								) || '—',
							unit: formatMeasurementUnit(
								field.defaultUnit || measurementTemplate.defaultUnit,
							),
							isRequired: field.isRequired,
							inputType: field.inputType,
							instruction: field.instruction,
						})),
					},
					quantity: Number(values.qty),
					unitPrice: Number(values.unitPrice),
					advancePayment: Number(values.advancePayment || 0),
					orderTotal,
					remainingBalance,
					expectedDate: values.expectedDate,
					materials: {
						fabric: selectedFabric
							? `${selectedFabric.materialCode} — ${selectedFabric.name}`
							: undefined,
						lining: selectedLining
							? `${selectedLining.materialCode} — ${selectedLining.name}`
							: undefined,
						button: selectedButton
							? `${selectedButton.materialCode} — ${selectedButton.name}`
							: undefined,
					},
					designOptions: values.designOptions.trim() || undefined,
					tailorNotes: values.tailorNotes.trim() || undefined,
					notes: values.notes.trim() || undefined,
				});

				showNotification(
					'Custom order created',
					'The measurement profile and sew-and-sell order were saved successfully.',
					'success',
				);
				resetForm();
				setMeasurementTemplate(null);
				setIsOpen(false);
			} catch (requestError: any) {
				showNotification(
					'Unable to create order',
					requestError?.response?.data?.message ||
						'The order could not be created. Check the entered details and try again.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	const handleProductChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
		const productId = event.target.value;
		formik.setFieldValue('productId', productId);
		formik.setFieldValue('customerId', '');
		formik.setFieldValue('measurementValues', {});
		setMeasurementTemplate(null);
		setTemplateError('');

		if (!productId) return;
		try {
			setIsLoadingTemplate(true);
			const template = await getProductMeasurementTemplateApi(productId);
			if (!template.fields?.length) {
				setTemplateError(
					'This product template has no measurement fields. Configure it in Measurement Setup.',
				);
				return;
			}
			setMeasurementTemplate({
				...template,
				fields: template.fields.slice().sort((a, b) => a.displayOrder - b.displayOrder),
			});
			formik.setFieldValue(
				'measurementValues',
				Object.fromEntries(template.fields.map((field) => [field.bodyMeasurementId, ''])),
			);
		} catch (requestError: any) {
			setTemplateError(
				requestError?.response?.data?.message ||
					'The measurement template could not be loaded for this product.',
			);
		} finally {
			setIsLoadingTemplate(false);
		}
	};

	const selectedProduct = products.find(
		(product) => product.id === Number(formik.values.productId),
	);
	const activeMaterials = materials.filter((material) => material.status === 'ACTIVE');
	const orderTotal = Number(formik.values.qty) * Number(formik.values.unitPrice);
	const remainingBalance = Math.max(0, orderTotal - Number(formik.values.advancePayment || 0));

	if (!isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='xl'
			titleId='new-sew-sell-title'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='new-sew-sell-title'>
					<Icon icon='ContentCut' className='me-2 text-primary' />
					New Sew &amp; Sell Order
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form id='sew-and-sell-form' onSubmit={formik.handleSubmit} noValidate>
					<div className='card border-primary border-opacity-25 mb-4'>
						<div className='card-header bg-primary bg-opacity-10 border-0'>
							<div className='d-flex align-items-center gap-2'>
								<span className='badge bg-primary rounded-circle'>1</span>
								<strong>Select the product/style first</strong>
							</div>
						</div>
						<div className='card-body'>
							<label className='form-label fw-bold' htmlFor='productId'>
								Sew &amp; Sell Product / Style *
							</label>
							<select
								id='productId'
								className={`form-select ${formik.touched.productId && formik.errors.productId ? 'is-invalid' : ''}`}
								name='productId'
								value={formik.values.productId}
								onChange={handleProductChange}
								onBlur={formik.handleBlur}
								disabled={formik.isSubmitting}>
								<option value=''>
									Select a product before taking measurements...
								</option>
								{products
									.filter(
										(product) =>
											product.status === 'ACTIVE' &&
											product.productType === 'SEW_AND_SELL' &&
											product.measurementRequired,
									)
									.map((product) => (
										<option key={product.id} value={product.id}>
											{product.styleCode} — {product.name}
										</option>
									))}
							</select>
							{formik.touched.productId && formik.errors.productId && (
								<div className='invalid-feedback d-block'>
									{formik.errors.productId}
								</div>
							)}
							{isLoadingTemplate && (
								<div className='small text-primary mt-2'>
									<Spinner isSmall className='me-2' /> Loading measurement
									template...
								</div>
							)}
							{templateError && (
								<div className='alert alert-danger mt-3 mb-0'>{templateError}</div>
							)}
							{selectedProduct && measurementTemplate && (
								<div className='alert alert-success mt-3 mb-0 d-flex align-items-center gap-2'>
									<Icon icon='CheckCircle' />
									<div>
										<strong>{measurementTemplate.name}</strong> loaded with{' '}
										{measurementTemplate.fields.length} measurement fields.
									</div>
								</div>
							)}
						</div>
					</div>

					<div className={`card mb-4 ${measurementTemplate ? '' : 'opacity-50'}`}>
						<div className='card-header bg-light border-0'>
							<div className='d-flex align-items-center gap-2'>
								<span className='badge bg-primary rounded-circle'>2</span>
								<strong>Select the customer</strong>
							</div>
						</div>
						<div className='card-body'>
							<label className='form-label fw-bold' htmlFor='customerId'>
								Customer *
							</label>
							<select
								id='customerId'
								className={`form-select ${formik.touched.customerId && formik.errors.customerId ? 'is-invalid' : ''}`}
								name='customerId'
								value={formik.values.customerId}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								disabled={!measurementTemplate || formik.isSubmitting}>
								<option value=''>Select customer...</option>
								{customers
									.filter((customer) => customer.status === 'ACTIVE')
									.map((customer) => (
										<option key={customer.id} value={customer.id}>
											{getCustomerFullName(customer) || 'Unnamed customer'} —{' '}
											{customer.phone || 'No phone'}
										</option>
									))}
							</select>
							{formik.touched.customerId && formik.errors.customerId && (
								<div className='invalid-feedback d-block'>
									{formik.errors.customerId}
								</div>
							)}
						</div>
					</div>

					{measurementTemplate && (
						<div className='card mb-4'>
							<div className='card-header bg-light border-0'>
								<div className='d-flex align-items-center gap-2'>
									<span className='badge bg-primary rounded-circle'>3</span>
									<strong>Capture required measurements</strong>
								</div>
							</div>
							<div className='card-body'>
								<div className='row g-3'>
									{measurementTemplate.fields.map((field) => {
										const fieldName = `measurementValues.${field.bodyMeasurementId}`;
										const fieldError = formik.getFieldMeta(fieldName).error;
										return (
											<div
												className='col-md-6 col-xl-4'
												key={field.bodyMeasurementId}>
												<label
													className='form-label fw-semibold'
													htmlFor={fieldName}>
													{field.bodyMeasurementName}
													{field.isRequired && (
														<span className='text-danger ms-1'>*</span>
													)}
												</label>
												<div className='input-group'>
													<input
														id={fieldName}
														type={
															field.inputType === 'NUMBER'
																? 'number'
																: 'text'
														}
														step={
															field.inputType === 'NUMBER'
																? '0.01'
																: undefined
														}
														min={field.minValue}
														max={field.maxValue}
														className={`form-control ${fieldError ? 'is-invalid' : ''}`}
														name={fieldName}
														value={
															formik.values.measurementValues[
																field.bodyMeasurementId
															] ?? ''
														}
														onChange={(event) =>
															formik.setFieldValue(
																fieldName,
																event.target.value,
															)
														}
														disabled={
															!formik.values.customerId ||
															formik.isSubmitting
														}
													/>
													<span className='input-group-text'>
														{field.defaultUnit === 'CM' ? 'cm' : 'in'}
													</span>
												</div>
												{fieldError && (
													<div className='text-danger small mt-1'>
														{fieldError}
													</div>
												)}
												{field.instruction && (
													<small className='text-muted'>
														{field.instruction}
													</small>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					<div className={`card mb-3 ${formik.values.customerId ? '' : 'opacity-50'}`}>
						<div className='card-header bg-light border-0'>
							<div className='d-flex align-items-center gap-2'>
								<span className='badge bg-primary rounded-circle'>4</span>
								<strong>Materials, pricing and delivery</strong>
							</div>
						</div>
						<div className='card-body'>
							<div className='row g-3'>
								{[
									{
										name: 'fabricId',
										label: 'Fabric',
										placeholder: 'Select fabric...',
									},
									{
										name: 'liningId',
										label: 'Lining',
										placeholder: 'Select lining...',
									},
									{
										name: 'buttonId',
										label: 'Buttons / Trims',
										placeholder: 'Select trim...',
									},
								].map((selector) => (
									<div className='col-md-4' key={selector.name}>
										<label
											className='form-label fw-semibold'
											htmlFor={selector.name}>
											{selector.label}
										</label>
										<select
											id={selector.name}
											className='form-select'
											name={selector.name}
											value={formik.values[selector.name as 'fabricId']}
											onChange={formik.handleChange}
											disabled={
												!formik.values.customerId || formik.isSubmitting
											}>
											<option value=''>{selector.placeholder}</option>
											{activeMaterials.map((material) => (
												<option key={material.id} value={material.id}>
													{material.materialCode} — {material.name}
												</option>
											))}
										</select>
									</div>
								))}

								<div className='col-md-4'>
									<label className='form-label fw-semibold' htmlFor='qty'>
										Quantity *
									</label>
									<input
										id='qty'
										type='number'
										className='form-control'
										name='qty'
										min={1}
										value={formik.values.qty}
										onChange={formik.handleChange}
									/>
								</div>
								<div className='col-md-4'>
									<label className='form-label fw-semibold' htmlFor='unitPrice'>
										Unit Price *
									</label>
									<input
										id='unitPrice'
										type='number'
										className='form-control'
										name='unitPrice'
										min={0}
										step='0.01'
										value={formik.values.unitPrice}
										onChange={formik.handleChange}
									/>
								</div>
								<div className='col-md-4'>
									<label
										className='form-label fw-semibold'
										htmlFor='advancePayment'>
										Advance Payment
									</label>
									<input
										id='advancePayment'
										type='number'
										className='form-control'
										name='advancePayment'
										min={0}
										max={orderTotal}
										step='0.01'
										value={formik.values.advancePayment}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
									/>
									<div className='form-text'>
										Collect only the advance here. Final balance is paid in POS.
									</div>
									{formik.touched.advancePayment &&
										formik.errors.advancePayment && (
											<div className='text-danger small mt-1'>
												{formik.errors.advancePayment}
											</div>
										)}
								</div>
								<div className='col-md-4'>
									<label
										className='form-label fw-semibold'
										htmlFor='expectedDate'>
										Expected Delivery *
									</label>
									<input
										id='expectedDate'
										type='date'
										className='form-control'
										name='expectedDate'
										value={formik.values.expectedDate}
										onChange={formik.handleChange}
									/>
								</div>
								<div className='col-md-8'>
									<label
										className='form-label fw-semibold'
										htmlFor='designOptions'>
										Design Options
									</label>
									<input
										id='designOptions'
										type='text'
										className='form-control'
										name='designOptions'
										placeholder='Collar, cuff, pocket, fit or style options'
										value={formik.values.designOptions}
										onChange={formik.handleChange}
									/>
								</div>
								<div className='col-md-6'>
									<label className='form-label fw-semibold' htmlFor='tailorNotes'>
										Tailor / Fit Notes
									</label>
									<textarea
										id='tailorNotes'
										className='form-control'
										name='tailorNotes'
										rows={2}
										value={formik.values.tailorNotes}
										onChange={formik.handleChange}
									/>
								</div>
								<div className='col-md-6'>
									<label className='form-label fw-semibold' htmlFor='notes'>
										Order Notes
									</label>
									<textarea
										id='notes'
										className='form-control'
										name='notes'
										rows={2}
										value={formik.values.notes}
										onChange={formik.handleChange}
									/>
								</div>
							</div>
						</div>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex justify-content-between'>
				<div>
					<span className='text-muted me-2'>Order total:</span>
					<strong>{formatCurrency(orderTotal)}</strong>
					<span className='text-muted ms-3 me-2'>Balance after advance:</span>
					<strong>{formatCurrency(remainingBalance)}</strong>
				</div>
				<div className='d-flex gap-2'>
					<Button
						color='light'
						onClick={() => setIsOpen(false)}
						isDisable={formik.isSubmitting}>
						Cancel
					</Button>
					<Button
						color='primary'
						type='submit'
						icon='Save'
						isDisable={
							formik.isSubmitting || !measurementTemplate || !formik.values.customerId
						}
						onClick={() => formik.handleSubmit()}>
						{formik.isSubmitting ? 'Creating Order...' : 'Create Measurement Order'}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default CreateSewAndSellModal;

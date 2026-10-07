import React, { FC, useEffect, useRef, useState } from 'react';
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
import Select from '../../../components/bootstrap/forms/Select';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import VariantImageThumbnail from '../../../components/common/VariantImageThumbnail';
import { useVariants } from '../../../hooks/useVariants';
import { formatCurrency } from '../../../helpers/currency';
import {
	createVariantApi,
	updateVariantApi,
	deleteVariantApi,
	uploadVariantImageApi,
	Variant,
} from '../../../api/products.api';
import { createStockInApi } from '../../../api/inventory.api';
import { getWarehousesApi } from '../../../api/purchasing.api';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import { getApiErrorMessage } from '../../../utils/apiError';

interface IProductVariantsModalProps {
	productId: string | null;
	productName: string | null;
	productType?: 'READY_MADE' | 'SEW_AND_SELL';
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

type TFormValues = {
	sku: string;
	size: string;
	color: string;
	sellingPrice: number | '';
	costPrice: number | '';
};

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const DEFAULT_COLORS = ['Black', 'White', 'Navy', 'Blue', 'Red', 'Green', 'Grey', 'Beige', 'Brown'];

const compactUnique = (values: unknown[]) =>
	Array.from(
		new Set(
			values
				.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
				.filter(Boolean),
		),
	);

const ProductVariantsModal: FC<IProductVariantsModalProps> = ({
	productId,
	productName,
	productType,
	isOpen,
	setIsOpen,
}) => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canAddStock =
		productType === 'READY_MADE' && hasPermission(PERMISSIONS.CREATE_INVENTORY_STOCK_IN);
	const { data: variants = [], isLoading } = useVariants(productId);
	const { data: warehouses = [] } = useQuery({
		queryKey: ['warehouses'],
		queryFn: getWarehousesApi,
		enabled: isOpen && canAddStock,
	});

	const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [stockVariant, setStockVariant] = useState<Variant | null>(null);

	// Photo picked before the variant exists yet (create flow only — an
	// existing variant being edited already has an id, so it uses
	// VariantImageThumbnail directly instead, same as the list column).
	const [newVariantPhoto, setNewVariantPhoto] = useState<File | null>(null);
	const [newVariantPhotoPreview, setNewVariantPhotoPreview] = useState<string | null>(null);
	const newVariantPhotoInputRef = useRef<HTMLInputElement>(null);

	const resetNewVariantPhoto = () => {
		setNewVariantPhoto(null);
		setNewVariantPhotoPreview((current) => {
			if (current) URL.revokeObjectURL(current);
			return null;
		});
	};

	// Revoke the preview object URL on unmount only.
	useEffect(
		() => () => {
			setNewVariantPhotoPreview((current) => {
				if (current) URL.revokeObjectURL(current);
				return current;
			});
		},
		[],
	);

	const handleNewVariantPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			showNotification('Invalid file', 'Please choose an image file.', 'danger');
			return;
		}
		setNewVariantPhotoPreview((current) => {
			if (current) URL.revokeObjectURL(current);
			return URL.createObjectURL(file);
		});
		setNewVariantPhoto(file);
	};
	const sizeOptions = compactUnique([
		editingVariant?.size,
		...variants.map((variant) => variant.size),
		...DEFAULT_SIZES,
	]);
	const colorOptions = compactUnique([
		editingVariant?.color,
		...variants.map((variant) => variant.color),
		...DEFAULT_COLORS,
	]);

	const stockFormik = useFormik({
		enableReinitialize: true,
		initialValues: {
			warehouseId: warehouses.find((warehouse) => warehouse.status !== 'INACTIVE')?.id || '',
			qty: 1,
			unitCost: stockVariant?.costPrice || 0,
			notes: '',
		},
		validate: (values) => {
			const errors: Record<string, string> = {};
			if (!values.warehouseId) errors.warehouseId = 'Warehouse is required';
			if (Number(values.qty) <= 0) errors.qty = 'Quantity must be greater than zero';
			if (Number(values.unitCost) < 0) errors.unitCost = 'Unit cost cannot be negative';
			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (!stockVariant) return;
			try {
				await createStockInApi({
					itemType: 'VARIANT',
					itemId: stockVariant.id,
					warehouseId: Number(values.warehouseId),
					quantity: Number(values.qty),
					referenceType: 'INITIAL_STOCK',
					unitCost: Number(values.unitCost) || undefined,
					notes: values.notes.trim() || undefined,
				});
				showNotification(
					'Stock added',
					`${values.qty} unit(s) were added for ${stockVariant.sku}.`,
					'success',
				);
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] }),
					queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] }),
					queryClient.invalidateQueries({ queryKey: ['inventoryStock'] }),
				]);
				resetForm();
				setStockVariant(null);
			} catch (error) {
				showNotification(
					'Unable to add stock',
					getApiErrorMessage(error, 'The stock-in transaction could not be created.'),
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			sku: editingVariant?.sku || '',
			size: editingVariant?.size || '',
			color: editingVariant?.color || '',
			sellingPrice: editingVariant?.sellingPrice || '',
			costPrice: editingVariant?.costPrice || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.sellingPrice) errors.sellingPrice = 'Selling price is required';
			else if (Number(values.sellingPrice) < 0) errors.sellingPrice = 'Must be positive';

			if (values.costPrice && Number(values.costPrice) < 0)
				errors.costPrice = 'Must be positive';

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (!productId) return;

			try {
				const payload = {
					sku: values.sku.trim() || undefined,
					size: values.size.trim() || undefined,
					color: values.color.trim() || undefined,
					sellingPrice: Number(values.sellingPrice),
					costPrice: values.costPrice ? Number(values.costPrice) : undefined,
				};

				if (editingVariant) {
					await updateVariantApi(editingVariant.id, payload);
				} else {
					const created = await createVariantApi(productId, payload);
					if (newVariantPhoto && created?.data?.id) {
						try {
							await uploadVariantImageApi(created.data.id, newVariantPhoto);
						} catch (photoError) {
							showNotification(
								'Photo not uploaded',
								getApiErrorMessage(
									photoError,
									'The variant was created but the photo could not be uploaded. You can add it from the variant list.',
								),
								'warning',
							);
						}
					}
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon icon='Save' size='lg' className='me-1' />
						<span>Variant {editingVariant ? 'Updated' : 'Created'}</span>
					</span>,
					'Variant saved successfully.',
					'success',
				);

				resetForm();
				setShowForm(false);
				setEditingVariant(null);
				resetNewVariantPhoto();
				await queryClient.invalidateQueries({ queryKey: ['variants', productId] });
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save variant.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	const handleDelete = async (id: number) => {
		if (!productId) return;
		if (window.confirm('Are you sure you want to delete this variant?')) {
			try {
				await deleteVariantApi(id);
				showNotification('Success', 'Variant deleted successfully.', 'success');
				await queryClient.invalidateQueries({ queryKey: ['variants', productId] });
			} catch {
				showNotification('Error', 'Failed to delete variant.', 'danger');
			}
		}
	};

	const columns: DataTableColumn<Variant>[] = [
		{
			key: 'photo',
			label: 'Photo',
			sortable: false,
			searchable: false,
			render: (v) => <VariantImageThumbnail variantId={v.id} />,
		},
		{ key: 'sku', label: 'SKU' },
		{ key: 'size', label: 'Size', render: (v) => v.size || '—' },
		{ key: 'color', label: 'Color', render: (v) => v.color || '—' },
		{
			key: 'sellingPrice',
			label: 'Price',
			render: (v) => formatCurrency(v.sellingPrice),
		},
		{
			key: 'costPrice',
			label: 'Cost',
			render: (v) => (v.costPrice ? formatCurrency(v.costPrice) : '—'),
		},
	];

	if (!productId && isOpen) return null;

	return (
		<>
			<Modal
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				size='lg'
				titleId='product-variants-modal'
				isCentered
				isScrollable>
				<ModalHeader setIsOpen={setIsOpen} className='p-4'>
					<ModalTitle id='product-variants-modal'>Variants - {productName}</ModalTitle>
				</ModalHeader>
				<ModalBody className='px-4'>
					{!showForm ? (
						<>
							<div className='d-flex justify-content-end mb-3'>
								<Button
									color='primary'
									icon='Add'
									onClick={() => {
										setEditingVariant(null);
										resetNewVariantPhoto();
										setShowForm(true);
									}}>
									Add Variant
								</Button>
							</div>
							<DataTable
								columns={[
									...columns,
									{
										key: 'actions',
										label: '',
										align: 'right',
										sortable: false,
										searchable: false,
										render: (variant) => (
											<DataTableActionMenu
												actions={[
													...(canAddStock
														? [
																{
																	key: 'stock-in',
																	label: 'Add Stock',
																	icon: 'ti ti-package-import',
																	className: 'text-success',
																	onClick: () =>
																		setStockVariant(variant),
																},
															]
														: []),
													{
														key: 'edit',
														label: 'Edit',
														icon: 'ti ti-edit',
														className: 'text-primary',
														onClick: () => {
															setEditingVariant(variant);
															resetNewVariantPhoto();
															setShowForm(true);
														},
													},
													{
														key: 'delete',
														label: 'Delete',
														icon: 'ti ti-trash',
														className: 'text-danger',
														onClick: () => handleDelete(variant.id),
													},
												]}
											/>
										),
									},
								]}
								data={variants}
								rowKey='id'
								loading={isLoading}
								showActions={false}
							/>
						</>
					) : (
						<form onSubmit={formik.handleSubmit}>
							<div className='mb-4'>
								<label className='form-label fw-semibold d-block'>Photo</label>
								{editingVariant ? (
									<VariantImageThumbnail variantId={editingVariant.id} size={80} />
								) : (
									<div className='d-flex align-items-center gap-2'>
										<div
											className='position-relative d-inline-flex align-items-center justify-content-center rounded border bg-light overflow-hidden'
											style={{
												width: 80,
												height: 80,
												cursor: 'pointer',
												flexShrink: 0,
											}}
											onClick={() => newVariantPhotoInputRef.current?.click()}
											role='button'
											tabIndex={0}
											title={
												newVariantPhotoPreview
													? 'Click to replace photo'
													: 'Click to add a photo'
											}>
											{newVariantPhotoPreview ? (
												<img
													src={newVariantPhotoPreview}
													alt='New variant'
													style={{
														width: '100%',
														height: '100%',
														objectFit: 'cover',
													}}
												/>
											) : (
												<Icon icon='AddAPhoto' size='lg' color='secondary' />
											)}
											{newVariantPhotoPreview && (
												<button
													type='button'
													className='btn btn-danger position-absolute p-0 d-flex align-items-center justify-content-center'
													style={{
														top: -6,
														right: -6,
														width: 20,
														height: 20,
														borderRadius: '50%',
														lineHeight: 1,
														border: 'none',
													}}
													onClick={(e) => {
														e.stopPropagation();
														resetNewVariantPhoto();
													}}
													aria-label='Remove selected photo'>
													<Icon icon='Close' style={{ fontSize: 14 }} />
												</button>
											)}
											<input
												ref={newVariantPhotoInputRef}
												type='file'
												accept='image/*'
												className='d-none'
												onChange={handleNewVariantPhotoChange}
											/>
										</div>
										<small className='text-muted'>Optional — you can also add this later.</small>
									</div>
								)}
							</div>
							<div className='row g-4'>
								<FormGroup
									id='sku'
									label='SKU (Auto-generated if empty)'
									className='col-md-4'>
									<Input
										name='sku'
										placeholder='e.g. VAR-001'
										value={formik.values.sku}
										onChange={formik.handleChange}
										disabled={formik.isSubmitting}
									/>
								</FormGroup>
								<FormGroup id='size' label='Size' className='col-md-4'>
									<Select
										name='size'
										value={formik.values.size}
										onChange={formik.handleChange}
										disabled={formik.isSubmitting}>
										<option value=''>Select size...</option>
										{sizeOptions.map((size) => (
											<option value={size} key={size}>
												{size}
											</option>
										))}
									</Select>
								</FormGroup>
								<FormGroup id='color' label='Color' className='col-md-4'>
									<Select
										name='color'
										value={formik.values.color}
										onChange={formik.handleChange}
										disabled={formik.isSubmitting}>
										<option value=''>Select color...</option>
										{colorOptions.map((color) => (
											<option value={color} key={color}>
												{color}
											</option>
										))}
									</Select>
								</FormGroup>
								<FormGroup
									id='sellingPrice'
									label='Selling Price'
									className='col-md-6'>
									<Input
										name='sellingPrice'
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formik.values.sellingPrice}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										isValid={formik.isValid}
										isTouched={formik.touched.sellingPrice}
										invalidFeedback={formik.errors.sellingPrice}
										disabled={formik.isSubmitting}
									/>
								</FormGroup>
								<FormGroup id='costPrice' label='Cost Price' className='col-md-6'>
									<Input
										name='costPrice'
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formik.values.costPrice}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										isValid={formik.isValid}
										isTouched={formik.touched.costPrice}
										invalidFeedback={formik.errors.costPrice}
										disabled={formik.isSubmitting}
									/>
								</FormGroup>
							</div>
							<div className='d-flex gap-2 mt-4 justify-content-end'>
								<Button
									color='light'
									onClick={() => {
										setShowForm(false);
										setEditingVariant(null);
										resetNewVariantPhoto();
										formik.resetForm();
									}}>
									Cancel
								</Button>
								<Button
									color='primary'
									icon='Save'
									isDisable={formik.isSubmitting}
									type='submit'>
									{editingVariant ? 'Update Variant' : 'Create Variant'}
								</Button>
							</div>
						</form>
					)}
				</ModalBody>
				{!showForm && (
					<ModalFooter className='px-4 pb-4'>
						<Button color='light' onClick={() => setIsOpen(false)}>
							Close
						</Button>
					</ModalFooter>
				)}
			</Modal>

			<Modal
				isOpen={Boolean(stockVariant)}
				setIsOpen={(open) => {
					if (!open) setStockVariant(null);
				}}
				size='md'
				isCentered>
				<form onSubmit={stockFormik.handleSubmit}>
					<ModalHeader setIsOpen={() => setStockVariant(null)}>
						<ModalTitle id='variant-stock-in-title'>
							<Icon icon='Inventory' className='me-2 text-success' />
							Add Stock — {stockVariant?.sku}
						</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<div className='row g-3'>
							<div className='col-12'>
								<label
									className='form-label fw-semibold'
									htmlFor='stockWarehouseId'>
									Warehouse *
								</label>
								<select
									id='stockWarehouseId'
									name='warehouseId'
									className={`form-select ${stockFormik.touched.warehouseId && stockFormik.errors.warehouseId ? 'is-invalid' : ''}`}
									value={stockFormik.values.warehouseId}
									onChange={stockFormik.handleChange}
									onBlur={stockFormik.handleBlur}>
									<option value=''>Select warehouse...</option>
									{warehouses
										.filter((warehouse) => warehouse.status !== 'INACTIVE')
										.map((warehouse) => (
											<option value={warehouse.id} key={warehouse.id}>
												{warehouse.name}
											</option>
										))}
								</select>
								{stockFormik.touched.warehouseId &&
									stockFormik.errors.warehouseId && (
										<div className='invalid-feedback d-block'>
											{stockFormik.errors.warehouseId}
										</div>
									)}
							</div>
							<div className='col-sm-6'>
								<label className='form-label fw-semibold' htmlFor='stockQty'>
									Quantity *
								</label>
								<input
									id='stockQty'
									name='qty'
									type='number'
									min={1}
									step={1}
									className='form-control'
									value={stockFormik.values.qty}
									onChange={stockFormik.handleChange}
								/>
							</div>
							<div className='col-sm-6'>
								<label className='form-label fw-semibold' htmlFor='stockUnitCost'>
									Unit Cost
								</label>
								<input
									id='stockUnitCost'
									name='unitCost'
									type='number'
									min={0}
									step='0.01'
									className='form-control'
									value={stockFormik.values.unitCost}
									onChange={stockFormik.handleChange}
								/>
							</div>
							<div className='col-12'>
								<label className='form-label fw-semibold' htmlFor='stockNotes'>
									Notes
								</label>
								<textarea
									id='stockNotes'
									name='notes'
									className='form-control'
									rows={2}
									value={stockFormik.values.notes}
									onChange={stockFormik.handleChange}
								/>
							</div>
						</div>
					</ModalBody>
					<ModalFooter>
						<Button type='button' color='light' onClick={() => setStockVariant(null)}>
							Cancel
						</Button>
						<Button
							type='submit'
							color='success'
							icon='Add'
							isDisable={stockFormik.isSubmitting}>
							{stockFormik.isSubmitting ? 'Adding...' : 'Add Stock'}
						</Button>
					</ModalFooter>
				</form>
			</Modal>
		</>
	);
};

export default ProductVariantsModal;

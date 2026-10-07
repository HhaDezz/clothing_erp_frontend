import React, { FC, useState } from 'react';
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
import Select from '../../../components/bootstrap/forms/Select';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useBom } from '../../../hooks/useBom';
import { useMaterials } from '../../../hooks/useMaterials';
import { addBomItemApi, updateBomItemApi, removeBomItemApi, BomItem } from '../../../api/products.api';

interface IProductBomModalProps {
	productId: string | null;
	productName: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

type TFormValues = {
	materialId: string;
	consumptionQty: number | '';
	wastagePercent: number | '';
	notes: string;
};

const ProductBomModal: FC<IProductBomModalProps> = ({
	productId,
	productName,
	isOpen,
	setIsOpen,
}) => {
	const queryClient = useQueryClient();
	const { data: bomItems = [], isLoading } = useBom(productId);
	const { data: materials = [], isLoading: materialsLoading } = useMaterials();

	const [editingBom, setEditingBom] = useState<BomItem | null>(null);
	const [showForm, setShowForm] = useState(false);

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			materialId: editingBom?.materialId.toString() || '',
			consumptionQty: editingBom?.consumptionQty || '',
			wastagePercent: editingBom?.wastagePercent || 0,
			notes: editingBom?.notes || '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.materialId) errors.materialId = 'Material is required';
			if (!values.consumptionQty) errors.consumptionQty = 'Consumption quantity is required';
			else if (Number(values.consumptionQty) <= 0) errors.consumptionQty = 'Must be greater than 0';

			if (values.wastagePercent && Number(values.wastagePercent) < 0) errors.wastagePercent = 'Cannot be negative';

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			if (!productId) return;

			try {
				const payload = {
					materialId: Number(values.materialId),
					consumptionQty: Number(values.consumptionQty),
					wastagePercent: values.wastagePercent ? Number(values.wastagePercent) : undefined,
					notes: values.notes.trim() || undefined,
				};

				if (editingBom) {
					await updateBomItemApi(productId, editingBom.id, payload);
				} else {
					await addBomItemApi(productId, payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon icon='Save' size='lg' className='me-1' />
						<span>BOM Item {editingBom ? 'Updated' : 'Created'}</span>
					</span>,
					'BOM saved successfully.',
					'success',
				);

				resetForm();
				setShowForm(false);
				setEditingBom(null);
				await queryClient.invalidateQueries({ queryKey: ['bom', productId] });
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save BOM item.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	const handleDelete = async (id: number) => {
		if (!productId) return;
		if (window.confirm('Are you sure you want to remove this material from BOM?')) {
			try {
				await removeBomItemApi(productId, id);
				showNotification('Success', 'Material removed successfully.', 'success');
				await queryClient.invalidateQueries({ queryKey: ['bom', productId] });
			} catch (error) {
				showNotification('Error', 'Failed to remove material.', 'danger');
			}
		}
	};

	const columns: DataTableColumn<BomItem>[] = [
		{ key: 'materialCode', label: 'Item Code', render: (b) => <span className='fw-bold'>{b.materialCode}</span> },
		{ key: 'materialName', label: 'Material Name' },
		{ key: 'consumptionQty', label: 'Qty', render: (b) => `${b.consumptionQty} ${b.materialUnit}` },
		{ key: 'wastagePercent', label: 'Wastage', render: (b) => b.wastagePercent ? `${b.wastagePercent}%` : '—' },
	];

	if (!productId && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='product-bom-modal'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='product-bom-modal'>
					Bill of Materials (BOM) - {productName}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				{!showForm ? (
					<>
						<div className='d-flex justify-content-end mb-3'>
							<Button color='primary' icon='Add' onClick={() => {
								setEditingBom(null);
								setShowForm(true);
							}}>
								Add Material
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
									render: (bomItem) => (
										<DataTableActionMenu
											actions={[
												{
													key: 'edit',
													label: 'Edit',
													icon: 'ti ti-edit',
													className: 'text-primary',
													onClick: () => {
														setEditingBom(bomItem);
														setShowForm(true);
													},
												},
												{
													key: 'delete',
													label: 'Remove',
													icon: 'ti ti-trash',
													className: 'text-danger',
													onClick: () => handleDelete(bomItem.id),
												},
											]}
										/>
									),
								},
							]}
							data={bomItems}
							rowKey='id'
							loading={isLoading}
							showActions={false}
						/>
					</>
				) : (
					<form onSubmit={formik.handleSubmit}>
						<div className='row g-4'>
							<FormGroup id='materialId' label='Material' className='col-12'>
								<Select
									name='materialId'
									value={formik.values.materialId}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
									isValid={formik.isValid}
									isTouched={formik.touched.materialId}
									invalidFeedback={formik.errors.materialId}
									disabled={formik.isSubmitting || !!editingBom}>
									<option value=''>Select a material...</option>
									{!materialsLoading && materials.map((m) => (
										<option key={m.id} value={m.id}>{m.materialCode} - {m.name} ({m.unit})</option>
									))}
								</Select>
							</FormGroup>
							<FormGroup id='consumptionQty' label='Consumption Qty' className='col-md-6'>
								<Input
									name='consumptionQty'
									type='number'
									step='0.0001'
									placeholder='0.00'
									value={formik.values.consumptionQty}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
									isValid={formik.isValid}
									isTouched={formik.touched.consumptionQty}
									invalidFeedback={formik.errors.consumptionQty}
									disabled={formik.isSubmitting}
								/>
							</FormGroup>
							<FormGroup id='wastagePercent' label='Wastage %' className='col-md-6'>
								<Input
									name='wastagePercent'
									type='number'
									step='0.01'
									placeholder='0.00'
									value={formik.values.wastagePercent}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur}
									isValid={formik.isValid}
									isTouched={formik.touched.wastagePercent}
									invalidFeedback={formik.errors.wastagePercent}
									disabled={formik.isSubmitting}
								/>
							</FormGroup>
							<FormGroup id='notes' label='Notes' className='col-12'>
								<Textarea
									name='notes'
									rows={2}
									placeholder='Optional instructions or notes'
									value={formik.values.notes}
									onChange={formik.handleChange}
									disabled={formik.isSubmitting}
								/>
							</FormGroup>
						</div>
						<div className='d-flex gap-2 mt-4 justify-content-end'>
							<Button color='light' onClick={() => {
								setShowForm(false);
								setEditingBom(null);
								formik.resetForm();
							}}>
								Cancel
							</Button>
							<Button color='primary' icon='Save' isDisable={formik.isSubmitting} type='submit'>
								{editingBom ? 'Update BOM' : 'Add to BOM'}
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
	);
};

export default ProductBomModal;

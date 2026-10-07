import React, { useEffect, useMemo } from 'react';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import { useQuery } from '@tanstack/react-query';
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
import Label from '../../../components/bootstrap/forms/Label';
import Icon from '../../../components/icon/Icon';
import VariantSearchSelect from '../../../components/common/VariantSearchSelect';
import { useProducts } from '../../../hooks/useProducts';
import { useAllVariants } from '../../../hooks/useVariants';
import { usePermission } from '../../../hooks/usePermission';
import { getShowroomsApi } from '../../../api/showrooms.api';
import { GoodsTransferCreatePayload } from '../../../api/goodsTransfer.api';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: GoodsTransferCreatePayload) => void;
	isLoading: boolean;
}

type LineValue = { variantId: number | null; quantity: number | '' };

type FormValues = {
	showroomId: number | '';
	notes: string;
	items: LineValue[];
};

const emptyItem: LineValue = { variantId: null, quantity: '' };

/**
 * Step 1 of the Goods-to-Showroom workflow: "Showroom User creates item
 * request". A Showroom is a Warehouse row of type SHOWROOM under the hood,
 * so the same warehouse-access assignment (usePermission().warehouseIds)
 * restricts which showroom(s) a user can request for — unrestricted users
 * (SUPER_ADMIN, or nobody assigned) get a picker; a user assigned to
 * exactly one showroom has it pre-selected and locked.
 */
const CreateGoodsTransferModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading }) => {
	const { data: products } = useProducts();
	const { data: variants } = useAllVariants();
	const { data: showrooms = [] } = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });
	const { isSuperAdmin, warehouseIds } = usePermission();

	const selectableShowrooms = useMemo(() => {
		if (isSuperAdmin || warehouseIds.length === 0) return showrooms;
		return showrooms.filter((s) => warehouseIds.includes(s.id));
	}, [showrooms, isSuperAdmin, warehouseIds]);

	const formik = useFormik<FormValues>({
		initialValues: {
			showroomId: '',
			notes: '',
			items: [{ ...emptyItem }],
		},
		enableReinitialize: true,
		onSubmit: (values, { resetForm }) => {
			if (!values.showroomId) return;
			const items = values.items
				.filter((i) => i.variantId != null && Number(i.quantity) > 0)
				.map((i) => ({ variantId: i.variantId as number, quantity: Number(i.quantity) }));
			if (items.length === 0) return;
			onSubmit({
				showroomId: Number(values.showroomId),
				notes: values.notes || undefined,
				items,
			});
			resetForm();
		},
	});

	// Auto-select (and lock) the showroom when the user only has one to choose from.
	useEffect(() => {
		if (!isOpen) return;
		if (selectableShowrooms.length === 1 && !formik.values.showroomId) {
			formik.setFieldValue('showroomId', selectableShowrooms[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, selectableShowrooms]);

	const hasValidLine = formik.values.items.some((i) => i.variantId != null && Number(i.quantity) > 0);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isScrollable isCentered titleId='createGoodsTransferModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='createGoodsTransferModal'>New Item Request to Warehouse</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit} className='d-flex flex-column' style={{ minHeight: 0 }}>
				<ModalBody style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
					<div className='row g-3 mb-2'>
						<div className='col-12 col-lg-6'>
							<FormGroup id='showroomId' label='Showroom'>
								{selectableShowrooms.length <= 1 ? (
									<Input value={selectableShowrooms[0]?.name ?? 'No showroom assigned'} disabled />
								) : (
									<Select
										name='showroomId'
										value={formik.values.showroomId}
										onChange={formik.handleChange}
										ariaLabel='Showroom'>
										<option value=''>Select a showroom...</option>
										{selectableShowrooms.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</Select>
								)}
							</FormGroup>
						</div>
						<div className='col-12 col-lg-6'>
							<FormGroup id='notes' label='Notes (optional)'>
								<Textarea
									id='notes'
									name='notes'
									value={formik.values.notes}
									onChange={formik.handleChange}
									rows={1}
									placeholder='Any context for SL Operations...'
								/>
							</FormGroup>
						</div>
					</div>

					<hr className='my-4' />

					<FormikProvider value={formik}>
						<FieldArray name='items'>
							{({ push, remove }) => (
								<>
									<div className='d-flex justify-content-between align-items-center mb-3'>
										<Label className='fs-5 fw-bold mb-0'>
											Requested Items{' '}
											<span className='badge bg-secondary bg-opacity-25 text-secondary ms-1'>
												{formik.values.items.length}
											</span>
										</Label>
										<Button color='primary' isLight icon='Add' onClick={() => push({ ...emptyItem })}>
											Add Item
										</Button>
									</div>

									{formik.values.items.map((item, idx) => (
										// eslint-disable-next-line react/no-array-index-key
										<div key={idx} className='card border shadow-sm mb-3'>
											<div className='card-body p-3'>
												<div className='row g-3 align-items-end'>
													<div className='col-12 col-md-8'>
														<FormGroup id={`items.${idx}.variantId`} label='Variant / SKU'>
															<VariantSearchSelect
																id={`items.${idx}.variantId`}
																name={`items.${idx}.variantId`}
																ariaLabel='Variant'
																imageSize={44}
																value={item.variantId ?? null}
																variants={variants}
																products={products}
																onChange={(variantId) =>
																	formik.setFieldValue(`items.${idx}.variantId`, variantId)
																}
															/>
														</FormGroup>
													</div>
													<div className='col-8 col-md-3'>
														<FormGroup id={`items.${idx}.quantity`} label='Quantity'>
															<Input
																type='number'
																name={`items.${idx}.quantity`}
																value={item.quantity}
																onChange={formik.handleChange}
																min={0}
															/>
														</FormGroup>
													</div>
													<div className='col-4 col-md-1 text-end'>
														<Button
															color='danger'
															isLight
															icon='Delete'
															onClick={() => remove(idx)}
															isDisable={formik.values.items.length === 1}
														/>
													</div>
												</div>
											</div>
										</div>
									))}
								</>
							)}
						</FieldArray>
					</FormikProvider>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button
						type='submit'
						color='primary'
						isLight
						isDisable={isLoading || !formik.values.showroomId || !hasValidLine}>
						{isLoading ? 'Submitting...' : 'Submit Request'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreateGoodsTransferModal;

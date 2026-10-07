import React from 'react';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Button from '../../../components/bootstrap/Button';
import Label from '../../../components/bootstrap/forms/Label';
import Icon from '../../../components/icon/Icon';
import VariantSearchSelect from '../../../components/common/VariantSearchSelect';
import {
	PurchaseInquiryPayload,
	PurchaseInquiryResponse,
} from '../../../api/inquiry.api';
import { useProducts } from '../../../hooks/useProducts';
import { useAllVariants } from '../../../hooks/useVariants';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: PurchaseInquiryPayload) => void;
	isLoading: boolean;
	editData?: PurchaseInquiryResponse | null;
}

const emptyItem = { description: '', quantity: 0, unit: '', unitPrice: 0, productId: null, variantId: null };

const money = (n: number) =>
	(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CreateInquiryModal: React.FC<Props> = ({
	isOpen,
	setIsOpen,
	onSubmit,
	isLoading,
	editData,
}) => {
	const { data: products } = useProducts();
	const { data: variants } = useAllVariants();

	const formik = useFormik<PurchaseInquiryPayload>({
		initialValues: {
			title: editData?.title ?? '',
			notes: editData?.notes ?? '',
			gfContactEmail: editData?.gfContactEmail ?? '',
			items:
				editData?.items.map((i) => ({
					productId: i.productId ?? null,
					variantId: i.variantId ?? null,
					description: i.description ?? '',
					quantity: i.quantity,
					unit: i.unit ?? '',
					unitPrice: i.unitPrice,
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit(values);
		},
	});

	const grandTotal = (formik.values.items ?? []).reduce(
		(sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
		0,
	);

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isScrollable isCentered titleId='createInquiryModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='createInquiryModal'>
					{editData ? 'Edit Purchase Inquiry' : 'New Purchase Inquiry'}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit} className='d-flex flex-column' style={{ minHeight: 0 }}>
				<ModalBody style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
					<div className='row g-3 mb-2'>
						<div className='col-12 col-lg-6'>
							<FormGroup id='title' label='Title (optional)'>
								<Input
									id='title'
									name='title'
									value={formik.values.title ?? ''}
									onChange={formik.handleChange}
									placeholder='e.g. Q3 Order'
								/>
							</FormGroup>
						</div>
						<div className='col-12 col-lg-6'>
							<FormGroup
								id='gfContactEmail'
								label='GF Contact Email (optional)'
								hint='Overrides the default GF Office email for this inquiry'>
								<Input
									type='email'
									id='gfContactEmail'
									name='gfContactEmail'
									value={formik.values.gfContactEmail ?? ''}
									onChange={formik.handleChange}
									placeholder='gf-contact@example.com'
								/>
							</FormGroup>
						</div>
						<div className='col-12'>
							<FormGroup id='notes' label='Notes / Description'>
								<Textarea
									id='notes'
									name='notes'
									value={formik.values.notes ?? ''}
									onChange={formik.handleChange}
									rows={2}
									placeholder='Describe the items or requirements...'
								/>
							</FormGroup>
						</div>
					</div>

					<hr className='my-4' />

					{/* Line Items */}
					<FormikProvider value={formik}>
						<FieldArray name='items'>
							{({ push, remove }) => (
								<>
									<div className='d-flex justify-content-between align-items-center mb-3'>
										<Label className='fs-5 fw-bold mb-0'>
											Line Items{' '}
											<span className='badge bg-secondary bg-opacity-25 text-secondary ms-1'>
												{formik.values.items?.length ?? 0}
											</span>
										</Label>
										<Button
											color='primary'
											isLight
											icon='Add'
											onClick={() => push({ ...emptyItem })}>
											Add Line Item
										</Button>
									</div>

									{(formik.values.items?.length ?? 0) === 0 && (
										<div className='text-center text-muted border border-dashed rounded p-5 mb-3'>
											<Icon icon='Inventory2' size='2x' color='secondary' />
											<div className='mt-2'>
												No line items yet — this inquiry is optional to itemize now.
											</div>
										</div>
									)}

									{formik.values.items?.map((item, idx) => {
										const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
										return (
											// eslint-disable-next-line react/no-array-index-key
											<div key={idx} className='card border shadow-sm mb-3'>
												<div className='card-body p-3'>
													<div className='d-flex justify-content-between align-items-center mb-3'>
														<span className='badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2'>
															Item {idx + 1}
														</span>
														<Button
															color='danger'
															isLight
															icon='Delete'
															onClick={() => remove(idx)}>
															Remove
														</Button>
													</div>
													<div className='row g-3'>
														<div className='col-12 col-xl-6'>
															<FormGroup id={`items.${idx}.variantId`} label='Variant / SKU'>
																<VariantSearchSelect
																	id={`items.${idx}.variantId`}
																	name={`items.${idx}.variantId`}
																	ariaLabel='Variant'
																	imageSize={44}
																	value={item.variantId ?? null}
																	variants={variants}
																	products={products}
																	onChange={(variantId) => {
																		formik.setFieldValue(`items.${idx}.variantId`, variantId);
																		const variant = variants?.find((v) => v.id === variantId);
																		formik.setFieldValue(
																			`items.${idx}.productId`,
																			variant?.productId ?? null,
																		);
																		if (variant && !formik.values.items?.[idx].description) {
																			const prod = products?.find((p) => p.id === variant.productId);
																			const attrs = [variant.size, variant.color]
																				.filter(Boolean)
																				.join(' / ');
																			formik.setFieldValue(
																				`items.${idx}.description`,
																				[prod?.name, attrs ? `(${attrs})` : null]
																					.filter(Boolean)
																					.join(' '),
																			);
																		}
																	}}
																/>
															</FormGroup>
														</div>
														<div className='col-12 col-xl-6'>
															<FormGroup id={`items.${idx}.description`} label='Description'>
																<Input
																	name={`items.${idx}.description`}
																	value={item.description ?? ''}
																	onChange={formik.handleChange}
																	placeholder='Item description'
																/>
															</FormGroup>
														</div>
														<div className='col-6 col-md-3'>
															<FormGroup id={`items.${idx}.quantity`} label='Qty'>
																<Input
																	type='number'
																	name={`items.${idx}.quantity`}
																	value={item.quantity}
																	onChange={formik.handleChange}
																	min={0}
																/>
															</FormGroup>
														</div>
														<div className='col-6 col-md-3'>
															<FormGroup id={`items.${idx}.unit`} label='Unit'>
																<Input
																	name={`items.${idx}.unit`}
																	value={item.unit ?? ''}
																	onChange={formik.handleChange}
																	placeholder='pcs'
																/>
															</FormGroup>
														</div>
														<div className='col-6 col-md-3'>
															<FormGroup id={`items.${idx}.unitPrice`} label='Unit Price'>
																<Input
																	type='number'
																	name={`items.${idx}.unitPrice`}
																	value={item.unitPrice}
																	onChange={formik.handleChange}
																	min={0}
																	step={0.01}
																/>
															</FormGroup>
														</div>
														<div className='col-6 col-md-3'>
															<Label>Line Total</Label>
															<div className='form-control-plaintext fw-bold fs-6'>
																{money(lineTotal)}
															</div>
														</div>
													</div>
												</div>
											</div>
										);
									})}

									{(formik.values.items?.length ?? 0) > 0 && (
										<div className='d-flex justify-content-end align-items-center border-top pt-3 mt-2'>
											<span className='text-muted me-3'>Estimated Total</span>
											<span className='fs-4 fw-bold'>{money(grandTotal)}</span>
										</div>
									)}
								</>
							)}
						</FieldArray>
					</FormikProvider>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' color='primary' isDisable={isLoading} isLight>
						{isLoading ? 'Saving...' : editData ? 'Update Inquiry' : 'Create Inquiry'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreateInquiryModal;

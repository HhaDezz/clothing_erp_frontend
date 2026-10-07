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
import Button from '../../../components/bootstrap/Button';
import Label from '../../../components/bootstrap/forms/Label';
import Icon from '../../../components/icon/Icon';
import VariantSearchSelect from '../../../components/common/VariantSearchSelect';
import { ImportShipmentPayload, ImportShipmentResponse } from '../../../api/importShipments.api';
import { useProducts } from '../../../hooks/useProducts';
import { useAllVariants } from '../../../hooks/useVariants';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: ImportShipmentPayload) => void;
	isLoading: boolean;
	editData?: ImportShipmentResponse | null;
}

const emptyItem = { description: '', quantity: 0, unit: '', productId: null, variantId: null };

/**
 * One line item, laid out as its own card so the Variant search + photo
 * preview and the rest of the fields each get room to breathe. A single
 * Variant-first search select replaces the old two-step "pick a Product,
 * then a Variant scoped to it" flow — productId is still sent on submit,
 * but it's now derived server-side from the chosen variant
 * (ImportShipmentService.applyItems()) rather than picked directly here.
 */
const ImportShipmentItemRow: React.FC<{
	idx: number;
	item: { productId?: number | null; variantId?: number | null; description?: string; quantity: number; unit?: string };
	products?: { id: number; name: string; styleCode?: string }[];
	variants?: { id: number; productId: number; sku: string; size?: string; color?: string }[];
	formik: ReturnType<typeof useFormik<ImportShipmentPayload>>;
	onRemove: () => void;
}> = ({ idx, item, products, variants, formik, onRemove }) => (
	<div className='card border shadow-sm mb-3'>
		<div className='card-body p-3'>
			<div className='d-flex justify-content-between align-items-center mb-3'>
				<span className='badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2'>Item {idx + 1}</span>
				<Button color='danger' isLight icon='Delete' onClick={onRemove}>
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
							variants={variants as any}
							products={products as any}
							onChange={(variantId) => {
								formik.setFieldValue(`items.${idx}.variantId`, variantId);
								const variant = variants?.find((v) => v.id === variantId);
								formik.setFieldValue(`items.${idx}.productId`, variant?.productId ?? null);
								if (variant && !formik.values.items?.[idx].description) {
									const prod = products?.find((p) => p.id === variant.productId);
									const attrs = [variant.size, variant.color].filter(Boolean).join(' / ');
									formik.setFieldValue(
										`items.${idx}.description`,
										[prod?.name, attrs ? `(${attrs})` : null].filter(Boolean).join(' '),
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
			</div>
		</div>
	</div>
);

/**
 * Document Intake (step 1). Only description/quantity/unit/product are
 * captured here — costing (step 2) happens separately in ImportCostingModal
 * once the packing list is uploaded, per the state machine.
 */
const ImportShipmentModal: React.FC<Props> = ({ isOpen, setIsOpen, onSubmit, isLoading, editData }) => {
	const { data: products } = useProducts();
	const { data: variants } = useAllVariants();

	const formik = useFormik<ImportShipmentPayload>({
		initialValues: {
			gfReference: editData?.gfReference ?? '',
			items:
				editData?.items.map((i) => ({
					productId: i.productId ?? null,
					variantId: i.variantId ?? null,
					description: i.description ?? '',
					quantity: i.quantity,
					unit: i.unit ?? '',
				})) ?? [],
		},
		enableReinitialize: true,
		onSubmit: (values) => {
			onSubmit(values);
		},
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isScrollable isCentered titleId='importShipmentModal'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='importShipmentModal'>
					{editData ? `Edit Shipment — ${editData.shipmentNo}` : 'New Import Shipment'}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit} className='d-flex flex-column' style={{ minHeight: 0 }}>
				<ModalBody style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
					<div className='row g-3 mb-2'>
						<div className='col-12 col-lg-6'>
							<FormGroup id='gfReference' label='GF Reference (optional)'>
								<Input
									id='gfReference'
									name='gfReference'
									value={formik.values.gfReference ?? ''}
									onChange={formik.handleChange}
									placeholder='GF Warehouse shipment / reference no.'
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
											Shipment Items{' '}
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
												No items yet — add each SKU/size/color arriving in this shipment.
											</div>
										</div>
									)}

									{formik.values.items?.map((item, idx) => (
										// eslint-disable-next-line react/no-array-index-key
										<ImportShipmentItemRow
											key={idx}
											idx={idx}
											item={item}
											products={products}
											variants={variants}
											formik={formik}
											onRemove={() => remove(idx)}
										/>
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
					<Button type='submit' color='primary' isDisable={isLoading} isLight>
						{isLoading ? 'Saving...' : editData ? 'Update Shipment' : 'Create Shipment'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default ImportShipmentModal;

import React, { FC } from 'react';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import { formatCurrency } from '../../../helpers/currency';

export type SewAndSellPreviewMeasurementField = {
	bodyMeasurementId: number;
	bodyMeasurementName: string;
	value: string;
	unit: 'INCHES' | 'CM';
	isRequired: boolean;
	inputType: 'NUMBER' | 'TEXT';
	instruction?: string;
};

export type SewAndSellPreviewData = {
	orderNo: string;
	customerName: string;
	product: {
		id: number;
		styleCode: string;
		name: string;
		brand?: string;
		garmentType?: string;
		imageUrl?: string;
	};
	measurementTemplate: {
		id: number;
		name: string;
		defaultUnit: 'INCHES' | 'CM';
		fields: SewAndSellPreviewMeasurementField[];
	};
	quantity: number;
	unitPrice: number;
	advancePayment: number;
	orderTotal: number;
	remainingBalance: number;
	expectedDate: string;
	materials: {
		fabric?: string;
		lining?: string;
		button?: string;
	};
	designOptions?: string;
	tailorNotes?: string;
	notes?: string;
};

interface SewAndSellPreviewModalProps {
	preview: SewAndSellPreviewData | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

const unitLabel = (unit: 'INCHES' | 'CM') => (unit === 'CM' ? 'cm' : 'in');

const formatMoney = (value: number) => formatCurrency(value);

const SewAndSellPreviewModal: FC<SewAndSellPreviewModalProps> = ({
	preview,
	isOpen,
	setIsOpen,
}) => {
	if (!preview) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isCentered isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 border-0'>
				<ModalTitle id='sew-and-sell-preview-title'>
					<Icon icon='Preview' className='me-2 text-primary' />
					Final Product Preview — {preview.orderNo}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4 pb-4'>
				<div className='row g-4'>
					<div className='col-lg-4'>
						<div className='card border-0 shadow-sm h-100 overflow-hidden'>
							<div className='position-relative bg-light' style={{ minHeight: 260 }}>
								{preview.product.imageUrl ? (
									<img
										src={preview.product.imageUrl}
										alt={preview.product.name}
										className='w-100 h-100'
										style={{ objectFit: 'cover', minHeight: 260 }}
									/>
								) : (
									<div className='d-flex flex-column justify-content-center align-items-center h-100 text-center p-4'>
										<Icon icon='ContentCut' size='4x' className='text-primary mb-3' />
										<h5 className='mb-1'>{preview.product.styleCode}</h5>
										<p className='text-muted mb-0'>{preview.product.name}</p>
									</div>
								)}
							</div>
							<div className='card-body'>
								<div className='d-flex flex-wrap gap-2 mb-3'>
									<Badge color='primary' isLight>
										{preview.product.styleCode}
									</Badge>
									<Badge color='info' isLight>
										{preview.measurementTemplate.name}
									</Badge>
								</div>
								<h4 className='mb-1'>{preview.product.name}</h4>
								<p className='text-muted mb-3'>{preview.customerName}</p>
								<div className='row g-3 small'>
									<div className='col-6'>
										<div className='text-muted text-uppercase fw-semibold'>Quantity</div>
										<div className='fw-bold'>{preview.quantity}</div>
									</div>
									<div className='col-6'>
										<div className='text-muted text-uppercase fw-semibold'>Unit Price</div>
										<div className='fw-bold'>{formatMoney(preview.unitPrice)}</div>
									</div>
									<div className='col-6'>
										<div className='text-muted text-uppercase fw-semibold'>Advance</div>
										<div className='fw-bold'>{formatMoney(preview.advancePayment)}</div>
									</div>
									<div className='col-6'>
										<div className='text-muted text-uppercase fw-semibold'>Balance</div>
										<div className='fw-bold'>{formatMoney(preview.remainingBalance)}</div>
									</div>
								</div>
								<hr className='my-3' />
								<div className='small text-muted text-uppercase fw-semibold mb-2'>Materials</div>
								<div className='d-flex flex-wrap gap-2'>
									<Badge color='secondary' isLight>
										Fabric: {preview.materials.fabric || 'Not selected'}
									</Badge>
									<Badge color='secondary' isLight>
										Lining: {preview.materials.lining || 'Not selected'}
									</Badge>
									<Badge color='secondary' isLight>
										Buttons: {preview.materials.button || 'Not selected'}
									</Badge>
								</div>
							</div>
						</div>
					</div>

					<div className='col-lg-8'>
						<div className='card border-0 shadow-sm mb-4'>
							<div className='card-body'>
								<div className='d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3'>
									<div>
										<h5 className='mb-1'>Measurement Sheet</h5>
										<p className='text-muted mb-0'>
											Final garment measurements captured for this order.
										</p>
									</div>
									<Badge color='dark' isLight>
										Unit: {unitLabel(preview.measurementTemplate.defaultUnit)}
									</Badge>
								</div>
								<div className='table-responsive'>
									<table className='table table-bordered align-middle mb-0'>
										<thead className='table-light'>
											<tr>
												<th>Measurement</th>
												<th style={{ width: '25%' }}>Value</th>
												<th style={{ width: '18%' }}>Unit</th>
												<th style={{ width: '12%' }}>Required</th>
											</tr>
										</thead>
										<tbody>
											{preview.measurementTemplate.fields.map((field) => (
												<tr key={field.bodyMeasurementId}>
													<td>
														<div className='fw-semibold'>{field.bodyMeasurementName}</div>
														{field.instruction && (
															<div className='text-muted small'>{field.instruction}</div>
														)}
													</td>
													<td className='fw-bold'>{field.value || '—'}</td>
													<td>{unitLabel(field.unit)}</td>
													<td>
														<Badge color={field.isRequired ? 'success' : 'secondary'} isLight>
															{field.isRequired ? 'Yes' : 'No'}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div className='row g-4'>
							<div className='col-md-4'>
								<div className='card border-0 shadow-sm h-100'>
									<div className='card-body'>
										<div className='text-muted text-uppercase fw-semibold small mb-1'>
											Expected Delivery
										</div>
										<div className='fw-bold'>{preview.expectedDate}</div>
									</div>
								</div>
							</div>
							<div className='col-md-4'>
								<div className='card border-0 shadow-sm h-100'>
									<div className='card-body'>
										<div className='text-muted text-uppercase fw-semibold small mb-1'>
											Design Options
										</div>
										<div className='fw-semibold'>
											{preview.designOptions || 'No design options added'}
										</div>
									</div>
								</div>
							</div>
							<div className='col-md-4'>
								<div className='card border-0 shadow-sm h-100'>
									<div className='card-body'>
										<div className='text-muted text-uppercase fw-semibold small mb-1'>
											Total Value
										</div>
										<div className='fw-bold'>{formatMoney(preview.orderTotal)}</div>
									</div>
								</div>
							</div>
						</div>

						{(preview.tailorNotes || preview.notes) && (
							<div className='card border-0 shadow-sm mt-4'>
								<div className='card-body'>
									<div className='row g-4'>
										{preview.tailorNotes && (
											<div className='col-md-6'>
												<div className='text-muted text-uppercase fw-semibold small mb-1'>
													Tailor / Fit Notes
												</div>
												<div>{preview.tailorNotes}</div>
											</div>
										)}
										{preview.notes && (
											<div className='col-md-6'>
												<div className='text-muted text-uppercase fw-semibold small mb-1'>
													Order Notes
												</div>
												<div>{preview.notes}</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 border-0'>
				<div className='w-100 d-flex justify-content-between align-items-center flex-wrap gap-2'>
					<div className='text-muted'>
						Order balance after advance: <strong>{formatMoney(preview.remainingBalance)}</strong>
					</div>
					<Button color='primary' onClick={() => setIsOpen(false)}>
						Close Preview
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default SewAndSellPreviewModal;
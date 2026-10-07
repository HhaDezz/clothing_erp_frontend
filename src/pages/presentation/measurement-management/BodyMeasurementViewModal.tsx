import React, { FC } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import { BodyMeasurement } from '../../../api/measurements.api';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';

interface IBodyMeasurementViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	bodyMeasurements: BodyMeasurement[];
}

const BodyMeasurementViewModal: FC<IBodyMeasurementViewModalProps> = ({
	id,
	isOpen,
	setIsOpen,
	bodyMeasurements,
}) => {
	const bm = bodyMeasurements.find((item) => item.id.toString() === id?.toString());

	if (!bm && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='bm-view-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 bg-light'>
				<ModalTitle id='bm-view-modal'>
					<div className='d-flex align-items-center'>
						<Icon icon='Straighten' size='2x' className='me-2 text-primary' />
						<div>
							<h5 className='mb-0 fw-bold'>Measurement Parameter Details</h5>
							<small className='text-muted'>View parameter information</small>
						</div>
					</div>
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-5 py-4'>
				{bm && (
					<div className='row g-4'>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Parameter Code</p>
							<p className='fs-5 fw-bold mb-0 text-dark'>{bm.code}</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Parameter Name</p>
							<p className='fs-5 mb-0'>{bm.name}</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Status</p>
							<Badge color={bm.status === 'ACTIVE' ? 'success' : 'danger'} isLight className='fs-6 py-1 px-3'>
								{bm.status}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Body Area</p>
							<Badge color='info' isLight className='fs-6 py-1 px-3'>
								{bm.bodyArea?.replace('_', ' ') || 'OTHER'}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Unit / Input Type</p>
							<p className='fs-6 mb-0'>
								{bm.unit} / {bm.inputType}
							</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Min Value</p>
							<p className='fs-6 mb-0 text-dark fw-bold'>{bm.minValue ?? '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Max Value</p>
							<p className='fs-6 mb-0 text-dark fw-bold'>{bm.maxValue ?? '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Display Order</p>
							<p className='fs-6 mb-0'>{bm.displayOrder}</p>
						</div>

						<div className='col-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Instructions</p>
							<div className='p-3 bg-light rounded text-dark'>
								{bm.instruction || <span className='text-muted fst-italic'>No instructions provided</span>}
							</div>
						</div>
					</div>
				)}
			</ModalBody>
			<ModalFooter className='px-4 pb-4 border-0'>
				<Button color='primary' isLight onClick={() => setIsOpen(false)} className='px-4'>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default BodyMeasurementViewModal;

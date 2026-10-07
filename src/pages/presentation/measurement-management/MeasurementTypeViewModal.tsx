import React, { FC } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import { MeasurementType } from '../../../api/measurements.api';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';

interface IMeasurementTypeViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	measurementTypes: MeasurementType[];
}

const MeasurementTypeViewModal: FC<IMeasurementTypeViewModalProps> = ({
	id,
	isOpen,
	setIsOpen,
	measurementTypes,
}) => {
	const mt = measurementTypes.find((item) => item.id.toString() === id?.toString());

	if (!mt && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='mt-view-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 bg-light'>
				<ModalTitle id='mt-view-modal'>
					<div className='d-flex align-items-center'>
						<Icon icon='Straighten' size='2x' className='me-2 text-primary' />
						<div>
							<h5 className='mb-0 fw-bold'>Measurement Template Details</h5>
							<small className='text-muted'>View template information</small>
						</div>
					</div>
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-5 py-4'>
				{mt && (
					<div className='row g-4'>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Template Code</p>
							<p className='fs-5 fw-bold mb-0 text-dark'>{mt.code}</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Template Name</p>
							<p className='fs-5 mb-0'>{mt.name}</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Status</p>
							<Badge color={mt.status === 'ACTIVE' ? 'success' : 'danger'} isLight className='fs-6 py-1 px-3'>
								{mt.status}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Default Unit</p>
							<Badge color='info' isLight className='fs-6 py-1 px-3'>
								{mt.defaultUnit}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Garment Category</p>
							<p className='fs-6 mb-0'>{mt.garmentCategory || '—'}</p>
						</div>

						<div className='col-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Description</p>
							<div className='p-3 bg-light rounded text-dark'>
								{mt.description || <span className='text-muted fst-italic'>No description available</span>}
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

export default MeasurementTypeViewModal;

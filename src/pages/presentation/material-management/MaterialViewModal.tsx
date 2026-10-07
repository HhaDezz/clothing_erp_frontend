import React, { FC } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import { Material } from '../../../api/materials.api';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';

interface IMaterialViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	materials: Material[];
}

const MaterialViewModal: FC<IMaterialViewModalProps> = ({
	id,
	isOpen,
	setIsOpen,
	materials,
}) => {
	const material = materials.find((item) => item.id.toString() === id?.toString());

	if (!material && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='material-view-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 bg-light'>
				<ModalTitle id='material-view-modal'>
					<div className='d-flex align-items-center'>
						<Icon icon='Architecture' size='2x' className='me-2 text-primary' />
						<div>
							<h5 className='mb-0 fw-bold'>Material Details</h5>
							<small className='text-muted'>View complete material information</small>
						</div>
					</div>
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-5 py-4'>
				{material && (
					<div className='row g-4'>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Material Code</p>
							<p className='fs-5 fw-bold mb-0 text-dark'>{material.materialCode}</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Material Name</p>
							<p className='fs-5 mb-0'>{material.name}</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Status</p>
							<Badge color={material.status === 'ACTIVE' ? 'success' : 'danger'} isLight className='fs-6 py-1 px-3'>
								{material.status}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Material Type</p>
							<Badge color='info' isLight className='fs-6 py-1 px-3'>
								{material.materialType || 'General'}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Unit</p>
							<p className='fs-6 fw-bold mb-0 text-primary'>{material.unit}</p>
						</div>

						<div className='col-md-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Reorder Level</p>
							<div className='d-flex align-items-center gap-2'>
								<Icon icon='Inventory' color='warning' />
								<span className='fs-5 text-dark fw-bold'>{material.reorderLevel}</span>
								<span className='text-muted fs-6'>{material.unit}</span>
							</div>
						</div>

						<div className='col-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Description</p>
							<div className='p-3 bg-light rounded text-dark'>
								{material.description || <span className='text-muted fst-italic'>No description available</span>}
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

export default MaterialViewModal;

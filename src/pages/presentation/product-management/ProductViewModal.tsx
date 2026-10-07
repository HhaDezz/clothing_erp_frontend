import React, { FC } from 'react';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import { Product } from '../../../api/products.api';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';

interface IProductViewModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	products: Product[];
}

const ProductViewModal: FC<IProductViewModalProps> = ({
	id,
	isOpen,
	setIsOpen,
	products,
}) => {
	const product = products.find((item) => item.id.toString() === id?.toString());

	if (!product && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='product-view-modal'
			isCentered>
			<ModalHeader setIsOpen={setIsOpen} className='p-4 bg-light'>
				<ModalTitle id='product-view-modal'>
					<div className='d-flex align-items-center'>
						<Icon icon='Checkroom' size='2x' className='me-2 text-primary' />
						<div>
							<h5 className='mb-0 fw-bold'>Product Details</h5>
							<small className='text-muted'>View complete product information</small>
						</div>
					</div>
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-5 py-4'>
				{product && (
					<div className='row g-4'>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Style Code</p>
							<p className='fs-5 fw-bold mb-0 text-dark'>{product.styleCode}</p>
						</div>
						<div className='col-md-6'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Product Name</p>
							<p className='fs-5 mb-0'>{product.name}</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Status</p>
							<Badge color={product.status === 'ACTIVE' ? 'success' : 'danger'} isLight className='fs-6 py-1 px-3'>
								{product.status}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Product Type</p>
							<Badge color={product.productType === 'SEW_AND_SELL' ? 'info' : 'primary'} isLight className='fs-6 py-1 px-3'>
								{product.productType.replace(/_/g, ' ')}
							</Badge>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Category</p>
							<p className='fs-6 mb-0'>{product.category || '—'}</p>
						</div>

						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Brand</p>
							<p className='fs-6 mb-0'>{product.brand || '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Garment Type</p>
							<p className='fs-6 mb-0'>{product.garmentType || '—'}</p>
						</div>
						<div className='col-md-4'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Season</p>
							<p className='fs-6 mb-0'>{product.season || '—'}</p>
						</div>

						<div className='col-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Settings</p>
							<div className='d-flex align-items-center gap-2'>
								<Icon 
									icon={product.measurementRequired ? 'CheckCircle' : 'Cancel'} 
									color={product.measurementRequired ? 'success' : 'danger'} 
								/>
								<span className='fs-6'>Requires Body Measurements</span>
							</div>
						</div>

						<div className='col-12'>
							<p className='text-muted mb-1 small text-uppercase fw-bold'>Description</p>
							<div className='p-3 bg-light rounded text-dark'>
								{product.description || <span className='text-muted fst-italic'>No description available</span>}
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

export default ProductViewModal;

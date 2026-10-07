import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import { getVariantsByProductApi, Product, Variant } from '../../../api/products.api';
import { formatCurrency } from '../../../helpers/currency';

interface SelectVariantModalProps {
	product: Product | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSelect: (variant: Variant) => void;
}

const SelectVariantModal: React.FC<SelectVariantModalProps> = ({
	product,
	isOpen,
	setIsOpen,
	onSelect,
}) => {
	const {
		data: variants,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['variants', product?.id],
		queryFn: () => getVariantsByProductApi(product!.id),
		enabled: !!product && isOpen,
	});

	if (!isOpen || !product) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='select-variant-title'>
					<Icon icon='Style' className='me-2 text-primary' />
					Select Variant: {product.name}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='p-4 bg-light'>
				{isLoading ? (
					<div className='text-center p-5'>
						<div className='spinner-border text-primary' role='status'>
							<span className='visually-hidden'>Loading...</span>
						</div>
						<p className='mt-3 text-muted'>Loading variants...</p>
					</div>
				) : error ? (
					<div className='alert alert-danger'>Failed to load variants.</div>
				) : !variants || variants.length === 0 ? (
					<div className='text-center p-5 text-muted'>
						<Icon icon='Inventory2' size='4x' className='mb-3 opacity-50' />
						<h5>No variants found</h5>
						<p>This product does not have any active variants configured.</p>
					</div>
				) : (
					<div className='row g-3'>
						{variants
							.filter((v) => v.status === 'ACTIVE')
							.map((variant) => (
								<div className='col-md-6' key={variant.id}>
									<div
										className='card border-0 shadow-sm rounded-3 cursor-pointer h-100'
										style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
										onClick={() => onSelect(variant)}
										onMouseOver={(e) => {
											e.currentTarget.style.transform = 'translateY(-3px)';
											e.currentTarget.style.boxShadow =
												'0 8px 16px rgba(0,0,0,0.1)';
										}}
										onMouseOut={(e) => {
											e.currentTarget.style.transform = 'translateY(0)';
											e.currentTarget.style.boxShadow =
												'0 .125rem .25rem rgba(0,0,0,.075)';
										}}>
										<div className='card-body p-3 d-flex justify-content-between align-items-center'>
											<div>
												<div className='d-flex align-items-center mb-1'>
													<span className='fw-bold text-dark fs-5 me-2'>
														{variant.sku}
													</span>
												</div>
												<div className='d-flex gap-2'>
													{variant.size && (
														<Badge color='secondary' isLight>
															Size: {variant.size}
														</Badge>
													)}
													{variant.color && (
														<Badge color='info' isLight>
															Color: {variant.color}
														</Badge>
													)}
													{!variant.size && !variant.color && (
														<span className='text-muted small'>
															Standard Variant
														</span>
													)}
												</div>
											</div>
											<div className='text-end'>
												<div className='fs-4 fw-bolder text-primary'>
													{formatCurrency(variant.sellingPrice)}
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
					</div>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' size='lg' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default SelectVariantModal;

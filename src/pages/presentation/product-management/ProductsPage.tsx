import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import { useProducts } from '../../../hooks/useProducts';
import { Product } from '../../../api/products.api';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import ProductFormModal from './ProductFormModal';
import ProductVariantsModal from './ProductVariantsModal';
import ProductBomModal from './ProductBomModal';
import ProductViewModal from './ProductViewModal';

const ProductsPage = () => {
	const { hasPermission } = usePermission();
	const { data: products = [], isLoading, error } = useProducts();

	const [editId, setEditId] = useState<string | null>(null);
	const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
	const [modalOpen, setModalOpen] = useState(false);

	const [variantsProductId, setVariantsProductId] = useState<string | null>(null);
	const [variantsModalOpen, setVariantsModalOpen] = useState(false);

	const [bomProductId, setBomProductId] = useState<string | null>(null);
	const [bomModalOpen, setBomModalOpen] = useState(false);

	const [viewId, setViewId] = useState<string | null>(null);
	const [viewModalOpen, setViewModalOpen] = useState(false);

	const openCreateModal = () => {
		setEditId(null);
		setModalMode('add');
		setModalOpen(true);
	};

	const openEditModal = (id: string) => {
		setEditId(id);
		setModalMode('edit');
		setModalOpen(true);
	};

	const openVariantsModal = (id: string) => {
		setVariantsProductId(id);
		setVariantsModalOpen(true);
	};

	const openBomModal = (id: string) => {
		setBomProductId(id);
		setBomModalOpen(true);
	};

	const openViewModal = (id: string) => {
		setViewId(id);
		setViewModalOpen(true);
	};

	const canView = hasPermission(PERMISSIONS.SHOW_PRODUCT);
	const canCreate = hasPermission(PERMISSIONS.CREATE_PRODUCT);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_PRODUCT);
	const canDelete = hasPermission(PERMISSIONS.DELETE_PRODUCT);

	const columns: DataTableColumn<Product>[] = [
		{
			key: 'styleCode',
			label: 'Style Code',
			render: (product) => <span className='fw-bold'>{product.styleCode}</span>,
		},
		{
			key: 'name',
			label: 'Product Name',
			render: (product) => (
				<div>
					<div className='fw-bold'>{product.name}</div>
					<div className='text-muted small'>{product.category}</div>
				</div>
			),
		},
		{
			key: 'productType',
			label: 'Type',
			align: 'center',
			render: (product) => (
				<Badge color={product.productType === 'SEW_AND_SELL' ? 'info' : 'primary'} isLight>
					{product.productType.replace(/_/g, ' ')}
				</Badge>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (product) => (
				<Badge color={product.status === 'ACTIVE' ? 'success' : 'danger'} isLight>
					{product.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper title='Products' requiredPermission={PERMISSIONS.SHOW_PRODUCT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Checkroom' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Products</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-product'
								icon='Add'
								color='primary'
								isLight
								onClick={openCreateModal}>
								New Product
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={[
										...columns,
										{
											key: 'actions',
											label: '',
											align: 'right',
											sortable: false,
											searchable: false,
											render: (product) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () =>
																			openViewModal(
																				product.id.toString(),
																			),
																	},
																]
															: []),
														...(canUpdate
															? [
																	{
																		key: 'edit',
																		label: 'Edit',
																		icon: 'ti ti-edit',
																		className: 'text-primary',
																		onClick: () =>
																			openEditModal(
																				product.id.toString(),
																			),
																	},
																	{
																		key: 'variants',
																		label: 'Variants',
																		icon: 'ti ti-layers',
																		className: 'text-success',
																		onClick: () =>
																			openVariantsModal(
																				product.id.toString(),
																			),
																	},
																	{
																		key: 'bom',
																		label: 'BOM',
																		icon: 'ti ti-tool',
																		className: 'text-warning',
																		onClick: () =>
																			openBomModal(
																				product.id.toString(),
																			),
																	},
																]
															: []),
														...(canDelete
															? [
																	{
																		key: 'delete',
																		label: 'Delete',
																		icon: 'ti ti-trash',
																		className: 'text-danger',
																		onClick: () =>
																			alert(
																				'Delete Product Flow To Be Implemented',
																			),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={products}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='products'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			{canCreate && (
				<ProductFormModal
					mode={modalMode}
					id={editId}
					isOpen={modalOpen}
					setIsOpen={setModalOpen}
					products={products}
				/>
			)}

			<ProductVariantsModal
				productId={variantsProductId}
				productName={
					products.find((p) => p.id.toString() === variantsProductId)?.name || null
				}
				productType={
					products.find((p) => p.id.toString() === variantsProductId)?.productType
				}
				isOpen={variantsModalOpen}
				setIsOpen={setVariantsModalOpen}
			/>

			<ProductBomModal
				productId={bomProductId}
				productName={products.find((p) => p.id.toString() === bomProductId)?.name || null}
				isOpen={bomModalOpen}
				setIsOpen={setBomModalOpen}
			/>

			<ProductViewModal
				id={viewId}
				isOpen={viewModalOpen}
				setIsOpen={setViewModalOpen}
				products={products}
			/>
		</PageWrapper>
	);
};

export default ProductsPage;

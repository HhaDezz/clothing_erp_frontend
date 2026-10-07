import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Checks from '../../../components/bootstrap/forms/Checks';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import { Brand, createBrandApi, deleteBrandApi, getBrandsApi, updateBrandApi } from '../../../api/brands.api';

/**
 * Brands — "Need Brands CRUD for Products creation dropdown". The list
 * managed here is what the Brand dropdown on the product form offers.
 * A brand that products use can be renamed (the products follow) or made
 * inactive (hidden from the dropdown), but not deleted.
 */

// ─── Create / edit ──────────────────────────────────────────────────────────
const BrandFormModal: React.FC<{
	brand: Brand | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ brand, isOpen, setIsOpen }) => {
	const queryClient = useQueryClient();
	const isEditing = brand !== null;
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [active, setActive] = useState(true);

	React.useEffect(() => {
		if (!isOpen) return;
		setName(brand?.name ?? '');
		setDescription(brand?.description ?? '');
		setActive(brand?.active ?? true);
	}, [isOpen, brand]);

	const saveMutation = useMutation({
		mutationFn: () => {
			const payload = { name: name.trim(), description: description.trim() || undefined, active };
			return isEditing ? updateBrandApi(brand!.id, payload) : createBrandApi(payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['brands'] });
			// A rename is carried over to the products that use the brand.
			queryClient.invalidateQueries({ queryKey: ['products'] });
			showNotification(isEditing ? 'Brand Updated' : 'Brand Created', `${name.trim()} has been saved.`, 'success');
			setIsOpen(false);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save brand'), 'danger'),
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='brand-form-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='brand-form-modal'>{isEditing ? `Edit Brand — ${brand?.name}` : 'New Brand'}</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<FormGroup id='brandName' label='Brand Name' className='col-12'>
						<Input
							name='brandName'
							placeholder='e.g. Talna Classic'
							value={name}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
						/>
					</FormGroup>
					{isEditing && (brand?.productCount ?? 0) > 0 && name.trim() !== brand?.name && (
						<div className='col-12'>
							<div className='alert alert-info py-2 px-3 small mb-0'>
								Renaming also updates the {brand?.productCount} product
								{brand?.productCount === 1 ? '' : 's'} that use this brand.
							</div>
						</div>
					)}
					<FormGroup id='brandDescription' label='Description (optional)' className='col-12'>
						<Textarea
							name='brandDescription'
							rows={3}
							value={description}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
						/>
					</FormGroup>
					<FormGroup id='brandActive' label='Status' className='col-12'>
						<Checks
							id='brandActive'
							name='brandActive'
							label='Active — offered in the Brand dropdown when creating products'
							checked={active}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActive(e.target.checked)}
						/>
					</FormGroup>
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon='Save'
					isDisable={!name.trim() || saveMutation.isPending}
					onClick={() => saveMutation.mutate()}>
					{saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Brand' : 'Create Brand'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

// ─── Delete confirmation ────────────────────────────────────────────────────
const BrandDeleteModal: React.FC<{
	brand: Brand | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ brand, isOpen, setIsOpen }) => {
	const queryClient = useQueryClient();
	const deleteMutation = useMutation({
		mutationFn: () => deleteBrandApi(brand!.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['brands'] });
			showNotification('Brand Deleted', `${brand?.name} has been deleted.`, 'success');
			setIsOpen(false);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to delete brand'), 'danger'),
	});

	if (!brand) return null;
	const inUse = brand.productCount > 0;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='brand-delete-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='brand-delete-modal'>Delete Brand — {brand.name}</ModalTitle>
			</ModalHeader>
			<ModalBody>
				{inUse ? (
					<div className='alert alert-warning mb-0'>
						{brand.name} is used by {brand.productCount} product{brand.productCount === 1 ? '' : 's'} and
						cannot be deleted. Edit it and untick Active to stop offering it for new products.
					</div>
				) : (
					<p className='mb-0'>
						Delete <strong>{brand.name}</strong>? No products use it. This cannot be undone.
					</p>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					{inUse ? 'Close' : 'Cancel'}
				</Button>
				{!inUse && (
					<Button color='danger' isDisable={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
						{deleteMutation.isPending ? 'Deleting...' : 'Delete Brand'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

const BrandsPage = () => {
	const { hasPermission } = usePermission();
	const canCreate = hasPermission(PERMISSIONS.CREATE_BRAND);
	const canEdit = hasPermission(PERMISSIONS.UPDATE_BRAND);
	const canDelete = hasPermission(PERMISSIONS.DELETE_BRAND);

	const [formBrand, setFormBrand] = useState<Brand | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [deleteBrand, setDeleteBrand] = useState<Brand | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const {
		data: brands = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['brands'],
		queryFn: getBrandsApi,
	});

	const openForm = (brand: Brand | null) => {
		setFormBrand(brand);
		setIsFormOpen(true);
	};

	const columns: DataTableColumn<Brand>[] = [
		{
			key: 'name',
			label: 'Brand',
			render: (row) => <span className='fw-bold'>{row.name}</span>,
		},
		{
			key: 'description',
			label: 'Description',
			render: (row) => <span className='text-muted'>{row.description || '—'}</span>,
		},
		{
			key: 'productCount',
			label: 'Products',
			align: 'center',
			render: (row) => <span className={row.productCount > 0 ? 'fw-semibold' : 'text-muted'}>{row.productCount}</span>,
		},
		{
			key: 'active',
			label: 'Status',
			align: 'center',
			accessor: (row) => (row.active ? 'Active' : 'Inactive'),
			render: (row) => (
				<Badge color={row.active ? 'success' : 'secondary'} isLight>
					{row.active ? 'Active' : 'Inactive'}
				</Badge>
			),
		},
		{
			key: 'createdAt',
			label: 'Created',
			render: (row) => (
				<span className='text-muted small'>
					{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
				</span>
			),
		},
	];

	const actionColumn: DataTableColumn<Brand> = {
		key: 'actions',
		label: '',
		align: 'right' as any,
		sortable: false,
		searchable: false,
		render: (row) => (
			<DataTableActionMenu
				actions={[
					...(canEdit
						? [
								{
									key: 'edit',
									label: 'Edit',
									icon: 'ti ti-edit',
									className: 'text-primary',
									onClick: () => openForm(row),
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
									onClick: () => {
										setDeleteBrand(row);
										setIsDeleteOpen(true);
									},
								},
							]
						: []),
				]}
			/>
		),
	};

	return (
		<PageWrapper title='Brands' requiredPermission={PERMISSIONS.SHOW_BRAND}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='LocalOffer' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Brands</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<Button color='primary' icon='Add' onClick={() => openForm(null)}>
							New Brand
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={canEdit || canDelete ? [...columns, actionColumn] : columns}
									data={brands}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='brands'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<BrandFormModal brand={formBrand} isOpen={isFormOpen} setIsOpen={setIsFormOpen} />
			<BrandDeleteModal brand={deleteBrand} isOpen={isDeleteOpen} setIsOpen={setIsDeleteOpen} />
		</PageWrapper>
	);
};

export default BrandsPage;

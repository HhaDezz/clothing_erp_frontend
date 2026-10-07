import React, { useState, useEffect } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
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
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getSuppliersApi,
	createSupplierApi,
	updateSupplierApi,
	deleteSupplierApi,
	SupplierPayload,
	SupplierResponse,
} from '../../../api/purchasing.api';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import showNotification from '../../../components/extras/showNotification';
import { usePermission } from '../../../hooks/usePermission';
import { getApiErrorMessage } from '../../../utils/apiError';

const CreateSupplierModal = ({
	isOpen,
	setIsOpen,
	onSuccess,
	supplier,
}: {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSuccess: () => void;
	supplier: SupplierResponse | null;
}) => {
	const isEdit = !!supplier;

	const mutation = useMutation({
		mutationFn: (values: SupplierPayload) =>
			isEdit ? updateSupplierApi(supplier.id, values) : createSupplierApi(values),
		onSuccess: () => onSuccess(),
		onError: (error) =>
			showNotification(
				'Unable to save supplier',
				getApiErrorMessage(error, 'The supplier could not be saved.'),
				'danger',
			),
	});

	const formik = useFormik({
		initialValues: {
			name: '',
			contactPerson: '',
			phone: '',
			email: '',
			address: '',
			paymentTerms: '',
		},
		validationSchema: Yup.object({
			name: Yup.string().required('Required'),
		}),
		onSubmit: (values) => {
			mutation.mutate(values as SupplierPayload);
		},
	});

	useEffect(() => {
		if (isOpen && supplier) {
			formik.setValues({
				name: supplier.name || '',
				contactPerson: supplier.contactPerson || '',
				phone: supplier.phone || '',
				email: supplier.email || '',
				address: supplier.address || '',
				paymentTerms: supplier.paymentTerms || '',
			});
		} else if (isOpen && !supplier) {
			formik.resetForm();
		}
		// Formik helpers are stable for this modal lifecycle.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, supplier]);

	if (!isOpen) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} isCentered>
			<form onSubmit={formik.handleSubmit}>
				<ModalHeader setIsOpen={setIsOpen}>
					<ModalTitle id='new-supplier-title'>
						<Icon icon={isEdit ? 'Edit' : 'Business'} className='me-2 text-primary' />
						{isEdit ? 'Edit Supplier' : 'New Supplier'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<div className='mb-3'>
						<label className='form-label fw-bold'>Name *</label>
						<input
							type='text'
							className='form-control'
							name='name'
							onChange={formik.handleChange}
							value={formik.values.name}
						/>
					</div>
					<div className='row mb-3 g-3'>
						<div className='col-6'>
							<label className='form-label'>Contact Person</label>
							<input
								type='text'
								className='form-control'
								name='contactPerson'
								onChange={formik.handleChange}
								value={formik.values.contactPerson}
							/>
						</div>
						<div className='col-6'>
							<label className='form-label'>Phone</label>
							<input
								type='text'
								className='form-control'
								name='phone'
								onChange={formik.handleChange}
								value={formik.values.phone}
							/>
						</div>
					</div>
					<div className='mb-3'>
						<label className='form-label'>Email</label>
						<input
							type='email'
							className='form-control'
							name='email'
							onChange={formik.handleChange}
							value={formik.values.email}
						/>
					</div>
					<div className='mb-3'>
						<label className='form-label'>Address</label>
						<textarea
							className='form-control'
							name='address'
							rows={2}
							onChange={formik.handleChange}
							value={formik.values.address}
						/>
					</div>
					<div className='mb-3'>
						<label className='form-label fw-bold' htmlFor='supplierPaymentTerms'>
							Payment Terms
						</label>
						<input
							id='supplierPaymentTerms'
							type='text'
							className='form-control'
							name='paymentTerms'
							onChange={formik.handleChange}
							value={formik.values.paymentTerms}
							placeholder='e.g. 30 days'
						/>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' type='submit' isDisable={mutation.isPending}>
						{mutation.isPending
							? 'Saving...'
							: isEdit
								? 'Update Supplier'
								: 'Save Supplier'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

const SuppliersPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingSupplier, setEditingSupplier] = useState<SupplierResponse | null>(null);
	const canCreate = hasPermission(PERMISSIONS.CREATE_SUPPLIER);
	const canEdit = hasPermission(PERMISSIONS.UPDATE_SUPPLIER);
	const canDelete = hasPermission(PERMISSIONS.DELETE_SUPPLIER);

	const {
		data: suppliers = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['suppliers'],
		queryFn: getSuppliersApi,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteSupplierApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
			showNotification(
				'Supplier deleted',
				'The supplier was deleted successfully.',
				'success',
			);
		},
		onError: (error) =>
			showNotification(
				'Unable to delete supplier',
				getApiErrorMessage(error, 'The supplier could not be deleted.'),
				'danger',
			),
	});

	const columns: DataTableColumn<any>[] = [
		{
			key: 'name',
			label: 'Name',
			render: (row) => <span className='fw-bold'>{row.name}</span>,
		},
		{
			key: 'contactPerson',
			label: 'Contact Person',
			render: (row) => <span>{row.contactPerson || '—'}</span>,
		},
		{
			key: 'phone',
			label: 'Phone',
			render: (row) => <span>{row.phone || '—'}</span>,
		},
		{
			key: 'paymentTerms',
			label: 'Terms',
			render: (row) => (
				<Badge color='light' className='text-dark'>
					{row.paymentTerms}
				</Badge>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={row.status === 'ACTIVE' ? 'success' : 'secondary'} isLight>
					{row.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper title='Suppliers' requiredPermission={PERMISSIONS.SHOW_SUPPLIER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Business' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Suppliers</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-new-supplier'
								icon='Add'
								color='primary'
								isLight
								onClick={() => {
									setEditingSupplier(null);
									setIsModalOpen(true);
								}}>
								New Supplier
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
																		onClick: () => {
																			setEditingSupplier(row);
																			setIsModalOpen(true);
																		},
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
																			if (
																				window.confirm(
																					`Delete supplier ${row.name}?`,
																				)
																			)
																				deleteMutation.mutate(
																					row.id,
																				);
																		},
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={suppliers}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='suppliers'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateSupplierModal
				isOpen={isModalOpen}
				setIsOpen={(v) => {
					setIsModalOpen(v);
					if (!v) setEditingSupplier(null);
				}}
				supplier={editingSupplier}
				onSuccess={() => {
					setIsModalOpen(false);
					setEditingSupplier(null);
					queryClient.invalidateQueries({ queryKey: ['suppliers'] });
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='CheckCircle' size='lg' className='me-2' />
							<span>Successfully Saved</span>
						</span>,
						'Supplier details have been saved successfully.',
					);
				}}
			/>
		</PageWrapper>
	);
};

export default SuppliersPage;

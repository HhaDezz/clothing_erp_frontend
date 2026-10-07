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
import { useCustomers } from '../../../hooks/useCustomers';
import { Customer } from '../../../api/customers.api';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import CustomerFormModal from './CustomerFormModal';
import CustomerViewModal from './CustomerViewModal';
import { formatCurrency } from '../../../helpers/currency';
import CustomerDeleteModal from './CustomerDeleteModal';

const getCustomerCode = (customer: Customer) =>
	customer.customer_code ?? customer.customerCode ?? '—';
const getCustomerFirstName = (customer: Customer) =>
	customer.first_name ?? customer.firstName ?? '';
const getCustomerLastName = (customer: Customer) => customer.last_name ?? customer.lastName ?? '';
const getCustomerFullName = (customer: Customer) =>
	`${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`.trim() || '—';

const CustomersPage = () => {
	const { hasPermission } = usePermission();
	const { data: customers = [], isLoading, error } = useCustomers();

	const [editId, setEditId] = useState<string | null>(null);
	const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
	const [modalOpen, setModalOpen] = useState(false);

	const [viewId, setViewId] = useState<string | null>(null);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

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

	const openViewModal = (id: string) => {
		setViewId(id);
		setViewModalOpen(true);
	};

	const openDelete = (id: string) => {
		setDeleteId(id);
		setDeleteOpen(true);
	};

	const canView = hasPermission(PERMISSIONS.SHOW_CUSTOMER);
	const canCreate = hasPermission(PERMISSIONS.CREATE_CUSTOMER);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_CUSTOMER);
	const canDelete = hasPermission(PERMISSIONS.DELETE_CUSTOMER);
	const canSeeInsights = hasPermission(PERMISSIONS.SHOW_CUSTOMER_INSIGHTS);

	const columns: DataTableColumn<Customer>[] = [
		{
			key: 'customer_code',
			label: 'Code',
			render: (customer) => <span className='fw-bold'>{getCustomerCode(customer)}</span>,
		},
		{
			key: 'first_name',
			label: 'Name',
			render: (customer) => <span className='fw-bold'>{getCustomerFullName(customer)}</span>,
		},
		{
			key: 'email',
			label: 'Contact',
			render: (customer) => (
				<div>
					<div>{customer.email || '—'}</div>
					<div className='text-muted small'>{customer.phone || '—'}</div>
				</div>
			),
		},
		{
			key: 'city',
			label: 'Location',
			render: (customer) => customer.city || '—',
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (customer) => (
				<Badge color={customer.status === 'ACTIVE' ? 'success' : 'danger'} isLight>
					{customer.status}
				</Badge>
			),
		},
		// Lifetime spend from the cached columns on the customer row (V78) —
		// this is exactly what that cache is for: one row each, where running
		// a spend aggregate per row would not be worth it. Open a customer to
		// get the live figure. Hidden entirely from roles without the
		// insights permission, same as the 360 view.
		...(canSeeInsights
			? ([
					{
						key: 'totalSpend',
						label: 'Lifetime Spend',
						align: 'right',
						render: (customer: Customer) => (
							<div>
								<div className='fw-bold'>
									{formatCurrency(customer.totalSpend ?? 0)}
								</div>
								<div className='text-muted small'>
									{customer.visitCount ?? 0} visit
									{(customer.visitCount ?? 0) === 1 ? '' : 's'}
									{customer.lastVisitAt
										? ` · ${new Date(customer.lastVisitAt).toLocaleDateString()}`
										: ''}
								</div>
							</div>
						),
					},
				] as DataTableColumn<Customer>[])
			: []),
	];

	return (
		<PageWrapper title='Customers' requiredPermission={PERMISSIONS.SHOW_CUSTOMER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='ContactPage' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Customers</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-customer'
								icon='Add'
								color='primary'
								isLight
								onClick={openCreateModal}>
								New Customer
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
											render: (customer) => (
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
																				customer.id.toString(),
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
																				customer.id.toString(),
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
																			openDelete(
																				customer.id.toString(),
																			),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={customers}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='customers'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			{/* Also needed for Edit, which a user may have without Create. */}
			{(canCreate || canUpdate) && (
				<CustomerFormModal
					mode={modalMode}
					id={editId}
					isOpen={modalOpen}
					setIsOpen={setModalOpen}
					customers={customers}
				/>
			)}

			<CustomerViewModal
				id={viewId}
				isOpen={viewModalOpen}
				setIsOpen={setViewModalOpen}
				customers={customers}
			/>

			<CustomerDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				customers={customers}
			/>
		</PageWrapper>
	);
};

export default CustomersPage;

import React, { useState } from 'react';
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
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchaseOrdersApi, approvePurchaseOrderApi } from '../../../api/purchasing.api';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import showNotification from '../../../components/extras/showNotification';
import { usePermission } from '../../../hooks/usePermission';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';

const PurchaseOrdersPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const canCreate = hasPermission(PERMISSIONS.CREATE_PURCHASE_ORDER);
	const canIssue = hasPermission(PERMISSIONS.UPDATE_PURCHASE_ORDER);

	const {
		data: orders = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['purchaseOrders'],
		queryFn: getPurchaseOrdersApi,
	});

	const approveMutation = useMutation({
		mutationFn: approvePurchaseOrderApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='CheckCircle' size='lg' className='me-2' />
					<span>Successfully Issued</span>
				</span>,
				'Purchase Order has been issued.',
				'success',
			);
		},
		onError: (error) =>
			showNotification(
				'Unable to issue PO',
				getApiErrorMessage(error, 'The purchase order could not be issued.'),
				'danger',
			),
	});

	const columns: DataTableColumn<any>[] = [
		{
			key: 'poNo',
			label: 'PO No',
			render: (row) => <span className='fw-bold text-primary'>{row.poNo}</span>,
		},
		{
			key: 'supplierName',
			label: 'Supplier',
			render: (row) => <span>{row.supplierName || `Supplier #${row.supplierId}`}</span>,
		},
		{
			key: 'expectedDate',
			label: 'Expected Date',
			render: (row) => (
				<span>
					{row.expectedDate ? new Date(row.expectedDate).toLocaleDateString() : '—'}
				</span>
			),
		},
		{
			key: 'totalAmount',
			label: 'Total Amount',
			align: 'right',
			render: (row) => (
				<span className='fw-bold'>{formatCurrency(row.totalAmount || 0)}</span>
			),
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => {
				let color = 'secondary';
				if (row.status === 'DRAFT') color = 'warning';
				else if (row.status === 'ISSUED') color = 'info';
				else if (row.status === 'PARTIAL') color = 'primary';
				else if (row.status === 'COMPLETED') color = 'success';

				return (
					<Badge color={color as any} isLight>
						{row.status}
					</Badge>
				);
			},
		},
	];

	return (
		<PageWrapper title='Purchase Orders' requiredPermission={PERMISSIONS.SHOW_PURCHASE_ORDER}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='RequestQuote' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Purchase Orders</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-new-po'
								icon='AddShoppingCart'
								color='primary'
								isLight
								onClick={() => setIsModalOpen(true)}>
								New PO
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
														{
															key: 'view',
															label: 'View',
															icon: 'ti ti-eye',
															className: 'text-info',
															onClick: () => {
																alert('View PO to be implemented');
															},
														},
														...(canIssue && row.status === 'DRAFT'
															? [
																	{
																		key: 'approve',
																		label: 'Issue PO',
																		icon: 'ti ti-check',
																		className: 'text-success',
																		onClick: () => {
																			if (
																				window.confirm(
																					`Issue PO ${row.poNo}?`,
																				)
																			) {
																				approveMutation.mutate(
																					row.id,
																				);
																			}
																		},
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={orders}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='purchase-orders'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreatePurchaseOrderModal
				isOpen={isModalOpen}
				setIsOpen={setIsModalOpen}
				onSuccess={() => {
					setIsModalOpen(false);
					queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='CheckCircle' size='lg' className='me-2' />
							<span>Successfully Created</span>
						</span>,
						'Purchase Order has been created successfully.',
					);
				}}
			/>
		</PageWrapper>
	);
};

export default PurchaseOrdersPage;

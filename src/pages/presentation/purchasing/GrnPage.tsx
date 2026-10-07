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
import { getGrnsApi, confirmGrnApi } from '../../../api/purchasing.api';
import CreateGrnModal from './CreateGrnModal';
import showNotification from '../../../components/extras/showNotification';
import { usePermission } from '../../../hooks/usePermission';
import { getApiErrorMessage } from '../../../utils/apiError';

const GrnPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const canCreate = hasPermission(PERMISSIONS.CREATE_GRN);
	const canConfirm = hasPermission(PERMISSIONS.UPDATE_GRN);

	const {
		data: grns = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['grns'],
		queryFn: getGrnsApi,
	});

	const confirmMutation = useMutation({
		mutationFn: confirmGrnApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['grns'] });
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='CheckCircle' size='lg' className='me-2' />
					<span>Successfully Confirmed</span>
				</span>,
				'Goods Received Note has been confirmed.',
				'success',
			);
		},
		onError: (error) =>
			showNotification(
				'Unable to confirm GRN',
				getApiErrorMessage(error, 'The goods received note could not be confirmed.'),
				'danger',
			),
	});

	const columns: DataTableColumn<any>[] = [
		{
			key: 'grnNo',
			label: 'GRN No',
			render: (row) => <span className='fw-bold text-primary'>{row.grnNo}</span>,
		},
		{
			key: 'poNo',
			label: 'PO Ref',
			render: (row) => <span>{row.poNo || `PO #${row.poId}`}</span>,
		},
		{
			key: 'receivedDate',
			label: 'Received Date',
			render: (row) => (
				<span>
					{row.receivedDate ? new Date(row.receivedDate).toLocaleDateString() : '—'}
				</span>
			),
		},
		{
			key: 'receivedBy',
			label: 'Received By',
			render: (row) => <span>{row.receivedBy || '—'}</span>,
		},
		{
			key: 'supplierInvoice',
			label: 'Supplier Invoice',
			render: (row) => <span>{row.supplierInvoice || '—'}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={row.status === 'CONFIRMED' ? 'success' : 'warning'} isLight>
					{row.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper title='Goods Received Notes' requiredPermission={PERMISSIONS.SHOW_GRN}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Inventory' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Goods Received Notes</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-receive-goods'
								icon='Inventory2'
								color='primary'
								isLight
								onClick={() => setIsModalOpen(true)}>
								Receive Goods
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
																alert('View GRN to be implemented');
															},
														},
														...(canConfirm && row.status === 'PENDING'
															? [
																	{
																		key: 'confirm',
																		label: 'Confirm GRN',
																		icon: 'ti ti-check',
																		className: 'text-success',
																		onClick: () => {
																			if (
																				window.confirm(
																					`Confirm GRN ${row.grnNo}? This will update inventory.`,
																				)
																			) {
																				confirmMutation.mutate(
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
									data={grns}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='goods-received-notes'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateGrnModal
				isOpen={isModalOpen}
				setIsOpen={setIsModalOpen}
				onSuccess={() => {
					setIsModalOpen(false);
					queryClient.invalidateQueries({ queryKey: ['grns'] });
					queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
					showNotification(
						<span className='d-flex align-items-center'>
							<Icon icon='CheckCircle' size='lg' className='me-2' />
							<span>Successfully Received</span>
						</span>,
						'Goods Received Note has been created successfully.',
					);
				}}
			/>
		</PageWrapper>
	);
};

export default GrnPage;

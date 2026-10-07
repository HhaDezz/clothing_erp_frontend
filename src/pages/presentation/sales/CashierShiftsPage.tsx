import React, { useState } from 'react';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import { PERMISSIONS } from '../../../constants/permissions';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
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
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { getUsersApi, User } from '../../../api/users.api';
import { formatCurrency } from '../../../helpers/currency';

type CashierShift = {
	id: number;
	shiftNo: string;
	cashierId: number;
	cashierName: string;
	openingCash: number;
	closingCash: number;
	status: string;
	openedAt: string;
	closedAt: string;
};

const getCashierLabel = (shift: CashierShift, users: User[] = []) =>
	shift.cashierName || users.find((user) => user.id === Number(shift.cashierId))?.name || '—';

const ShiftViewModal = ({
	shift,
	isOpen,
	setIsOpen,
	users,
}: {
	shift: CashierShift | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	users: User[];
}) => {
	if (!shift) return null;
	const netCash = (shift.closingCash || 0) - (shift.openingCash || 0);
	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='shift-view-title'>
					<Icon icon='Timer' className='me-2 text-warning' />
					Shift — {shift.shiftNo || '—'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-3'>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Cashier
						</label>
						<p className='fw-bold mb-0'>{getCashierLabel(shift, users)}</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Status
						</label>
						<p className='mb-0'>
							<Badge
								color={shift.status === 'CLOSED' ? 'success' : 'warning'}
								isLight>
								{shift.status}
							</Badge>
						</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Opened At
						</label>
						<p className='mb-0 text-muted small'>
							{shift.openedAt ? new Date(shift.openedAt).toLocaleString() : '—'}
						</p>
					</div>
					<div className='col-6'>
						<label className='text-muted small fw-semibold text-uppercase'>
							Closed At
						</label>
						<p className='mb-0 text-muted small'>
							{shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '—'}
						</p>
					</div>
					<div className='col-12'>
						<hr className='my-1' />
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Opening Cash</p>
						<h5 className='fw-bold'>{formatCurrency(shift.openingCash || 0)}</h5>
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Closing Cash</p>
						<h5 className='fw-bold'>{formatCurrency(shift.closingCash || 0)}</h5>
					</div>
					<div className='col-4 text-center'>
						<p className='text-muted small mb-1'>Net Cash</p>
						<h5 className={`fw-bold ${netCash >= 0 ? 'text-success' : 'text-danger'}`}>
							{formatCurrency(netCash)}
						</h5>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Close
				</Button>
			</ModalFooter>
		</Modal>
	);
};

import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { closeShiftApi } from '../../../api/pos.api';

const CloseShiftModal = ({
	isOpen,
	setIsOpen,
}: {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}) => {
	const queryClient = useQueryClient();

	const formik = useFormik({
		initialValues: {
			closingCash: '',
			notes: '',
		},
		validate: (values) => {
			const errors: any = {};
			if (!values.closingCash) {
				errors.closingCash = 'Required';
			} else if (isNaN(Number(values.closingCash)) || Number(values.closingCash) < 0) {
				errors.closingCash = 'Must be a valid positive number';
			}
			return errors;
		},
		onSubmit: async (values, { setSubmitting, resetForm }) => {
			try {
				await closeShiftApi({
					closingCash: Number(values.closingCash),
					notes: values.notes,
				});
				showNotification('Success', 'Shift closed successfully', 'success');
				resetForm();
				setIsOpen(false);
				queryClient.invalidateQueries({ queryKey: ['cashierShifts'] });
			} catch (error: any) {
				showNotification('Error', error.response?.data?.message || 'Failed to close shift', 'danger');
			} finally {
				setSubmitting(false);
			}
		},
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='close-shift-title'>
					<Icon icon='TimerOff' className='me-2 text-danger' />
					Close Active Shift
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<form onSubmit={formik.handleSubmit}>
					<FormGroup id='closingCash' label='Closing Cash Amount (Rs.)' className='mb-3'>
						<Input
							type='number'
							step='0.01'
							onChange={formik.handleChange}
							value={formik.values.closingCash}
							isValid={formik.isValid}
							isTouched={formik.touched.closingCash}
							invalidFeedback={formik.errors.closingCash}
						/>
					</FormGroup>
					<FormGroup id='notes' label='Notes (Optional)'>
						<Input
							type='text'
							onChange={formik.handleChange}
							value={formik.values.notes}
						/>
					</FormGroup>
				</form>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='danger' onClick={() => formik.handleSubmit()} isDisable={formik.isSubmitting}>
					Close Shift
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const CashierShiftsPage = () => {
	const [viewShift, setViewShift] = useState<CashierShift | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
	const { data: users = [] } = useQuery<User[]>({
		queryKey: ['users'],
		queryFn: getUsersApi,
	});

	const {
		data: shifts = [],
		isLoading,
		error,
	} = useQuery<CashierShift[]>({
		queryKey: ['cashierShifts'],
		queryFn: async () => {
			const res = await api.get('/cashier-shifts');
			return res.data.data ?? [];
		},
	});

	// Check if there is an active shift for the current user (this is a simplified check, assuming if any shift is OPEN, we can close it)
	const hasActiveShift = shifts.some((s) => s.status === 'OPEN');

	const columns: DataTableColumn<CashierShift>[] = [
		{
			key: 'shiftNo',
			label: 'Shift No',
			render: (row) => <span className='fw-bold'>{row.shiftNo || '—'}</span>,
		},
		{
			key: 'cashierName',
			label: 'Cashier',
			render: (row) => <span>{getCashierLabel(row, users)}</span>,
		},
		{
			key: 'openingCash',
			label: 'Opening Cash',
			align: 'right',
			render: (row) => <span>{formatCurrency(row.openingCash || 0)}</span>,
		},
		{
			key: 'closingCash',
			label: 'Closing Cash',
			align: 'right',
			render: (row) => <span>{formatCurrency(row.closingCash || 0)}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={row.status === 'CLOSED' ? 'success' : 'warning'} isLight>
					{row.status}
				</Badge>
			),
		},
		{
			key: 'openedAt',
			label: 'Opened At',
			render: (row) => (
				<span className='text-muted small'>
					{row.openedAt ? new Date(row.openedAt).toLocaleString() : '—'}
				</span>
			),
		},
	];

	return (
		<PageWrapper title='Cashier Shifts' requiredPermission={PERMISSIONS.SHOW_CASHIER_SHIFT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Timer' size='2x' color='warning' />
					<span className='fs-5 fw-bold ms-2'>Cashier Shifts</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{hasActiveShift && (
						<Button color='danger' icon='TimerOff' onClick={() => setIsCloseModalOpen(true)}>
							Close Active Shift
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
															label: 'View Details',
															icon: 'ti ti-eye',
															className: 'text-info',
															onClick: () => {
																setViewShift(row);
																setIsViewModalOpen(true);
															},
														},
													]}
												/>
											),
										},
									]}
									data={shifts}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='cashier-shifts'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ShiftViewModal
				shift={viewShift}
				isOpen={isViewModalOpen}
				setIsOpen={setIsViewModalOpen}
				users={users}
			/>

			<CloseShiftModal
				isOpen={isCloseModalOpen}
				setIsOpen={setIsCloseModalOpen}
			/>
		</PageWrapper>
	);
};

export default CashierShiftsPage;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getShowroomsApi } from '../../../api/showrooms.api';
import {
	getUserShowroomAccessListApi,
	updateUserShowroomAccessApi,
	UserShowroomAccess,
} from '../../../api/showroomAccess.api';
import ShowroomAccessFormModal from './ShowroomAccessFormModal';

/**
 * Dedicated master-data page for assigning showroom(s) to a user — "need
 * separate showroom allocation (users)... give me switching tabs for show
 * room switching (only assigned users can switch their showroom)". Kept
 * separate from Warehouse Access (each has its own page and permission
 * pair) even though both edit the same underlying user_has_warehouses
 * relationship — see UserService#updateShowroomAccess. Drives which
 * showroom(s) each user sees requests for on Showroom Requests / Approve
 * Requests, and which of the LocationTabs they can switch to.
 */
const ShowroomAccessPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canEdit = hasPermission(PERMISSIONS.EDIT_SHOWROOM_ACCESS);

	const [editTarget, setEditTarget] = useState<UserShowroomAccess | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		data: accessList = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ['user-showroom-access'], queryFn: getUserShowroomAccessListApi });

	const { data: showrooms = [] } = useQuery({ queryKey: ['showrooms'], queryFn: getShowroomsApi });

	const updateMutation = useMutation({
		mutationFn: ({ userId, showroomIds }: { userId: number; showroomIds: number[] }) =>
			updateUserShowroomAccessApi(userId, { showroomIds }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-showroom-access'] });
			setIsModalOpen(false);
			setEditTarget(null);
			showNotification(
				<span className='d-flex align-items-center'>
					<Icon icon='Storefront' size='lg' className='me-1' />
					<span>Showroom Access Updated</span>
				</span>,
				'',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to update showroom access'), 'danger'),
	});

	const columns: DataTableColumn<UserShowroomAccess>[] = [
		{
			key: 'userName',
			label: 'User',
			render: (row) => (
				<div>
					<span className='fw-bold'>{row.userName}</span>
					<div className='small text-muted'>{row.userEmail}</div>
				</div>
			),
		},
		{
			key: 'showroomNames',
			label: 'Assigned Showroom(s)',
			render: (row) =>
				row.showroomNames.length > 0 ? (
					<div className='d-flex flex-wrap gap-1'>
						{row.showroomNames.map((name) => (
							<Badge key={name} color='primary' isLight>
								{name}
							</Badge>
						))}
					</div>
				) : (
					<span className='text-muted small fst-italic'>None — sees every showroom request</span>
				),
		},
		{
			key: 'actions',
			label: '',
			align: 'right',
			sortable: false,
			searchable: false,
			render: (row) => (
				<DataTableActionMenu
					actions={
						canEdit
							? [
									{
										key: 'edit',
										label: 'Assign Showrooms',
										icon: 'ti ti-edit',
										className: 'text-primary',
										onClick: () => {
											setEditTarget(row);
											setIsModalOpen(true);
										},
									},
								]
							: []
					}
				/>
			),
		},
	];

	return (
		<PageWrapper title='Showroom Access' requiredPermission={PERMISSIONS.SHOW_SHOWROOM_ACCESS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Storefront' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Showroom Access</span>
					<span className='text-muted small ms-2 d-none d-md-inline'>
						Controls which showroom requests each user can see and switch to
					</span>
				</SubHeaderLeft>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={accessList}
									rowKey='userId'
									loading={isLoading}
									error={error}
									fileName='showroom-access'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<ShowroomAccessFormModal
				isOpen={isModalOpen}
				setIsOpen={(v) => {
					setIsModalOpen(v);
					if (!v) setEditTarget(null);
				}}
				access={editTarget}
				showrooms={showrooms}
				isLoading={updateMutation.isPending}
				onSubmit={(showroomIds) => {
					if (editTarget) updateMutation.mutate({ userId: editTarget.userId, showroomIds });
				}}
			/>
		</PageWrapper>
	);
};

export default ShowroomAccessPage;

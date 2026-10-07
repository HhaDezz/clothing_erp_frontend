import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import { importMenu } from '../../../menu';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';
import useDarkMode from '../../../hooks/useDarkMode';
import { getDefectiveReasonsApi } from '../../../api/defectiveReasons.api';
import DefectiveReasonFormModal from './DefectiveReasonFormModal';
import DefectiveReasonDeleteModal from './DefectiveReasonDeleteModal';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import type { DefectiveReason } from '../../../api/defectiveReasons.api';

const DefectiveReasonsPage = () => {
	const { darkModeStatus } = useDarkMode();
	const { hasPermission } = usePermission();
	const {
		data: reasons = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ['defective-reasons'], queryFn: getDefectiveReasonsApi });

	const [viewId, setViewId] = useState<number | null>(null);
	const [viewOpen, setViewOpen] = useState(false);
	const [editId, setEditId] = useState<number | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const canView = hasPermission(PERMISSIONS.SHOW_DEFECTIVE_REASON);
	const canCreate = hasPermission(PERMISSIONS.CREATE_DEFECTIVE_REASON);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_DEFECTIVE_REASON);
	const canDelete = hasPermission(PERMISSIONS.DELETE_DEFECTIVE_REASON);

	const openView = (id: number) => {
		setViewId(id);
		setViewOpen(true);
	};
	const openEdit = (id: number | null) => {
		setEditId(id);
		setEditOpen(true);
	};
	const openDelete = (id: number) => {
		setDeleteId(id);
		setDeleteOpen(true);
	};

	const columns: DataTableColumn<DefectiveReason>[] = [
		{
			key: 'code',
			label: 'Code',
			align: 'center',
			render: (reason) => (
				<span className={`fw-bold text-${darkModeStatus ? 'light' : 'dark'}`}>
					{reason.code}
				</span>
			),
			exportValue: (reason) => reason.code,
		},
		{
			key: 'label',
			label: 'Label',
			render: (reason) => (
				<span className={`text-${darkModeStatus ? 'light' : 'muted'}`}>{reason.label}</span>
			),
			exportValue: (reason) => reason.label,
		},
		{
			key: 'active',
			label: 'Status',
			align: 'center',
			render: (reason) => (
				<Badge color={reason.active ? 'success' : 'secondary'} isLight className='px-3 py-2'>
					{reason.active ? 'Active' : 'Inactive'}
				</Badge>
			),
			exportValue: (reason) => (reason.active ? 'Active' : 'Inactive'),
		},
	];

	return (
		<PageWrapper
			title={importMenu.defectiveReasons.text}
			requiredPermission={PERMISSIONS.SHOW_DEFECTIVE_REASON}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='ReportProblem' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Defective Reasons</span>
					<span className='text-muted small ms-2 d-none d-md-inline'>
						Used during QA (Bay 2) to categorize rejected import items
					</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-defective-reason'
								icon='Add'
								color='primary'
								isLight
								onClick={() => openEdit(null)}>
								New Reason
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
											render: (reason) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () => openView(reason.id),
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
																		onClick: () => openEdit(reason.id),
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
																		onClick: () => openDelete(reason.id),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={reasons}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='defective-reasons'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<DefectiveReasonFormModal
				mode='view'
				id={viewId}
				isOpen={viewOpen}
				setIsOpen={setViewOpen}
				reasons={reasons}
				onEdit={canUpdate ? (id) => openEdit(id) : undefined}
			/>
			<DefectiveReasonFormModal
				mode={editId === null ? 'add' : 'edit'}
				id={editId}
				isOpen={editOpen}
				setIsOpen={setEditOpen}
				reasons={reasons}
			/>
			<DefectiveReasonDeleteModal
				id={deleteId}
				isOpen={deleteOpen}
				setIsOpen={setDeleteOpen}
				reasons={reasons}
			/>
		</PageWrapper>
	);
};

export default DefectiveReasonsPage;

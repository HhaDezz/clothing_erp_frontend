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
import { useMaterials } from '../../../hooks/useMaterials';
import { Material } from '../../../api/materials.api';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import MaterialFormModal from './MaterialFormModal';
import MaterialViewModal from './MaterialViewModal';

const MaterialsPage = () => {
	const { hasPermission } = usePermission();
	const { data: materials = [], isLoading, error } = useMaterials();

	const [editId, setEditId] = useState<string | null>(null);
	const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
	const [modalOpen, setModalOpen] = useState(false);

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

	const openViewModal = (id: string) => {
		setViewId(id);
		setViewModalOpen(true);
	};

	const canView = hasPermission(PERMISSIONS.SHOW_MATERIAL);
	const canCreate = hasPermission(PERMISSIONS.CREATE_MATERIAL);
	const canUpdate = hasPermission(PERMISSIONS.UPDATE_MATERIAL);
	const canDelete = hasPermission(PERMISSIONS.DELETE_MATERIAL);

	const columns: DataTableColumn<Material>[] = [
		{
			key: 'materialCode',
			label: 'Code',
			render: (material) => <span className='fw-bold'>{material.materialCode}</span>,
		},
		{
			key: 'name',
			label: 'Material Name',
			render: (material) => (
				<div>
					<div className='fw-bold'>{material.name}</div>
					<div className='text-muted small'>{material.materialType || 'General'}</div>
				</div>
			),
		},
		{
			key: 'unit',
			label: 'Unit',
			align: 'center',
		},
		{
			key: 'reorderLevel',
			label: 'Reorder Level',
			align: 'right',
			render: (m) => <span className='text-warning'>{m.reorderLevel} {m.unit}</span>
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (material) => (
				<Badge color={material.status === 'ACTIVE' ? 'success' : 'danger'} isLight>
					{material.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper
			title='Materials'
			requiredPermission={PERMISSIONS.SHOW_MATERIAL}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Architecture' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Materials</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-create-material'
								icon='Add'
								color='primary'
								isLight
								onClick={openCreateModal}>
								New Material
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
											render: (material) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () => openViewModal(material.id.toString()),
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
																		onClick: () => openEditModal(material.id.toString()),
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
																			alert('Delete Material Flow To Be Implemented'),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={materials}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='materials'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>
			
			{canCreate && (
				<MaterialFormModal
					mode={modalMode}
					id={editId}
					isOpen={modalOpen}
					setIsOpen={setModalOpen}
					materials={materials}
				/>
			)}

			<MaterialViewModal
				id={viewId}
				isOpen={viewModalOpen}
				setIsOpen={setViewModalOpen}
				materials={materials}
			/>
		</PageWrapper>
	);
};

export default MaterialsPage;

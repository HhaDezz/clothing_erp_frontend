import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody, CardHeader, CardTitle } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import { useMeasurementTypes } from '../../../hooks/useMeasurementTypes';
import { useBodyMeasurements } from '../../../hooks/useBodyMeasurements';
import {
	BodyMeasurement,
	deleteBodyMeasurementApi,
	deleteMeasurementTypeApi,
	MeasurementType,
} from '../../../api/measurements.api';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permissions';
import MeasurementTypeFormModal from './MeasurementTypeFormModal';
import BodyMeasurementFormModal from './BodyMeasurementFormModal';
import MeasurementTypeViewModal from './MeasurementTypeViewModal';
import BodyMeasurementViewModal from './BodyMeasurementViewModal';
import Nav, { NavItem } from '../../../components/bootstrap/Nav';
import showNotification from '../../../components/extras/showNotification';
import MeasurementTypeFieldsModal from './MeasurementTypeFieldsModal';

const MeasurementsPage = () => {
	const { hasPermission } = usePermission();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<'types' | 'body'>('types');

	// Measurement Types State
	const {
		data: measurementTypes = [],
		isLoading: isLoadingTypes,
		error: errorTypes,
	} = useMeasurementTypes();
	const [typeEditId, setTypeEditId] = useState<string | null>(null);
	const [typeModalMode, setTypeModalMode] = useState<'add' | 'edit'>('add');
	const [typeModalOpen, setTypeModalOpen] = useState(false);

	const [typeViewId, setTypeViewId] = useState<string | null>(null);
	const [typeViewModalOpen, setTypeViewModalOpen] = useState(false);
	const [fieldsTypeId, setFieldsTypeId] = useState<string | null>(null);
	const [fieldsModalOpen, setFieldsModalOpen] = useState(false);

	// Body Measurements State
	const {
		data: bodyMeasurements = [],
		isLoading: isLoadingBody,
		error: errorBody,
	} = useBodyMeasurements();
	const [bodyEditId, setBodyEditId] = useState<string | null>(null);
	const [bodyModalMode, setBodyModalMode] = useState<'add' | 'edit'>('add');
	const [bodyModalOpen, setBodyModalOpen] = useState(false);

	const [bodyViewId, setBodyViewId] = useState<string | null>(null);
	const [bodyViewModalOpen, setBodyViewModalOpen] = useState(false);

	// Permissions
	const canViewType = hasPermission(PERMISSIONS.SHOW_MEASUREMENT_TYPE);
	const canCreateType = hasPermission(PERMISSIONS.CREATE_MEASUREMENT_TYPE);
	const canUpdateType = hasPermission(PERMISSIONS.UPDATE_MEASUREMENT_TYPE);
	const canDeleteType = hasPermission(PERMISSIONS.DELETE_MEASUREMENT_TYPE);

	const canViewBody = hasPermission(PERMISSIONS.SHOW_BODY_MEASUREMENT);
	const canCreateBody = hasPermission(PERMISSIONS.CREATE_BODY_MEASUREMENT);
	const canUpdateBody = hasPermission(PERMISSIONS.UPDATE_BODY_MEASUREMENT);
	const canDeleteBody = hasPermission(PERMISSIONS.DELETE_BODY_MEASUREMENT);

	const openCreateTypeModal = () => {
		setTypeEditId(null);
		setTypeModalMode('add');
		setTypeModalOpen(true);
	};

	const openEditTypeModal = (id: string) => {
		setTypeEditId(id);
		setTypeModalMode('edit');
		setTypeModalOpen(true);
	};

	const openViewTypeModal = (id: string) => {
		setTypeViewId(id);
		setTypeViewModalOpen(true);
	};

	const openFieldsModal = (id: string) => {
		setFieldsTypeId(id);
		setFieldsModalOpen(true);
	};

	const deleteMeasurementType = async (measurementType: MeasurementType) => {
		if (!window.confirm(`Delete measurement type “${measurementType.name}”?`)) return;
		try {
			await deleteMeasurementTypeApi(measurementType.id);
			await queryClient.invalidateQueries({ queryKey: ['measurement-types'] });
			showNotification('Measurement type deleted', measurementType.name, 'success');
		} catch (requestError: any) {
			showNotification(
				'Unable to delete measurement type',
				requestError?.response?.data?.message ||
					'This template may still be assigned to products.',
				'danger',
			);
		}
	};

	const deleteBodyMeasurement = async (measurement: BodyMeasurement) => {
		if (!window.confirm(`Delete body measurement “${measurement.name}”?`)) return;
		try {
			await deleteBodyMeasurementApi(measurement.id);
			await queryClient.invalidateQueries({ queryKey: ['body-measurements'] });
			showNotification('Body measurement deleted', measurement.name, 'success');
		} catch (requestError: any) {
			showNotification(
				'Unable to delete body measurement',
				requestError?.response?.data?.message ||
					'This measurement may still be used by a template.',
				'danger',
			);
		}
	};

	const openCreateBodyModal = () => {
		setBodyEditId(null);
		setBodyModalMode('add');
		setBodyModalOpen(true);
	};

	const openEditBodyModal = (id: string) => {
		setBodyEditId(id);
		setBodyModalMode('edit');
		setBodyModalOpen(true);
	};

	const openViewBodyModal = (id: string) => {
		setBodyViewId(id);
		setBodyViewModalOpen(true);
	};

	const typeColumns: DataTableColumn<MeasurementType>[] = [
		{ key: 'code', label: 'Code', render: (mt) => <span className='fw-bold'>{mt.code}</span> },
		{ key: 'name', label: 'Name' },
		{ key: 'garmentCategory', label: 'Garment Category' },
		{ key: 'defaultUnit', label: 'Default Unit' },
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (mt) => (
				<Badge color={mt.status === 'ACTIVE' ? 'success' : 'danger'} isLight>
					{mt.status}
				</Badge>
			),
		},
	];

	const bodyColumns: DataTableColumn<BodyMeasurement>[] = [
		{ key: 'code', label: 'Code', render: (bm) => <span className='fw-bold'>{bm.code}</span> },
		{ key: 'name', label: 'Measurement Name' },
		{
			key: 'bodyArea',
			label: 'Body Area',
			render: (bm) => bm.bodyArea?.replace('_', ' ') || '—',
		},
		{ key: 'unit', label: 'Unit' },
		{ key: 'inputType', label: 'Input Type' },
		{ key: 'displayOrder', label: 'Order', align: 'center' },
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (bm) => (
				<Badge color={bm.status === 'ACTIVE' ? 'success' : 'danger'} isLight>
					{bm.status}
				</Badge>
			),
		},
	];

	return (
		<PageWrapper
			title='Measurement Setup'
			requiredPermission={PERMISSIONS.SHOW_MEASUREMENT_TYPE}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Straighten' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Measurement Setup</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{activeTab === 'types' && canCreateType && (
						<>
							<SubheaderSeparator />
							<Button
								icon='Add'
								color='primary'
								isLight
								onClick={openCreateTypeModal}>
								New Measurement Type
							</Button>
						</>
					)}
					{activeTab === 'body' && canCreateBody && (
						<>
							<SubheaderSeparator />
							<Button
								icon='Add'
								color='success'
								isLight
								onClick={openCreateBodyModal}>
								New Body Measurement
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardHeader>
								<CardTitle>
									<Nav design='pills'>
										<NavItem isActive={activeTab === 'types'}>
											<span
												onClick={() => setActiveTab('types')}
												className='cursor-pointer'>
												Measurement Types (Templates)
											</span>
										</NavItem>
										<NavItem isActive={activeTab === 'body'}>
											<span
												onClick={() => setActiveTab('body')}
												className='cursor-pointer'>
												Body Measurements (Parameters)
											</span>
										</NavItem>
									</Nav>
								</CardTitle>
							</CardHeader>
							<CardBody style={{ overflow: 'visible' }}>
								{activeTab === 'types' && (
									<DataTable
										columns={[
											...typeColumns,
											{
												key: 'actions',
												label: '',
												align: 'right',
												sortable: false,
												searchable: false,
												render: (mt) => (
													<DataTableActionMenu
														actions={[
															...(canViewType
																? [
																		{
																			key: 'view',
																			label: 'View',
																			icon: 'ti ti-eye',
																			className: 'text-info',
																			onClick: () =>
																				openViewTypeModal(
																					mt.id.toString(),
																				),
																		},
																	]
																: []),
															...(canUpdateType
																? [
																		{
																			key: 'edit',
																			label: 'Edit',
																			icon: 'ti ti-edit',
																			className:
																				'text-primary',
																			onClick: () =>
																				openEditTypeModal(
																					mt.id.toString(),
																				),
																		},
																		{
																			key: 'fields',
																			label: 'Fields / Setup',
																			icon: 'ti ti-list',
																			className: 'text-info',
																			onClick: () =>
																				openFieldsModal(
																					mt.id.toString(),
																				),
																		},
																	]
																: []),
															...(canDeleteType
																? [
																		{
																			key: 'delete',
																			label: 'Delete',
																			icon: 'ti ti-trash',
																			className:
																				'text-danger',
																			onClick: () =>
																				deleteMeasurementType(
																					mt,
																				),
																		},
																	]
																: []),
														]}
													/>
												),
											},
										]}
										data={measurementTypes}
										rowKey='id'
										loading={isLoadingTypes}
										error={errorTypes}
										fileName='measurement_types'
										showActions={false}
									/>
								)}
								{activeTab === 'body' && (
									<DataTable
										columns={[
											...bodyColumns,
											{
												key: 'actions',
												label: '',
												align: 'right',
												sortable: false,
												searchable: false,
												render: (bm) => (
													<DataTableActionMenu
														actions={[
															...(canViewBody
																? [
																		{
																			key: 'view',
																			label: 'View',
																			icon: 'ti ti-eye',
																			className: 'text-info',
																			onClick: () =>
																				openViewBodyModal(
																					bm.id.toString(),
																				),
																		},
																	]
																: []),
															...(canUpdateBody
																? [
																		{
																			key: 'edit',
																			label: 'Edit',
																			icon: 'ti ti-edit',
																			className:
																				'text-primary',
																			onClick: () =>
																				openEditBodyModal(
																					bm.id.toString(),
																				),
																		},
																	]
																: []),
															...(canDeleteBody
																? [
																		{
																			key: 'delete',
																			label: 'Delete',
																			icon: 'ti ti-trash',
																			className:
																				'text-danger',
																			onClick: () =>
																				deleteBodyMeasurement(
																					bm,
																				),
																		},
																	]
																: []),
														]}
													/>
												),
											},
										]}
										data={bodyMeasurements}
										rowKey='id'
										loading={isLoadingBody}
										error={errorBody}
										fileName='body_measurements'
										showActions={false}
									/>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			{(canCreateType || canUpdateType) && (
				<MeasurementTypeFormModal
					mode={typeModalMode}
					id={typeEditId}
					isOpen={typeModalOpen}
					setIsOpen={setTypeModalOpen}
					measurementTypes={measurementTypes}
				/>
			)}

			{(canCreateBody || canUpdateBody) && (
				<BodyMeasurementFormModal
					mode={bodyModalMode}
					id={bodyEditId}
					isOpen={bodyModalOpen}
					setIsOpen={setBodyModalOpen}
					bodyMeasurements={bodyMeasurements}
				/>
			)}

			<MeasurementTypeViewModal
				id={typeViewId}
				isOpen={typeViewModalOpen}
				setIsOpen={setTypeViewModalOpen}
				measurementTypes={measurementTypes}
			/>

			<BodyMeasurementViewModal
				id={bodyViewId}
				isOpen={bodyViewModalOpen}
				setIsOpen={setBodyViewModalOpen}
				bodyMeasurements={bodyMeasurements}
			/>

			{canUpdateType && (
				<MeasurementTypeFieldsModal
					measurementType={
						measurementTypes.find(
							(measurementType) => measurementType.id.toString() === fieldsTypeId,
						) || null
					}
					bodyMeasurements={bodyMeasurements}
					isOpen={fieldsModalOpen}
					setIsOpen={setFieldsModalOpen}
				/>
			)}
		</PageWrapper>
	);
};

export default MeasurementsPage;

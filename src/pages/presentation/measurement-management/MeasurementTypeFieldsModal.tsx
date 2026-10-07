import React, { FC, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Spinner from '../../../components/bootstrap/Spinner';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import {
	addMeasurementTypeFieldApi,
	BodyMeasurement,
	getMeasurementTypeFieldsApi,
	MeasurementType,
	MeasurementTypeField,
	removeMeasurementTypeFieldApi,
	updateMeasurementTypeFieldApi,
} from '../../../api/measurements.api';

interface IMeasurementTypeFieldsModalProps {
	measurementType: MeasurementType | null;
	bodyMeasurements: BodyMeasurement[];
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

type TFieldDraft = {
	isRequired: boolean;
	displayOrder: number;
	defaultUnit: 'INCHES' | 'CM';
	tolerance: string;
	notes: string;
};

const MeasurementTypeFieldsModal: FC<IMeasurementTypeFieldsModalProps> = ({
	measurementType,
	bodyMeasurements,
	isOpen,
	setIsOpen,
}) => {
	const queryClient = useQueryClient();
	const [selectedBodyMeasurementId, setSelectedBodyMeasurementId] = useState('');
	const [drafts, setDrafts] = useState<Record<number, TFieldDraft>>({});
	const [isSaving, setIsSaving] = useState(false);

	const queryKey = ['measurement-type-fields', measurementType?.id];
	const {
		data: fields = [],
		isLoading,
		error,
	} = useQuery({
		queryKey,
		queryFn: () => getMeasurementTypeFieldsApi(measurementType!.id),
		enabled: isOpen && Boolean(measurementType),
	});

	const getInitialDraft = (field: MeasurementTypeField): TFieldDraft => ({
		isRequired: field.isRequired,
		displayOrder: field.displayOrder,
		defaultUnit:
			field.defaultUnit ||
			field.bodyMeasurement?.unit ||
			measurementType?.defaultUnit ||
			'INCHES',
		tolerance: field.tolerance?.toString() || '',
		notes: field.notes || '',
	});

	const availableMeasurements = useMemo(() => {
		const assignedIds = new Set(fields.map((field) => field.bodyMeasurementId));
		return bodyMeasurements
			.filter(
				(measurement) =>
					measurement.status === 'ACTIVE' && !assignedIds.has(measurement.id),
			)
			.sort((a, b) => a.displayOrder - b.displayOrder);
	}, [bodyMeasurements, fields]);

	const getMeasurement = (field: MeasurementTypeField) =>
		field.bodyMeasurement ||
		bodyMeasurements.find((measurement) => measurement.id === field.bodyMeasurementId);

	const updateDraft = (fieldId: number, patch: Partial<TFieldDraft>) => {
		const field = fields.find((item) => item.id === fieldId);
		if (!field) return;
		setDrafts((current) => ({
			...current,
			[fieldId]: { ...(current[fieldId] || getInitialDraft(field)), ...patch },
		}));
	};

	const handleAdd = async () => {
		if (!measurementType || !selectedBodyMeasurementId) return;
		const measurement = bodyMeasurements.find(
			(item) => item.id === Number(selectedBodyMeasurementId),
		);

		try {
			setIsSaving(true);
			await addMeasurementTypeFieldApi(measurementType.id, {
				bodyMeasurementId: Number(selectedBodyMeasurementId),
				isRequired: true,
				displayOrder: fields.length + 1,
				defaultUnit: measurement?.unit || measurementType.defaultUnit,
			});
			setSelectedBodyMeasurementId('');
			await queryClient.invalidateQueries({ queryKey });
		} catch (requestError: any) {
			showNotification(
				'Unable to add field',
				requestError?.response?.data?.message ||
					'The measurement field could not be added.',
				'danger',
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleSave = async () => {
		if (!measurementType) return;
		try {
			setIsSaving(true);
			await Promise.all(
				fields.map((field) => {
					const draft = drafts[field.id] || getInitialDraft(field);
					return updateMeasurementTypeFieldApi(measurementType.id, field.id, {
						bodyMeasurementId: field.bodyMeasurementId,
						isRequired: draft.isRequired,
						displayOrder: Number(draft.displayOrder),
						defaultUnit: draft.defaultUnit,
						tolerance: draft.tolerance === '' ? undefined : Number(draft.tolerance),
						notes: draft.notes.trim() || undefined,
					});
				}),
			);
			await queryClient.invalidateQueries({ queryKey });
			showNotification(
				'Template updated',
				`${measurementType.name} now has ${fields.length} configured measurement fields.`,
				'success',
			);
			setIsOpen(false);
		} catch (requestError: any) {
			showNotification(
				'Unable to save template',
				requestError?.response?.data?.message || 'The template fields could not be saved.',
				'danger',
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleRemove = async (field: MeasurementTypeField) => {
		if (!measurementType) return;
		const measurement = getMeasurement(field);
		if (!window.confirm(`Remove ${measurement?.name || 'this field'} from the template?`)) {
			return;
		}

		try {
			setIsSaving(true);
			await removeMeasurementTypeFieldApi(measurementType.id, field.id);
			await queryClient.invalidateQueries({ queryKey });
		} catch (requestError: any) {
			showNotification(
				'Unable to remove field',
				requestError?.response?.data?.message ||
					'The measurement field could not be removed.',
				'danger',
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='xl'
			titleId='measurement-template-fields-title'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='measurement-template-fields-title'>
					<Icon icon='FormatListNumbered' className='me-2 text-primary' />
					{measurementType?.name || 'Measurement Template'} Fields
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<div className='alert alert-info d-flex align-items-start gap-2'>
					<Icon icon='Info' className='mt-1' />
					<div>
						<strong>Configure the product-driven measurement screen.</strong>
						<div className='small'>
							Required fields block sew-and-sell order creation until completed.
						</div>
					</div>
				</div>

				<div className='card border mb-4'>
					<div className='card-body'>
						<label className='form-label fw-bold' htmlFor='newBodyMeasurementId'>
							Add a body measurement
						</label>
						<div className='input-group'>
							<select
								id='newBodyMeasurementId'
								className='form-select'
								value={selectedBodyMeasurementId}
								onChange={(event) =>
									setSelectedBodyMeasurementId(event.target.value)
								}
								disabled={isSaving}>
								<option value=''>Choose from the body measurement master...</option>
								{availableMeasurements.map((measurement) => (
									<option key={measurement.id} value={measurement.id}>
										{measurement.name} ({measurement.code})
									</option>
								))}
							</select>
							<Button
								color='primary'
								icon='Add'
								isDisable={!selectedBodyMeasurementId || isSaving}
								onClick={handleAdd}>
								Add Field
							</Button>
						</div>
					</div>
				</div>

				{isLoading && (
					<div className='text-center py-5'>
						<Spinner color='primary' />
					</div>
				)}
				{error && <div className='alert alert-danger'>Unable to load template fields.</div>}
				{!isLoading && !error && fields.length === 0 && (
					<div className='text-center text-muted py-5 border rounded'>
						<Icon icon='Straighten' size='3x' className='mb-2 opacity-50' />
						<p className='mb-0'>No measurements are assigned to this template yet.</p>
					</div>
				)}

				{fields.length > 0 && (
					<div className='table-responsive'>
						<table className='table table-hover align-middle'>
							<thead>
								<tr>
									<th>Measurement</th>
									<th style={{ width: '8rem' }}>Order</th>
									<th style={{ width: '9rem' }}>Unit</th>
									<th style={{ width: '8rem' }}>Required</th>
									<th style={{ width: '8rem' }}>Tolerance</th>
									<th>Notes</th>
									<th aria-label='Actions' />
								</tr>
							</thead>
							<tbody>
								{fields
									.slice()
									.sort(
										(a, b) =>
											(drafts[a.id]?.displayOrder ?? a.displayOrder) -
											(drafts[b.id]?.displayOrder ?? b.displayOrder),
									)
									.map((field) => {
										const measurement = getMeasurement(field);
										const draft = drafts[field.id] || getInitialDraft(field);
										return (
											<tr key={field.id}>
												<td>
													<div className='fw-bold'>
														{measurement?.name}
													</div>
													<small className='text-muted'>
														{measurement?.code}
													</small>
												</td>
												<td>
													<input
														type='number'
														className='form-control form-control-sm'
														min={0}
														value={draft.displayOrder}
														onChange={(event) =>
															updateDraft(field.id, {
																displayOrder: Number(
																	event.target.value,
																),
															})
														}
													/>
												</td>
												<td>
													<select
														className='form-select form-select-sm'
														value={draft.defaultUnit}
														onChange={(event) =>
															updateDraft(field.id, {
																defaultUnit: event.target.value as
																	| 'INCHES'
																	| 'CM',
															})
														}>
														<option value='INCHES'>Inches</option>
														<option value='CM'>CM</option>
													</select>
												</td>
												<td className='text-center'>
													<input
														type='checkbox'
														className='form-check-input'
														checked={draft.isRequired}
														onChange={(event) =>
															updateDraft(field.id, {
																isRequired: event.target.checked,
															})
														}
													/>
												</td>
												<td>
													<input
														type='number'
														className='form-control form-control-sm'
														min={0}
														step='0.01'
														value={draft.tolerance}
														onChange={(event) =>
															updateDraft(field.id, {
																tolerance: event.target.value,
															})
														}
													/>
												</td>
												<td>
													<input
														type='text'
														className='form-control form-control-sm'
														value={draft.notes}
														onChange={(event) =>
															updateDraft(field.id, {
																notes: event.target.value,
															})
														}
													/>
												</td>
												<td>
													<Button
														color='danger'
														isLight
														icon='Delete'
														aria-label='Remove measurement field'
														onClick={() => handleRemove(field)}
													/>
												</td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</div>
				)}
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon='Save'
					isDisable={isSaving || isLoading}
					onClick={handleSave}>
					{isSaving ? 'Saving...' : 'Save Template'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default MeasurementTypeFieldsModal;

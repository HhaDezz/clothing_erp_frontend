import React, { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Option from '../../../components/bootstrap/Option';
import { CrudFormErrors, CrudFormField, CrudFormValues, CrudMode } from './types';
import { CRUD_STORAGE_EVENT, resolveCrudOptions } from './helpers';

interface EntityCrudFormModalProps {
	entityLabel: string;
	mode: CrudMode;
	item: Record<string, unknown> | null;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	fields: CrudFormField<any>[];
	onSubmit: (values: CrudFormValues) => void | Promise<void>;
	onEdit?: () => void;
	validate?: (values: CrudFormValues) => CrudFormErrors;
}

const toTitleCase = (value: string) =>
	value
		.split(/(?=[A-Z])|\s+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const toValueList = (value: string | string[]) =>
	Array.isArray(value) ? value : value ? [value] : [];

const EntityCrudFormModal = ({
	entityLabel,
	mode,
	item,
	isOpen,
	setIsOpen,
	fields,
	onSubmit,
	onEdit,
	validate,
}: EntityCrudFormModalProps) => {
	const isViewing = mode === 'view';
	const isEditing = mode === 'edit';
	const modalTitle = `${isViewing ? 'View' : isEditing ? 'Edit' : 'Add'} ${toTitleCase(entityLabel)}`;
	const [optionsVersion, setOptionsVersion] = useState(0);

	useEffect(() => {
		if (!isOpen) return undefined;

		const refreshOptions = () => setOptionsVersion((current) => current + 1);

		window.addEventListener(CRUD_STORAGE_EVENT, refreshOptions);
		window.addEventListener('storage', refreshOptions);

		return () => {
			window.removeEventListener(CRUD_STORAGE_EVENT, refreshOptions);
			window.removeEventListener('storage', refreshOptions);
		};
	}, [isOpen]);

	const initialValues = useMemo(
		() =>
			fields.reduce<CrudFormValues>((acc, field) => {
				const value = item
					? field.getValue
						? field.getValue(item)
						: String(item[field.name as string] ?? '')
					: field.getDefaultValue
						? field.getDefaultValue()
						: '';
				acc[field.name as string] = value;
				return acc;
			}, {}),
		[fields, item],
	);

	const formik = useFormik<CrudFormValues>({
		enableReinitialize: true,
		initialValues,
		validate: (values) => {
			if (isViewing) return {};

			const errors: CrudFormErrors = {};
			fields.forEach((field) => {
				const fieldValue = values[field.name as string];
				const isEmptyValue = Array.isArray(fieldValue)
					? fieldValue.length === 0
					: !String(fieldValue ?? '').trim();

				if (field.required && isEmptyValue) {
					errors[field.name as string] = `${field.label} is required`;
				}
			});

			if (validate) {
				return {
					...errors,
					...validate(values),
				};
			}

			return errors;
		},
		onSubmit: async (values, { setSubmitting }) => {
			if (isViewing) return;
			try {
				await onSubmit(values);
				setIsOpen(false);
			} catch (error) {
				const submitError = error as {
					fieldErrors?: Record<string, string>;
				};

				if (submitError.fieldErrors) {
					Object.entries(submitError.fieldErrors).forEach(([field, message]) => {
						formik.setFieldError(field, message);
					});
				}
			} finally {
				setSubmitting(false);
			}
		},
	});

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId={`${entityLabel}-form-modal`}>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id={`${entityLabel}-form-modal`}>{modalTitle}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						{fields.map((field) => {
							const name = field.name as string;
							const value = formik.values[name] ?? (field.multiple ? [] : '');
							const currentValues = toValueList(value);
							const options = [...resolveCrudOptions(field.options)];

							currentValues.forEach((currentValue) => {
								if (
									currentValue &&
									!options.some((option) => option.value === currentValue)
								) {
									options.push({
										value: currentValue,
										label: currentValue,
									});
								}
							});

							const commonProps = {
								name,
								onChange: formik.handleChange,
								onBlur: formik.handleBlur,
								value,
								isValid: formik.isValid,
								isTouched: !!formik.touched[name],
								invalidFeedback: formik.errors[name],
								disabled: isViewing || field.disabled,
							};

							return (
								<FormGroup
									key={name}
									id={name}
									label={field.label}
									className={field.colClassName || 'col-md-6'}
									data-options-version={optionsVersion}>
									{field.type === 'textarea' ? (
										<Textarea
											{...commonProps}
											rows={4}
											placeholder={
												field.placeholder ||
												`Enter ${field.label.toLowerCase()}`
											}
										/>
									) : field.type === 'select' ? (
										<Select
											{...commonProps}
											ariaLabel={field.label}
											searchable={field.searchable}
											multiple={field.multiple}
											placeholder={
												field.multiple
													? undefined
													: `Select ${field.label.toLowerCase()}`
											}
											list={options}
											onBlur={() => formik.setFieldTouched(name, true)}
											onChange={(
												event: React.ChangeEvent<
													HTMLInputElement | HTMLSelectElement
												>,
											) => {
												if (
													field.multiple &&
													event.currentTarget instanceof HTMLSelectElement
												) {
													formik.setFieldValue(
														name,
														Array.from(
															event.currentTarget.selectedOptions,
															(option) => option.value,
														),
													);
													return;
												}

												formik.handleChange(event);
											}}>
											{options.map((option) => (
												<Option key={option.value} value={option.value}>
													{option.label}
												</Option>
											))}
										</Select>
									) : (
										<Input
											{...commonProps}
											placeholder={
												field.placeholder ||
												`Enter ${field.label.toLowerCase()}`
											}
										/>
									)}
								</FormGroup>
							);
						})}
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					{isViewing ? 'Close' : 'Cancel'}
				</Button>
				{isViewing && onEdit && (
					<Button
						color='primary'
						icon='Edit'
						onClick={() => {
							setIsOpen(false);
							onEdit();
						}}>
						Edit {toTitleCase(entityLabel)}
					</Button>
				)}
				{!isViewing && (
					<Button
						color='primary'
						icon={isEditing ? 'Save' : 'AddBusiness'}
						onClick={() => formik.handleSubmit()}>
						{isEditing ? 'Update' : 'Add'}
					</Button>
				)}
			</ModalFooter>
		</Modal>
	);
};

export default EntityCrudFormModal;

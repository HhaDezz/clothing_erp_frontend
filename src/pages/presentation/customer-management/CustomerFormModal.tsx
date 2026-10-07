import React, { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import showNotification from '../../../components/extras/showNotification';
import { createCustomerApi, updateCustomerApi, Customer } from '../../../api/customers.api';

type TModalMode = 'add' | 'edit';

interface ICustomerFormModalProps {
	mode: TModalMode;
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	customers: Customer[];
}

type TFormValues = {
	customer_code: string;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	address: string;
	city: string;
	date_of_birth: string;
	gender: string;
	notes: string;
	status: 'ACTIVE' | 'INACTIVE';
	preferred_sizes: string;
	preferred_categories: string;
	preference_notes: string;
	sms_opt_in: boolean;
	email_opt_in: boolean;
};

const getCustomerCode = (customer?: Customer | null) =>
	customer?.customer_code ?? customer?.customerCode ?? '';

const getCustomerFirstName = (customer?: Customer | null) =>
	customer?.first_name ?? customer?.firstName ?? '';

const getCustomerLastName = (customer?: Customer | null) =>
	customer?.last_name ?? customer?.lastName ?? '';

const getCustomerDateOfBirth = (customer?: Customer | null) =>
	(customer?.date_of_birth ?? customer?.dateOfBirth ?? '').slice(0, 10);

const CustomerFormModal: FC<ICustomerFormModalProps> = ({
	mode,
	id,
	isOpen,
	setIsOpen,
	customers,
}) => {
	const queryClient = useQueryClient();
	const isEditing = mode === 'edit';
	const customer = isEditing
		? customers.find((item) => item.id.toString() === id?.toString()) || null
		: null;

	const formik = useFormik<TFormValues>({
		enableReinitialize: true,
		initialValues: {
			customer_code: getCustomerCode(customer),
			first_name: getCustomerFirstName(customer),
			last_name: getCustomerLastName(customer),
			email: customer?.email || '',
			phone: customer?.phone || '',
			address: customer?.address || '',
			city: customer?.city || '',
			date_of_birth: getCustomerDateOfBirth(customer),
			gender: customer?.gender || '',
			notes: customer?.notes || '',
			status: customer?.status || 'ACTIVE',
			preferred_sizes: customer?.preferredSizes || '',
			preferred_categories: customer?.preferredCategories || '',
			preference_notes: customer?.preferenceNotes || '',
			sms_opt_in: customer?.smsOptIn ?? false,
			email_opt_in: customer?.emailOptIn ?? false,
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TFormValues, string>> = {};

			if (!values.customer_code.trim()) errors.customer_code = 'Customer code is required';
			if (!values.first_name.trim()) errors.first_name = 'First name is required';
			if (!values.last_name.trim()) errors.last_name = 'Last name is required';
			if (!values.phone.trim()) errors.phone = 'Phone is required';
			if (values.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
				errors.email = 'Invalid email address';
			}

			return errors;
		},
		onSubmit: async (values, { resetForm, setSubmitting }) => {
			try {
				const payload = {
					customer_code: values.customer_code.trim(),
					customerCode: values.customer_code.trim(),
					first_name: values.first_name.trim(),
					firstName: values.first_name.trim(),
					last_name: values.last_name.trim(),
					lastName: values.last_name.trim(),
					email: values.email.trim() || undefined,
					phone: values.phone.trim(),
					address: values.address.trim() || undefined,
					city: values.city.trim() || undefined,
					date_of_birth: values.date_of_birth || undefined,
					dateOfBirth: values.date_of_birth || undefined,
					gender: values.gender || undefined,
					notes: values.notes.trim() || undefined,
					status: values.status,
					preferredSizes: values.preferred_sizes.trim() || undefined,
					preferredCategories: values.preferred_categories.trim() || undefined,
					preferenceNotes: values.preference_notes.trim() || undefined,
					// Sent explicitly rather than with `|| undefined`: an
					// unticked box means "not opted in", and omitting it would
					// leave the backend guessing.
					smsOptIn: values.sms_opt_in,
					emailOptIn: values.email_opt_in,
				};

				if (isEditing && id) {
					await updateCustomerApi(id, payload);
				} else {
					await createCustomerApi(payload);
				}

				showNotification(
					<span className='d-flex align-items-center'>
						<Icon
							icon={isEditing ? 'Edit' : 'ContactPage'}
							size='lg'
							className='me-1'
						/>
						<span>Customer {isEditing ? 'Updated' : 'Created'}</span>
					</span>,
					`${values.first_name.trim()} ${values.last_name.trim()} has been ${
						isEditing ? 'updated' : 'created'
					} successfully.`,
					'success',
				);

				resetForm();
				await queryClient.invalidateQueries({ queryKey: ['customers'] });
				setIsOpen(false);
			} catch (error: any) {
				showNotification(
					'Request failed',
					error?.response?.data?.message || 'Failed to save customer.',
					'danger',
				);
			} finally {
				setSubmitting(false);
			}
		},
	});

	if (isEditing && !customer && isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			size='lg'
			titleId='customer-form-modal'
			isCentered
			isScrollable>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='customer-form-modal'>
					{isEditing
						? `Edit Customer - ${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`
						: 'Create Customer'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-4'>
						<div className='col-12 mb-0'>
							<h6 className='fw-bold border-bottom pb-2'>Basic Information</h6>
						</div>
						<FormGroup id='customer_code' label='Customer Code' className='col-md-4'>
							<Input
								name='customer_code'
								placeholder='e.g. CUS-0001'
								value={formik.values.customer_code}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.customer_code}
								invalidFeedback={formik.errors.customer_code}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='first_name' label='First Name' className='col-md-4'>
							<Input
								name='first_name'
								placeholder='First name'
								value={formik.values.first_name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.first_name}
								invalidFeedback={formik.errors.first_name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='last_name' label='Last Name' className='col-md-4'>
							<Input
								name='last_name'
								placeholder='Last name'
								value={formik.values.last_name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.last_name}
								invalidFeedback={formik.errors.last_name}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='email' label='Email' className='col-md-6'>
							<Input
								name='email'
								type='email'
								placeholder='e.g. john@example.com'
								value={formik.values.email}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.email}
								invalidFeedback={formik.errors.email}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='phone' label='Phone' className='col-md-6'>
							<Input
								name='phone'
								placeholder='Phone number'
								value={formik.values.phone}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.phone}
								invalidFeedback={formik.errors.phone}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<div className='col-12 mt-4 mb-0'>
							<h6 className='fw-bold border-bottom pb-2'>Address Information</h6>
						</div>
						<FormGroup id='address' label='Street Address' className='col-12'>
							<Input
								name='address'
								placeholder='Street address'
								value={formik.values.address}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='city' label='City' className='col-md-6'>
							<Input
								name='city'
								placeholder='City'
								value={formik.values.city}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						<div className='col-12 mt-4 mb-0'>
							<h6 className='fw-bold border-bottom pb-2'>Additional Information</h6>
						</div>
						<FormGroup id='date_of_birth' label='Date of Birth' className='col-md-4'>
							<Input
								name='date_of_birth'
								type='date'
								value={formik.values.date_of_birth}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup id='gender' label='Gender' className='col-md-4'>
							<select
								id='gender'
								name='gender'
								className='form-select'
								value={formik.values.gender}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value=''>Select gender...</option>
								<option value='MALE'>Male</option>
								<option value='FEMALE'>Female</option>
								<option value='OTHER'>Other</option>
							</select>
						</FormGroup>
						<FormGroup id='status' label='Status' className='col-md-4'>
							<select
								id='status'
								name='status'
								className='form-select'
								value={formik.values.status}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}>
								<option value='ACTIVE'>Active</option>
								<option value='INACTIVE'>Inactive</option>
							</select>
						</FormGroup>
						<FormGroup id='notes' label='Notes' className='col-12'>
							<Textarea
								name='notes'
								rows={2}
								placeholder='Optional notes or special instructions'
								value={formik.values.notes}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>

						{/* Shopping preferences and marketing consent (V78).
						    Free text on purpose — these are a salesperson's
						    notes on what the customer likes, not structured
						    data anything computes with. */}
						<div className='col-12 mt-4 mb-0'>
							<h6 className='fw-bold border-bottom pb-2'>
								Shopping Preferences &amp; Consent
							</h6>
						</div>
						<FormGroup
							id='preferred_sizes'
							label='Preferred Sizes'
							className='col-md-6'>
							<Input
								name='preferred_sizes'
								placeholder='e.g. M, 32 waist, UK 10'
								value={formik.values.preferred_sizes}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup
							id='preferred_categories'
							label='Preferred Categories'
							className='col-md-6'>
							<Input
								name='preferred_categories'
								placeholder='e.g. Formal shirts, Linen trousers'
								value={formik.values.preferred_categories}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<FormGroup
							id='preference_notes'
							label='Preference Notes'
							className='col-12'>
							<Textarea
								name='preference_notes'
								rows={2}
								placeholder='e.g. Prefers darker colours, always wants sleeves shortened'
								value={formik.values.preference_notes}
								onChange={formik.handleChange}
								disabled={formik.isSubmitting}
							/>
						</FormGroup>
						<div className='col-12'>
							<label className='form-label fw-semibold'>Marketing Consent</label>
							<div className='d-flex flex-wrap gap-4'>
								<div className='form-check'>
									<input
										id='sms_opt_in'
										name='sms_opt_in'
										type='checkbox'
										className='form-check-input'
										checked={formik.values.sms_opt_in}
										onChange={formik.handleChange}
										disabled={formik.isSubmitting}
									/>
									<label className='form-check-label' htmlFor='sms_opt_in'>
										Happy to receive SMS offers
									</label>
								</div>
								<div className='form-check'>
									<input
										id='email_opt_in'
										name='email_opt_in'
										type='checkbox'
										className='form-check-input'
										checked={formik.values.email_opt_in}
										onChange={formik.handleChange}
										disabled={formik.isSubmitting}
									/>
									<label className='form-check-label' htmlFor='email_opt_in'>
										Happy to receive email offers
									</label>
								</div>
							</div>
							<div className='text-muted small mt-1'>
								Campaigns only ever go to customers who opted in on that channel.
							</div>
						</div>
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button
					color='primary'
					icon={isEditing ? 'Save' : 'ContactPage'}
					isDisable={formik.isSubmitting}
					onClick={() => formik.handleSubmit()}>
					{isEditing ? 'Update Customer' : 'Create Customer'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default CustomerFormModal;

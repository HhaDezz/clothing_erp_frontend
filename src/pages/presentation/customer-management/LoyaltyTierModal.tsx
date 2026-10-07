import React, { FC } from 'react';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Button from '../../../components/bootstrap/Button';
import { LoyaltyTier, LoyaltyTierPayload } from '../../../api/loyalty.api';

interface Props {
	tier: LoyaltyTier | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	onSubmit: (payload: LoyaltyTierPayload) => void;
	isSaving: boolean;
}

type TierFormValues = {
	name: string;
	minSpend12m: number | '';
	earnMultiplier: number | '';
	birthdayBonusPoints: number | '';
	sortOrder: number | '';
	color: string;
};

const num = (v: number | '') => (v === '' ? 0 : Number(v));

/**
 * Add or edit one loyalty tier. Tiers are matched on rolling 12-month spend
 * and the highest a customer qualifies for wins, so these are thresholds
 * rather than ranges — there are no gaps to keep in step.
 */
const LoyaltyTierModal: FC<Props> = ({ tier, isOpen, setIsOpen, onSubmit, isSaving }) => {
	const isEditing = tier !== null;

	const formik = useFormik<TierFormValues>({
		enableReinitialize: true,
		initialValues: {
			name: tier?.name ?? '',
			minSpend12m: tier?.minSpend12m ?? 0,
			earnMultiplier: tier?.earnMultiplier ?? 1,
			birthdayBonusPoints: tier?.birthdayBonusPoints ?? 0,
			sortOrder: tier?.sortOrder ?? 0,
			color: tier?.color ?? '',
		},
		validate: (values) => {
			const errors: Partial<Record<keyof TierFormValues, string>> = {};
			if (!values.name.trim()) errors.name = 'Name is required';
			if (num(values.earnMultiplier) <= 0) {
				errors.earnMultiplier = 'Multiplier must be greater than zero';
			}
			if (num(values.minSpend12m) < 0) errors.minSpend12m = 'Cannot be negative';
			if (num(values.birthdayBonusPoints) < 0) errors.birthdayBonusPoints = 'Cannot be negative';
			return errors;
		},
		onSubmit: (values) => {
			onSubmit({
				name: values.name.trim(),
				minSpend12m: num(values.minSpend12m),
				earnMultiplier: num(values.earnMultiplier),
				birthdayBonusPoints: num(values.birthdayBonusPoints),
				sortOrder: num(values.sortOrder),
				color: values.color.trim() || null,
			});
		},
	});

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' titleId='loyalty-tier-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='loyalty-tier-modal'>
					{isEditing ? `Edit Tier — ${tier?.name}` : 'New Tier'}
				</ModalTitle>
			</ModalHeader>
			<form onSubmit={formik.handleSubmit}>
				<ModalBody>
					<div className='row g-4'>
						<FormGroup id='name' label='Tier Name' className='col-md-6'>
							<Input
								name='name'
								placeholder='e.g. Gold'
								value={formik.values.name}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.name}
								invalidFeedback={formik.errors.name}
							/>
						</FormGroup>
						<FormGroup
							id='minSpend12m'
							label='Minimum Spend (rolling 12 months)'
							className='col-md-6'>
							<Input
								name='minSpend12m'
								type='number'
								min={0}
								step={0.01}
								value={formik.values.minSpend12m}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.minSpend12m}
								invalidFeedback={formik.errors.minSpend12m}
							/>
						</FormGroup>
						<FormGroup id='earnMultiplier' label='Earn Multiplier' className='col-md-4'>
							<Input
								name='earnMultiplier'
								type='number'
								min={0.01}
								step={0.01}
								value={formik.values.earnMultiplier}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.earnMultiplier}
								invalidFeedback={formik.errors.earnMultiplier}
							/>
							<div className='text-muted small mt-1'>
								1.00 is the base rate. 1.50 earns half again as many points.
							</div>
						</FormGroup>
						<FormGroup
							id='birthdayBonusPoints'
							label='Birthday Bonus Points'
							className='col-md-4'>
							<Input
								name='birthdayBonusPoints'
								type='number'
								min={0}
								value={formik.values.birthdayBonusPoints}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								isValid={formik.isValid}
								isTouched={formik.touched.birthdayBonusPoints}
								invalidFeedback={formik.errors.birthdayBonusPoints}
							/>
						</FormGroup>
						<FormGroup id='sortOrder' label='Display Order' className='col-md-4'>
							<Input
								name='sortOrder'
								type='number'
								value={formik.values.sortOrder}
								onChange={formik.handleChange}
							/>
							<div className='text-muted small mt-1'>
								Display only — spend decides which tier a customer is in.
							</div>
						</FormGroup>
						<FormGroup id='color' label='Badge Colour' className='col-md-6'>
							<Input
								name='color'
								placeholder='e.g. warning, success, #C0C0C0'
								value={formik.values.color}
								onChange={formik.handleChange}
							/>
						</FormGroup>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button color='light' onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' color='primary' isDisable={isSaving}>
						{isSaving ? 'Saving...' : isEditing ? 'Save Tier' : 'Create Tier'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default LoyaltyTierModal;

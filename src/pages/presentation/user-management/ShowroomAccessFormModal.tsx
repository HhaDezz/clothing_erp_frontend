import React, { FC } from 'react';
import { useFormik } from 'formik';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Checks from '../../../components/bootstrap/forms/Checks';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import { UserShowroomAccess } from '../../../api/showroomAccess.api';

type AssignableShowroom = { id: number; name: string };

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	access: UserShowroomAccess | null;
	showrooms: AssignableShowroom[];
	isLoading: boolean;
	onSubmit: (showroomIds: number[]) => void;
}

type FormValues = {
	showroomIds: number[];
};

/**
 * "Need separate showroom allocation (users)... like warehouse access" —
 * its own dedicated master-data page, separate from Warehouse Access. A
 * user with no showroom checked here is NOT showroom-restricted and keeps
 * seeing every showroom's requests (super admin always sees everything
 * regardless); checking at least one switches them into "only relevant
 * showroom" visibility and lets them switch to it on the goods-transfer
 * pages' location tabs.
 */
const ShowroomAccessFormModal: FC<Props> = ({ isOpen, setIsOpen, access, showrooms, isLoading, onSubmit }) => {
	const formik = useFormik<FormValues>({
		enableReinitialize: true,
		initialValues: {
			showroomIds: access?.showroomIds ?? [],
		},
		onSubmit: (values) => {
			onSubmit(values.showroomIds);
		},
	});

	if (!access) return null;

	const toggleShowroom = (showroomId: number) => {
		const current = formik.values.showroomIds;
		formik.setFieldValue(
			'showroomIds',
			current.includes(showroomId) ? current.filter((id) => id !== showroomId) : [...current, showroomId],
		);
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='showroom-access-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='showroom-access-form-modal'>Assign Showrooms — {access.userName}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<Alert color='info' isLight className='mb-3'>
					{formik.values.showroomIds.length === 0
						? 'No showroom assigned — this user sees every showroom request, unfiltered.'
						: 'This user will only see requests for, and can only switch to, the showroom(s) checked below.'}
				</Alert>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-3'>
						{showrooms.map((s) => (
							<div className='col-12' key={s.id}>
								<Checks
									type='checkbox'
									id={`showroom-${s.id}`}
									label={s.name}
									checked={formik.values.showroomIds.includes(s.id)}
									onChange={() => toggleShowroom(s.id)}
									disabled={formik.isSubmitting || isLoading}
								/>
							</div>
						))}
						{showrooms.length === 0 && (
							<div className='col-12 text-muted small'>No showrooms configured yet.</div>
						)}
					</div>
				</form>
			</ModalBody>
			<ModalFooter className='px-4 pb-4 d-flex gap-2'>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='primary' icon='Save' isDisable={isLoading} onClick={() => formik.handleSubmit()}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ShowroomAccessFormModal;

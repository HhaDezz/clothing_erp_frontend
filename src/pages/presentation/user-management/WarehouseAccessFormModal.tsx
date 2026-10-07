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
import { UserWarehouseAccess } from '../../../api/warehouseAccess.api';

// A lighter shape than the full Warehouse type — the caller (WarehouseAccessPage)
// passes a combined list of warehouses AND showrooms here, since both are
// assigned to a user through the exact same user_has_warehouses relationship.
type AssignableLocation = { id: number; name: string };

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	access: UserWarehouseAccess | null;
	warehouses: AssignableLocation[];
	isLoading: boolean;
	onSubmit: (warehouseIds: number[]) => void;
}

type FormValues = {
	warehouseIds: number[];
};

/**
 * "New master data for assign Warehouses for users (that warehouse enable
 * users)" — a separate dedicated master-data page from UserFormModal /
 * Departments. A user with no warehouses checked here is NOT
 * warehouse-restricted and keeps seeing every import shipment; checking at
 * least one switches them into "only relevant warehouse" visibility mode.
 */
const WarehouseAccessFormModal: FC<Props> = ({ isOpen, setIsOpen, access, warehouses, isLoading, onSubmit }) => {
	const formik = useFormik<FormValues>({
		enableReinitialize: true,
		initialValues: {
			warehouseIds: access?.warehouseIds ?? [],
		},
		onSubmit: (values) => {
			onSubmit(values.warehouseIds);
		},
	});

	if (!access) return null;

	const toggleWarehouse = (warehouseId: number) => {
		const current = formik.values.warehouseIds;
		formik.setFieldValue(
			'warehouseIds',
			current.includes(warehouseId) ? current.filter((id) => id !== warehouseId) : [...current, warehouseId],
		);
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' titleId='warehouse-access-form-modal'>
			<ModalHeader setIsOpen={setIsOpen} className='p-4'>
				<ModalTitle id='warehouse-access-form-modal'>Assign Warehouses — {access.userName}</ModalTitle>
			</ModalHeader>
			<ModalBody className='px-4'>
				<Alert color='info' isLight className='mb-3'>
					{formik.values.warehouseIds.length === 0
						? 'No warehouse assigned — this user sees every incoming import shipment, unfiltered.'
						: 'This user will only see import shipments allocated to the warehouse(s) checked below.'}
				</Alert>
				<form onSubmit={formik.handleSubmit}>
					<div className='row g-3'>
						{warehouses.map((w) => (
							<div className='col-12' key={w.id}>
								<Checks
									type='checkbox'
									id={`warehouse-${w.id}`}
									label={w.name}
									checked={formik.values.warehouseIds.includes(w.id)}
									onChange={() => toggleWarehouse(w.id)}
									disabled={formik.isSubmitting || isLoading}
								/>
							</div>
						))}
						{warehouses.length === 0 && (
							<div className='col-12 text-muted small'>No warehouses configured yet.</div>
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

export default WarehouseAccessFormModal;

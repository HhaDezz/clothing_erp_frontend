import React, { FC } from 'react';
import UserFormModal from './UserFormModal';
import { User } from '../../../api/users.api';

interface IUserEditModalProps {
	id: string | null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	users: User[];
}

const UserEditModal: FC<IUserEditModalProps> = ({ id, isOpen, setIsOpen, users }) => {
	return (
		<UserFormModal
			mode={id === null ? 'add' : 'edit'}
			id={id}
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			users={users}
		/>
	);
};

export default UserEditModal;

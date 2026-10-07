import { useMutation } from '@tanstack/react-query';
import { loginApi } from '../api/auth.api';

export const useLogin = () => {
	return useMutation({
		mutationFn: loginApi,
		onSuccess: (response) => {
			localStorage.setItem('token', response.data.token);
			localStorage.setItem('user', JSON.stringify(response.data));
		},
	});
};

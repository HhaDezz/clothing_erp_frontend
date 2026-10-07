import axios from 'axios';

type ApiErrorPayload = {
	message?: string;
	data?: Record<string, string | string[]>;
	errors?: Record<string, string | string[]>;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
	if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback;
	if (!error.response) return 'Unable to reach the API server.';

	const validation = error.response.data?.data || error.response.data?.errors;
	if (validation) {
		const details = Object.values(validation)
			.flatMap((value) => (Array.isArray(value) ? value : [value]))
			.join(' ');
		if (details) return details;
	}

	return error.response.data?.message || fallback;
};

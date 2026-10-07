import { useQuery } from '@tanstack/react-query';
import { getBodyMeasurementsApi } from '../api/measurements.api';

export const useBodyMeasurements = () =>
	useQuery({
		queryKey: ['body-measurements'],
		queryFn: getBodyMeasurementsApi,
	});

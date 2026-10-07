import { useQuery } from '@tanstack/react-query';
import { getMeasurementTypesApi } from '../api/measurements.api';

export const useMeasurementTypes = () =>
	useQuery({
		queryKey: ['measurement-types'],
		queryFn: getMeasurementTypesApi,
	});

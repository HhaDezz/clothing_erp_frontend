import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '../bootstrap/forms/Select';
import api from '../../lib/axios';

const getItemBatches = async (itemId: string | number) => {
	const res = await api.get(`/items/${itemId}/batches`);
	return res.data.data;
};

interface ItemBatchSelectProps {
	itemId: string | number;
	name: string;
	value: string | number;
	onChange: (e: any) => void;
	allowNew?: boolean;
	onBatchSelect?: (batch: any) => void;
}

const ItemBatchSelect = ({ itemId, name, value, onChange, allowNew = false, onBatchSelect }: ItemBatchSelectProps) => {
	const { data: batches = [] } = useQuery({
		queryKey: ['item-batches', itemId],
		queryFn: () => getItemBatches(itemId),
		enabled: !!itemId,
	});

	const handleChange = (e: any) => {
		onChange(e);
		if (onBatchSelect) {
			const selectedId = e.target.value;
			const batch = batches.find((b: any) => String(b.id) === String(selectedId));
			onBatchSelect(batch || null);
		}
	};

	return (
		<Select name={name} value={value} onChange={handleChange} ariaLabel='Batch'>
			<option value=''>{allowNew ? 'New batch' : 'Any Batch'}</option>
			{batches.map((b: any) => (
				<option key={b.id} value={b.id}>{b.batch_number}</option>
			))}
		</Select>
	);
};

export default ItemBatchSelect;

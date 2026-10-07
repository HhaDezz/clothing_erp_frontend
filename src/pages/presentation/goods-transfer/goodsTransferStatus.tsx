import React from 'react';
import Badge from '../../../components/bootstrap/Badge';
import { GoodsTransferStatus } from '../../../api/goodsTransfer.api';

// Shared status → label/color mapping for the Goods-to-Showroom workflow,
// used across the Review, Warehouse queue and Showroom Requests pages so
// the same state always renders the same way.
export const STATUS_META: Record<GoodsTransferStatus, { label: string; color: string }> = {
	REQUESTED: { label: 'Awaiting Approval', color: 'warning' },
	APPROVED: { label: 'Approved — Awaiting Barcodes', color: 'info' },
	REJECTED: { label: 'Rejected', color: 'danger' },
	PARTIALLY_BARCODED: { label: 'Partially Barcoded', color: 'info' },
	BARCODED: { label: 'Barcoded — Ready to Issue', color: 'primary' },
	PARTIALLY_ISSUED: { label: 'Partially Issued', color: 'warning' },
	ISSUED: { label: 'Issued — Awaiting Receipt', color: 'success' },
	RECEIVED: { label: 'Received', color: 'success' },
};

export const GoodsTransferStatusBadge: React.FC<{ status: GoodsTransferStatus }> = ({ status }) => {
	const meta = STATUS_META[status] ?? { label: status, color: 'secondary' };
	return (
		<Badge color={meta.color as any} isLight={status !== 'ISSUED' && status !== 'RECEIVED'}>
			{meta.label}
		</Badge>
	);
};

export default GoodsTransferStatusBadge;

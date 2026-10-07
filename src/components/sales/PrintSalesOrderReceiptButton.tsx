import React, { useState } from 'react';
import Button from '../bootstrap/Button';
import Spinner from '../bootstrap/Spinner';
import showNotification from '../extras/showNotification';
import { printSalesOrderReceipt } from '../../helpers/generateSalesOrderReceipt';
import { SalesOrder } from '../../api/salesOrders.api';

interface Props {
	order: SalesOrder;
	size?: 'sm' | undefined;
	color?: string;
	isLight?: boolean;
}

/**
 * "Print Receipt" for an existing Sales Order — same busy-state/Spinner
 * pattern as PrintGrnPdfButton.tsx. Lives in the Sales Orders "View Details"
 * modal footer; the list page's row action calls the same
 * printSalesOrderReceipt() helper directly instead of this component, since
 * DataTableActionMenu's actions are plain onClick handlers with no built-in
 * busy/spinner state.
 */
const PrintSalesOrderReceiptButton: React.FC<Props> = ({ order, size = 'sm', color = 'primary', isLight = true }) => {
	const [busy, setBusy] = useState(false);

	const handlePrint = async () => {
		setBusy(true);
		try {
			await printSalesOrderReceipt(order);
		} catch {
			showNotification('Error', 'Could not generate the receipt PDF.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button size={size} color={color as any} isLight={isLight} icon='Print' isDisable={busy} onClick={handlePrint}>
			{busy ? <Spinner isSmall inButton isGrow /> : 'Print Receipt'}
		</Button>
	);
};

export default PrintSalesOrderReceiptButton;

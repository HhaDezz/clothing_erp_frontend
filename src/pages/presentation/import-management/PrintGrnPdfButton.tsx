import React, { useState } from 'react';
import Button from '../../../components/bootstrap/Button';
import Spinner from '../../../components/bootstrap/Spinner';
import showNotification from '../../../components/extras/showNotification';
import { generateGrnPdf } from '../../../helpers/generateGrnPdf';
import { ImportShipmentResponse, ImportShipmentWarehouseLegResponse } from '../../../api/importShipments.api';

interface Props {
	shipment: ImportShipmentResponse;
	leg: ImportShipmentWarehouseLegResponse;
	size?: 'sm' | undefined;
}

/**
 * Generates and downloads the PDF for one warehouse leg's Goods Received
 * Note, entirely client-side (see helpers/generateGrnPdf.ts) — same pattern
 * as the POS invoice's "Print Invoice" button. This is what now sits where
 * the drawer used to show "PDF not yet available for this GRN": that
 * message tracked the backend's `grnPdfAvailable` flag, which only ever
 * covered the legacy whole-shipment PDF endpoint (see
 * ImportGrnResponse.pdfAvailable / ViewGrnPdfButton.tsx) and 404s for every
 * shipment received through the current per-warehouse-leg flow. This button
 * doesn't depend on that flag at all — it builds the PDF from the leg data
 * the drawer already has in hand.
 */
const PrintGrnPdfButton: React.FC<Props> = ({ shipment, leg, size = 'sm' }) => {
	const [busy, setBusy] = useState(false);

	const handlePrint = async () => {
		setBusy(true);
		try {
			await generateGrnPdf({ shipment, leg });
		} catch {
			showNotification('Error', 'Could not generate the GRN PDF.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button size={size} color='primary' isLight icon='PictureAsPdf' isDisable={busy} onClick={handlePrint}>
			{busy ? <Spinner isSmall inButton isGrow /> : 'Print / Download GRN'}
		</Button>
	);
};

export default PrintGrnPdfButton;

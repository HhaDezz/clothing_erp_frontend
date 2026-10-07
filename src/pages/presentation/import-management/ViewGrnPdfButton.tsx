import React, { useEffect, useRef, useState } from 'react';
import Button from '../../../components/bootstrap/Button';
import Spinner from '../../../components/bootstrap/Spinner';
import showNotification from '../../../components/extras/showNotification';
import { getImportGrnPdfApi, ImportShipmentResponse } from '../../../api/importShipments.api';

interface Props {
	shipment: ImportShipmentResponse;
	size?: 'sm' | undefined;
	label?: string;
}

/**
 * Opens (and lets the user print/download) the generated GRN PDF for a
 * shipment. Same blob-through-axios pattern as the packing-list document
 * viewer — the PDF isn't reachable as a plain URL, so it's fetched with the
 * authenticated client and opened from an object URL.
 */
const ViewGrnPdfButton: React.FC<Props> = ({ shipment, size = 'sm', label = 'View / Print GRN' }) => {
	const [busy, setBusy] = useState(false);
	const cacheRef = useRef<{ url: string } | null>(null);

	useEffect(
		() => () => {
			if (cacheRef.current) URL.revokeObjectURL(cacheRef.current.url);
		},
		[],
	);

	const handleView = async () => {
		setBusy(true);
		try {
			if (!cacheRef.current) {
				const { blob } = await getImportGrnPdfApi(shipment.id);
				cacheRef.current = { url: URL.createObjectURL(blob) };
			}
			window.open(cacheRef.current.url, '_blank', 'noopener,noreferrer');
		} catch {
			showNotification('Error', 'Could not open the GRN PDF.', 'danger');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button size={size} color='primary' isLight icon='PictureAsPdf' isDisable={busy} onClick={handleView}>
			{busy ? <Spinner isSmall inButton isGrow /> : label}
		</Button>
	);
};

export default ViewGrnPdfButton;

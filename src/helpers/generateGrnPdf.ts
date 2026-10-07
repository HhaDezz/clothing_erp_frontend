import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY_NAME, tryLoadLogoDataUrl } from './companyLogo';
import { ImportShipmentResponse, ImportShipmentWarehouseLegResponse } from '../api/importShipments.api';

export type GrnPdfInput = {
	shipment: ImportShipmentResponse;
	leg: ImportShipmentWarehouseLegResponse;
};

/**
 * Client-side "print/download PDF" for one warehouse leg's Goods Received
 * Note — same jsPDF + jspdf-autotable + company-logo pattern as the POS
 * invoice (generateInvoicePdf.ts), built entirely from data the frontend
 * already has (ImportShipmentDetailDrawer's "Warehouse Legs" section), no
 * backend change needed. This is the per-warehouse-leg GRN — the one every
 * shipment actually uses today — not the legacy whole-shipment
 * ImportGrnResponse/ViewGrnPdfButton flow, which only ever covers shipments
 * received before per-warehouse GRNs shipped.
 */
export const generateGrnPdf = async ({ shipment, leg }: GrnPdfInput) => {
	const doc = new jsPDF({ unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const marginX = 14;
	let cursorY = 18;

	const logo = await tryLoadLogoDataUrl();
	if (logo) {
		// Fit within a 40mm-wide box, preserving aspect ratio.
		const maxWidthMm = 40;
		const ratio = logo.height / logo.width;
		const width = maxWidthMm;
		const height = width * ratio;
		doc.addImage(logo.dataUrl, marginX, cursorY - 4, width, Math.min(height, 20));
	} else {
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.text(COMPANY_NAME, marginX, cursorY + 4);
	}

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.setTextColor(30, 30, 30);
	doc.text('GOODS RECEIVED NOTE', pageWidth - marginX, cursorY, { align: 'right' });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 90);
	doc.text(`GRN No: ${leg.grnNo ?? '—'}`, pageWidth - marginX, cursorY + 6, { align: 'right' });
	const generatedAt = leg.grnGeneratedAt ? new Date(leg.grnGeneratedAt) : new Date();
	doc.text(
		`Date: ${generatedAt.toLocaleDateString('en-LK')} ${generatedAt.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}`,
		pageWidth - marginX,
		cursorY + 11,
		{ align: 'right' },
	);

	cursorY += 26;
	doc.setDrawColor(220, 220, 220);
	doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
	cursorY += 8;

	doc.setFontSize(10);
	doc.setTextColor(60, 60, 60);
	const metaLines: string[] = [`Shipment No: ${shipment.shipmentNo}`];
	if (shipment.gfReference) metaLines.push(`GF Reference: ${shipment.gfReference}`);
	if (shipment.sourceInquiryNo) metaLines.push(`Source Inquiry: ${shipment.sourceInquiryNo}`);
	metaLines.push(`Warehouse: ${leg.warehouseName ?? `Warehouse ${leg.warehouseId ?? '—'}`}`);
	if (leg.receivedByName || leg.receivedAt) {
		metaLines.push(
			`Received By: ${leg.receivedByName ?? '—'}${leg.receivedAt ? ` · ${new Date(leg.receivedAt).toLocaleString()}` : ''}`,
		);
	}
	if (leg.qaSubmittedByName || leg.qaSubmittedAt) {
		metaLines.push(
			`QA By: ${leg.qaSubmittedByName ?? '—'}${leg.qaSubmittedAt ? ` · ${new Date(leg.qaSubmittedAt).toLocaleString()}` : ''}`,
		);
	}
	metaLines.forEach((line, index) => {
		doc.text(line, marginX, cursorY + index * 5);
	});
	cursorY += metaLines.length * 5 + 6;

	const tableRows = leg.items.map((item) => {
		const detailParts = [item.sku, item.size, item.color].filter(Boolean);
		const defectText =
			item.defects && item.defects.length > 0
				? item.defects.map((d) => `${d.defectiveReasonLabel ?? '—'} (${d.qty})`).join(', ')
				: '—';
		return [
			item.productName ?? item.description ?? '—',
			detailParts.join(' · ') || '—',
			String(item.plannedQty),
			String(item.receivedQty),
			String(item.qaPassedQty),
			String(item.qaDefectiveQty),
			defectText,
		];
	});

	autoTable(doc, {
		startY: cursorY,
		head: [['Item', 'Detail', 'Planned', 'Received', 'Accepted', 'Defective', 'Defect Reason']],
		body: tableRows.length ? tableRows : [['—', 'No items', '', '', '', '', '']],
		theme: 'grid',
		headStyles: { fillColor: [26, 25, 23], textColor: 255, fontStyle: 'bold' },
		styles: { fontSize: 8.5, cellPadding: 3 },
		columnStyles: {
			2: { halign: 'right', cellWidth: 18 },
			3: { halign: 'right', cellWidth: 18 },
			4: { halign: 'right', cellWidth: 18 },
			5: { halign: 'right', cellWidth: 18 },
		},
		margin: { left: marginX, right: marginX },
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let afterTableY = (doc as any).lastAutoTable?.finalY ?? cursorY + 20;
	afterTableY += 10;

	const totalAccepted =
		leg.grnTotalAcceptedQty ?? leg.items.reduce((sum, i) => sum + (i.qaPassedQty ?? 0), 0);
	const totalDefective =
		leg.grnTotalDefectiveQty ?? leg.items.reduce((sum, i) => sum + (i.qaDefectiveQty ?? 0), 0);

	const totalsX = pageWidth - marginX;
	const totalsLabelX = totalsX - 55;
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 90);
	doc.text('Total Accepted', totalsLabelX, afterTableY);
	doc.setTextColor(30, 120, 60);
	doc.text(String(totalAccepted), totalsX, afterTableY, { align: 'right' });

	afterTableY += 6;
	doc.setTextColor(90, 90, 90);
	doc.text('Total Defective', totalsLabelX, afterTableY);
	doc.setTextColor(181, 46, 46);
	doc.text(String(totalDefective), totalsX, afterTableY, { align: 'right' });

	afterTableY += 20;
	const pageHeight = doc.internal.pageSize.getHeight();
	// Leave room for signature lines even on a tall item list — start a new
	// page rather than crowd them against the table.
	if (afterTableY > pageHeight - 45) {
		doc.addPage();
		afterTableY = 30;
	}

	doc.setDrawColor(150, 150, 150);
	doc.setTextColor(60, 60, 60);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	const sigWidth = (pageWidth - marginX * 2 - 20) / 2;
	const sig1X = marginX;
	const sig2X = marginX + sigWidth + 20;
	doc.line(sig1X, afterTableY, sig1X + sigWidth, afterTableY);
	doc.line(sig2X, afterTableY, sig2X + sigWidth, afterTableY);
	doc.text('Received By', sig1X, afterTableY + 5);
	doc.text('Checked / Approved By', sig2X, afterTableY + 5);

	doc.setFont('helvetica', 'italic');
	doc.setFontSize(8);
	doc.setTextColor(140, 140, 140);
	doc.text(`Goods Received Note · ${COMPANY_NAME}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
		align: 'center',
	});

	doc.save(`GRN-${leg.grnNo ?? shipment.shipmentNo}.pdf`);
};

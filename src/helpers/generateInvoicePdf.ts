import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import { COMPANY_NAME, tryLoadLogoDataUrl } from './companyLogo';
import { PosReceiptItem } from '../api/pos.api';

export type InvoicePdfInput = {
	invoiceNo: string;
	items: PosReceiptItem[];
	grossTotal: number;
	discount: number;
	netTotal: number;
	paymentMethod?: string;
	amountTendered?: number;
	change?: number;
	showroomName?: string;
	cashierName?: string;
	saleMode?: 'READY_MADE' | 'SEW_AND_SELL';
	customerReference?: string;
	date?: Date;
	/**
	 * What of netTotal was settled by something other than the tender named
	 * in `paymentMethod` — loyalty points, store credit, an account charge,
	 * or a gift card. Each present field renders as its own deduction line,
	 * followed by a "Balance Due" that's what `paymentMethod` actually
	 * covered, so the printed invoice reconciles instead of showing the full
	 * item total next to a smaller amount tendered with no explanation.
	 * Leave all of these unset (as the Sales Orders reprint does — that data
	 * isn't stored on the order) and the invoice prints exactly as before.
	 */
	redeemedValue?: number;
	pointsApplied?: number;
	storeCreditApplied?: number;
	accountCharge?: number;
	giftCardApplied?: number;
	giftCardCode?: string;
	/** How much of the cash change the customer kept as store credit — all of it, or a split. */
	changeToStoreCredit?: number;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
	CASH: 'Cash',
	CARD: 'Card',
	CHEQUE: 'Cheque',
	TRANSFER: 'Bank Transfer',
};

const PRINT_FRAME_ID = 'invoice-print-frame';
let lastPrintUrl: string | null = null;

/**
 * "need to load print view instead of downloading the receipt" — hands the
 * finished PDF to the browser's own print dialog rather than saving it to
 * Downloads. The PDF is loaded into a hidden iframe and that frame is
 * printed, so the cashier stays on the POS / Sales Orders screen and gets
 * the normal print preview (printer choice, copies, "Save as PDF" if they
 * do want a file).
 * <p>
 * The frame and its blob URL are left in place until the NEXT print —
 * removing them as soon as print() returns would blank the preview in
 * browsers where print() doesn't block. If the frame can't be printed
 * (blocked, or a browser that won't print an embedded PDF), the PDF opens
 * in a new tab instead, and only if that is blocked too does it fall back
 * to the old download.
 */
const openPrintView = (doc: jsPDF, title: string) => {
	doc.setProperties({ title });
	const url = URL.createObjectURL(doc.output('blob'));

	document.getElementById(PRINT_FRAME_ID)?.remove();
	if (lastPrintUrl) URL.revokeObjectURL(lastPrintUrl);
	lastPrintUrl = url;

	const fallback = () => {
		const opened = window.open(url, '_blank');
		if (!opened) doc.save(`${title}.pdf`);
	};

	const frame = document.createElement('iframe');
	frame.id = PRINT_FRAME_ID;
	frame.title = title;
	frame.setAttribute('aria-hidden', 'true');
	frame.style.position = 'fixed';
	frame.style.right = '0';
	frame.style.bottom = '0';
	frame.style.width = '0';
	frame.style.height = '0';
	frame.style.border = '0';
	frame.onload = () => {
		// Give the browser's PDF viewer a moment to finish rendering inside
		// the frame — printing on the load event itself can print a blank
		// page.
		window.setTimeout(() => {
			try {
				if (!frame.contentWindow) throw new Error('no print frame');
				frame.contentWindow.focus();
				frame.contentWindow.print();
			} catch {
				fallback();
			}
		}, 300);
	};
	frame.onerror = fallback;
	frame.src = url;
	document.body.appendChild(frame);
};

export const generateInvoicePdf = async (input: InvoicePdfInput) => {
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
	doc.setFontSize(20);
	doc.setTextColor(30, 30, 30);
	doc.text('INVOICE', pageWidth - marginX, cursorY, { align: 'right' });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 90);
	const date = input.date ?? new Date();
	doc.text(`Invoice No: ${input.invoiceNo}`, pageWidth - marginX, cursorY + 6, { align: 'right' });
	doc.text(
		`Date: ${date.toLocaleDateString('en-LK')} ${date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}`,
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
	const metaLines: string[] = [];
	if (input.showroomName) metaLines.push(`Showroom: ${input.showroomName}`);
	if (input.cashierName) metaLines.push(`Cashier: ${input.cashierName}`);
	if (input.customerReference) metaLines.push(`Customer: ${input.customerReference}`);
	metaLines.push(
		`Sale type: ${input.saleMode === 'SEW_AND_SELL' ? 'Sew & Sell Payment' : 'Ready-Made Sale'}`,
	);
	metaLines.forEach((line, index) => {
		doc.text(line, marginX, cursorY + index * 5);
	});
	cursorY += metaLines.length * 5 + 6;

	const tableRows = input.items.map((item) => {
		const detailParts = [item.detail, item.size, item.color, item.barcode].filter(Boolean);
		return [
			item.name,
			detailParts.join(' · ') || '—',
			String(item.qty),
			formatCurrency(item.price),
			formatCurrency(item.total),
		];
	});

	autoTable(doc, {
		startY: cursorY,
		head: [['Item', 'Detail', 'Qty', 'Unit Price', 'Line Total']],
		body: tableRows.length ? tableRows : [['—', 'No items', '', '', '']],
		theme: 'grid',
		headStyles: { fillColor: [26, 25, 23], textColor: 255, fontStyle: 'bold' },
		styles: { fontSize: 9, cellPadding: 3 },
		columnStyles: {
			2: { halign: 'right', cellWidth: 15 },
			3: { halign: 'right', cellWidth: 28 },
			4: { halign: 'right', cellWidth: 28 },
		},
		margin: { left: marginX, right: marginX },
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let afterTableY = (doc as any).lastAutoTable?.finalY ?? cursorY + 20;
	afterTableY += 10;

	const totalsX = pageWidth - marginX;
	// Wide enough for every short label ("Gross Total", "Balance Due", ...);
	// the otherTenders loop below additionally shrinks its own font size on
	// a case-by-case basis for anything longer ("Loyalty Points Redeemed
	// (100 pts)") rather than relying on this gap alone, since a points
	// count or a gift card code can make a label arbitrarily long.
	const totalsLabelX = totalsX - 85;
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 90);
	doc.text('Gross Total', totalsLabelX, afterTableY);
	doc.text(formatCurrency(input.grossTotal), totalsX, afterTableY, { align: 'right' });

	if (input.discount > 0) {
		afterTableY += 6;
		doc.setTextColor(181, 80, 46);
		doc.text('Discount', totalsLabelX, afterTableY);
		doc.text(`-${formatCurrency(input.discount)}`, totalsX, afterTableY, { align: 'right' });
	}

	afterTableY += 8;
	doc.setDrawColor(220, 220, 220);
	doc.line(totalsLabelX, afterTableY - 4, totalsX, afterTableY - 4);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	doc.setTextColor(26, 25, 23);
	doc.text('Total', totalsLabelX, afterTableY);
	doc.text(formatCurrency(input.netTotal), totalsX, afterTableY, { align: 'right' });

	// Loyalty points / store credit / an account charge / a gift card each
	// settle part of the total above — without this, the invoice showed the
	// full item total right next to a smaller amount tendered, with nothing
	// explaining where the rest went. Each present tender gets its own
	// deduction line, then "Balance Due" is what paymentMethod actually had
	// to cover, so the figures below reconcile with it.
	const otherTenders: { label: string; amount: number }[] = [];
	if (input.redeemedValue) {
		otherTenders.push({
			label: `Loyalty Points Redeemed${input.pointsApplied ? ` (-${input.pointsApplied} pts)` : ''}`,
			amount: input.redeemedValue,
		});
	}
	if (input.storeCreditApplied) {
		otherTenders.push({ label: 'Store Credit', amount: input.storeCreditApplied });
	}
	if (input.accountCharge) {
		otherTenders.push({ label: 'Charged to Account', amount: input.accountCharge });
	}
	if (input.giftCardApplied) {
		otherTenders.push({
			label: `Gift Card${input.giftCardCode ? ` (${input.giftCardCode})` : ''}`,
			amount: input.giftCardApplied,
		});
	}

	if (otherTenders.length > 0) {
		doc.setTextColor(31, 111, 76);
		otherTenders.forEach(({ label, amount }) => {
			afterTableY += 6;
			const amountText = `-${formatCurrency(amount)}`;
			doc.setFont('helvetica', 'normal');
			// "Loyalty Points Redeemed (100 pts)" or a long gift-card code
			// can run wider than the label column has room for before it
			// would collide with the right-aligned amount — shrink the font
			// for just this line rather than letting the two overlap.
			let fontSize = 10;
			doc.setFontSize(fontSize);
			const amountWidth = doc.getTextWidth(amountText);
			const availableLabelWidth = totalsX - totalsLabelX - amountWidth - 4;
			while (fontSize > 7 && doc.getTextWidth(label) > availableLabelWidth) {
				fontSize -= 0.5;
				doc.setFontSize(fontSize);
			}
			doc.text(label, totalsLabelX, afterTableY);
			doc.setFontSize(10);
			doc.text(amountText, totalsX, afterTableY, { align: 'right' });
		});
		doc.setFontSize(10);

		const settled = otherTenders.reduce((sum, tender) => sum + tender.amount, 0);
		const stillDue = Math.max(0, input.netTotal - settled);
		afterTableY += 8;
		doc.setDrawColor(220, 220, 220);
		doc.line(totalsLabelX, afterTableY - 4, totalsX, afterTableY - 4);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(26, 25, 23);
		doc.text('Amount Paid', totalsLabelX, afterTableY);
		doc.text(formatCurrency(stillDue), totalsX, afterTableY, { align: 'right' });
	}

	if (input.paymentMethod) {
		afterTableY += 10;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(10);
		doc.setTextColor(90, 90, 90);
		doc.text(
			`Paid via ${PAYMENT_METHOD_LABEL[input.paymentMethod] ?? input.paymentMethod}`,
			totalsLabelX,
			afterTableY,
		);
		if (input.paymentMethod === 'CASH' && input.amountTendered !== undefined) {
			afterTableY += 6;
			doc.text(`Tendered: ${formatCurrency(input.amountTendered)}`, totalsLabelX, afterTableY);
			afterTableY += 6;
			doc.text(`Change: ${formatCurrency(input.change ?? 0)}`, totalsLabelX, afterTableY);
			if (input.changeToStoreCredit) {
				// Some or all of the change was kept as store credit — say how
				// it was split, so the cash handed back matches the paper.
				afterTableY += 6;
				doc.text(
					`  Added to store credit: ${formatCurrency(input.changeToStoreCredit)}`,
					totalsLabelX,
					afterTableY,
				);
				afterTableY += 6;
				doc.text(
					`  Cash returned: ${formatCurrency(
						Math.max(0, (input.change ?? 0) - input.changeToStoreCredit),
					)}`,
					totalsLabelX,
					afterTableY,
				);
			}
		}
	}

	// A reprint from Sales Orders has no tendered/change section (those are
	// not stored on the order), but the part of the change kept as store
	// credit IS stored — print it on its own.
	if (!input.paymentMethod && input.changeToStoreCredit) {
		afterTableY += 10;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(10);
		doc.setTextColor(90, 90, 90);
		doc.text(
			`Change added to store credit: ${formatCurrency(input.changeToStoreCredit)}`,
			totalsLabelX,
			afterTableY,
		);
	}

	const pageHeight = doc.internal.pageSize.getHeight();
	doc.setFont('helvetica', 'italic');
	doc.setFontSize(9);
	doc.setTextColor(140, 140, 140);
	doc.text('Thank you for shopping with us.', pageWidth / 2, pageHeight - 14, { align: 'center' });

	openPrintView(doc, `Invoice-${input.invoiceNo}`);
};

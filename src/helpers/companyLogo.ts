// Shared brand asset the app uses across its printable documents — the
// company's real logo, matching what src/components/Logo.tsx renders in the
// sidebar/login screen. Centralized here (rather than duplicated per PDF
// helper — this used to live only inside generateInvoicePdf.ts) so every
// printable document (POS invoices, GRNs, ...) pulls the same URL and the
// same best-effort data-URL loader.
export const COMPANY_LOGO_URL =
	'https://talnaholdings.com/wp-content/uploads/2025/01/Talna-logo-color-guide-02.png';
export const COMPANY_NAME = 'Talna Holdings';

export type LoadedLogo = { dataUrl: string; width: number; height: number };

// Best-effort fetch of the remote logo as a data URL, for jsPDF's addImage
// (which needs image bytes, not a plain <img src> URL). If the asset can't
// be fetched — CORS, offline, moved — the caller should fall back to a
// text-only header instead of failing the whole document.
export const tryLoadLogoDataUrl = async (): Promise<LoadedLogo | null> => {
	try {
		const res = await fetch(COMPANY_LOGO_URL, { mode: 'cors' });
		if (!res.ok) return null;
		const blob = await res.blob();
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
		const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = reject;
			img.src = dataUrl;
		});
		return { dataUrl, ...dimensions };
	} catch {
		return null;
	}
};

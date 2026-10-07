import useDarkMode from '../../../hooks/useDarkMode';

/**
 * Colours for the POS "Current Sale" panel and the checkout dialog.
 * <p>
 * Both were built with a fixed ivory/ink palette written straight into
 * inline styles, so in dark mode they stayed bright white next to a dark
 * app. Every surface/text/border colour now comes from here and has a dark
 * counterpart. The accent colours (ember #B5502E, and white text on it) are
 * the same in both modes and are left inline.
 */
export type PosPalette = {
	/** Cards, panel header/footer, inputs. */
	surface: string;
	/** The area behind the cards (cart list background). */
	surfaceAlt: string;
	/** Chips, pills, secondary buttons, grouped blocks. */
	chip: string;
	border: string;
	borderSoft: string;
	text: string;
	muted: string;
	/** Empty-state text and icons. */
	faint: string;
	toggleOff: string;
	disabled: string;
	warnBg: string;
	warnText: string;
	/** Success green used as TEXT (the green fills are translucent and work in both modes). */
	success: string;
};

const LIGHT: PosPalette = {
	surface: '#FFFFFF',
	surfaceAlt: '#FAF8F5',
	chip: '#F4F1EB',
	border: '#E8E3DA',
	borderSoft: '#EFEAE2',
	text: '#1A1917',
	muted: '#6B6862',
	faint: '#B7AD9B',
	toggleOff: '#E3DED4',
	disabled: '#D9D3C6',
	warnBg: '#FBF1DE',
	warnText: '#8A5A1E',
	success: '#1F6F4C',
};

const DARK: PosPalette = {
	surface: '#242731',
	surfaceAlt: '#1f2128',
	chip: '#2f333f',
	border: '#383d4a',
	borderSoft: '#2f333f',
	text: '#e7eef8',
	muted: '#a3abb9',
	faint: '#6f7786',
	toggleOff: '#454b59',
	disabled: '#454b59',
	warnBg: 'rgba(255, 193, 7, 0.14)',
	warnText: '#f2c14e',
	success: '#4ccb8f',
};

export const usePosPalette = (): PosPalette => {
	const { darkModeStatus } = useDarkMode();
	return darkModeStatus ? DARK : LIGHT;
};

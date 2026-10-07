/**
 * Minimal, dependency-free Code 128 (subset B) barcode renderer that returns
 * a self-contained SVG string.
 *
 * Why this exists: the goods-transfer tag print sheet used to load JsBarcode
 * from a CDN inside a popup window and draw the bars on that window's `load`
 * event. When the CDN script didn't load, or `load` didn't fire for the
 * document.write()-built popup, every label printed with a blank space where
 * the barcode should be. Rendering the SVG here, in the app itself, removes
 * both failure points: no network and no timing dependency. The output is
 * standard Code 128, the same symbology JsBarcode's 'CODE128' format produced,
 * so any normal USB/wedge scanner reads it.
 *
 * Subset B covers printable ASCII (space through '~'), which includes every
 * unit tag code the backend generates (e.g. "GTR-1A2B3C4D-A12-3").
 */

// Bar/space module widths for symbol values 0–106 (bar, space, bar, space,
// bar, space). 104 is START B, 106 is STOP (which has one extra bar).
const PATTERNS: string[] = [
	'212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
	'221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
	'221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
	'212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
	'231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
	'231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
	'314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
	'112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
	'111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
	'214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
	'114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;

/** Symbol values (start, data, checksum, stop) for a Code 128-B encoding of `value`. */
export const encodeCode128B = (value: string): number[] => {
	const data = Array.from(value).map((ch) => {
		const code = ch.charCodeAt(0);
		if (code < 32 || code > 127) {
			throw new Error(`Character "${ch}" can't be encoded in Code 128 subset B`);
		}
		return code - 32;
	});
	const checksum = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
	return [START_B, ...data, checksum, STOP];
};

export type Code128SvgOptions = {
	/** Height of the bars, in SVG units. */
	barHeight?: number;
	/** Show the human-readable code under the bars. */
	showText?: boolean;
	fontSize?: number;
};

const escapeXml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/**
 * Renders `value` as a Code 128 barcode SVG. The SVG uses a viewBox with one
 * unit per module and `width="100%"`, so it scales to whatever container it's
 * placed in and prints as crisp vector bars at any size.
 */
export const code128Svg = (value: string, options: Code128SvgOptions = {}): string => {
	const { barHeight = 50, showText = true, fontSize = 12 } = options;

	const symbols = encodeCode128B(value);
	const rects: string[] = [];
	let x = QUIET_ZONE_MODULES;
	symbols.forEach((symbol) => {
		const widths = PATTERNS[symbol];
		for (let i = 0; i < widths.length; i += 1) {
			const w = Number(widths[i]);
			// Even positions are bars, odd positions are spaces.
			if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w}" height="${barHeight}"/>`);
			x += w;
		}
	});
	const totalWidth = x + QUIET_ZONE_MODULES;
	const textBlock = showText ? fontSize + 6 : 0;
	const totalHeight = barHeight + textBlock;

	const text = showText
		? `<text x="${totalWidth / 2}" y="${barHeight + fontSize + 2}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(value)}</text>`
		: '';

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" ` +
		`width="100%" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">` +
		`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#fff"/>` +
		`<g fill="#000">${rects.join('')}</g>${text}</svg>`
	);
};

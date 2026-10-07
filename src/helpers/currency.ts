// Single source of truth for how a money amount is displayed across the app.
// System currency is Sri Lankan Rupees — "Rs. " — not USD/"$". Change the
// symbol here (and nowhere else) if it ever needs to change again.
export const CURRENCY_SYMBOL = 'Rs. ';

export const formatCurrency = (value: number | string | null | undefined, decimals = 2): string => {
	const num = typeof value === 'number' ? value : Number(value);
	const safe = Number.isFinite(num) ? num : 0;
	return `${CURRENCY_SYMBOL}${safe.toLocaleString('en-LK', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	})}`;
};

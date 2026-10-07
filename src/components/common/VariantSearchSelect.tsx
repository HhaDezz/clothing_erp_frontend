import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchSelect from '../bootstrap/forms/SearchSelect';
import Icon from '../icon/Icon';
import { getVariantImageApi, Product, Variant } from '../../api/products.api';

interface VariantSearchSelectProps {
	id?: string;
	name?: string;
	ariaLabel?: string;
	placeholder?: string;
	value?: number | null;
	onChange: (variantId: number | null) => void;
	onBlur?: (...args: unknown[]) => unknown;
	variants?: Variant[];
	products?: Product[];
	disabled?: boolean;
	imageSize?: number;
}

/**
 * Unified Variant-first picker for Purchase Inquiry / Import Process line
 * items: search across every active SKU directly (no "pick a Product
 * first" step) and preview the chosen variant's photo. Wraps the project's
 * own SearchSelect (there's no react-select here — see SearchSelect.tsx),
 * and cross-references `products` locally to label each option with its
 * product name, since the Variant payload itself only carries productId.
 *
 * The photo preview here is deliberately read-only. VariantImageThumbnail
 * lets the viewer upload/replace a variant's photo in place, which would be
 * a surprising side effect to trigger from inside an inquiry/shipment
 * creation form, so this renders a plain <img> instead of reusing it.
 */
const VariantSearchSelect: React.FC<VariantSearchSelectProps> = ({
	id,
	name,
	ariaLabel = 'Variant',
	placeholder = 'Search SKU, size, color or product...',
	value,
	onChange,
	onBlur,
	variants,
	products,
	disabled,
	imageSize = 40,
}) => {
	const productNameById = useMemo(() => {
		const map = new Map<number, string>();
		products?.forEach((p) => map.set(p.id, p.name));
		return map;
	}, [products]);

	const options = useMemo(
		() =>
			(variants ?? []).map((v) => {
				const productName = productNameById.get(v.productId);
				const attrs = [v.size, v.color].filter(Boolean).join(' / ');
				const label = [productName, v.sku, attrs ? `(${attrs})` : null]
					.filter(Boolean)
					.join(' — ');
				return { value: v.id, label };
			}),
		[variants, productNameById],
	);

	const selectedVariant = useMemo(
		() => variants?.find((v) => v.id === value) ?? null,
		[variants, value],
	);

	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const objectUrlRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}
		setImageUrl(null);

		if (!selectedVariant) return undefined;

		getVariantImageApi(selectedVariant.id)
			.then((blob) => {
				if (cancelled || !blob) return;
				const url = URL.createObjectURL(blob);
				objectUrlRef.current = url;
				setImageUrl(url);
			})
			.catch(() => {
				// 404 == no photo yet, treated as a normal (non-error) outcome
			});

		return () => {
			cancelled = true;
		};
	}, [selectedVariant?.id]);

	// Revoke the object URL on unmount only.
	useEffect(
		() => () => {
			if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		},
		[],
	);

	return (
		<div className='d-flex align-items-center gap-2'>
			<div
				className='d-flex align-items-center justify-content-center rounded border bg-light overflow-hidden flex-shrink-0'
				style={{ width: imageSize, height: imageSize }}
				title={selectedVariant ? `${selectedVariant.sku}` : undefined}>
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={selectedVariant?.sku ?? 'Variant'}
						style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : (
					<Icon icon='Image' size='sm' color='secondary' />
				)}
			</div>
			<div className='flex-grow-1'>
				<SearchSelect
					id={id}
					name={name}
					ariaLabel={ariaLabel}
					placeholder={placeholder}
					disabled={disabled}
					value={value != null ? String(value) : ''}
					list={options}
					emptyMessage='No variants found'
					onChange={(e: any) => {
						const val = e?.target?.value;
						onChange(val ? Number(val) : null);
					}}
					onBlur={onBlur}
				/>
			</div>
		</div>
	);
};

export default VariantSearchSelect;

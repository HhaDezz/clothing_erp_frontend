import React, { useEffect, useRef, useState } from 'react';
import Icon from '../icon/Icon';
import showNotification from '../extras/showNotification';
import {
	getVariantImageApi,
	uploadVariantImageApi,
	removeVariantImageApi,
} from '../../api/products.api';
import { usePermission } from '../../hooks/usePermission';
import { PERMISSIONS } from '../../constants/permissions';
import { getApiErrorMessage } from '../../utils/apiError';

interface IVariantImageThumbnailProps {
	variantId: number;
	size?: number;
}

/**
 * A file-upload option for product variants — one photo per variant (e.g. a
 * different shot per color). Self-contained: fetches its own blob on mount
 * (a 404 just means "no photo yet"), and drives its own upload/remove calls,
 * so dropping it into a DataTable column needs no wiring from the parent.
 */
const VariantImageThumbnail: React.FC<IVariantImageThumbnailProps> = ({ variantId, size = 48 }) => {
	const { hasPermission } = usePermission();
	const canEdit = hasPermission(PERMISSIONS.UPDATE_PRODUCT_VARIANT);

	const [url, setUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const objectUrlRef = useRef<string | null>(null);

	const load = async () => {
		setLoading(true);
		try {
			const blob = await getVariantImageApi(variantId);
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
			if (blob) {
				const objectUrl = URL.createObjectURL(blob);
				objectUrlRef.current = objectUrl;
				setUrl(objectUrl);
			} else {
				setUrl(null);
			}
		} catch {
			setUrl(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variantId]);

	// Revoke the object URL on unmount only (not on every re-render).
	useEffect(
		() => () => {
			if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		},
		[],
	);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			showNotification('Invalid file', 'Please choose an image file.', 'danger');
			return;
		}
		setBusy(true);
		try {
			await uploadVariantImageApi(variantId, file);
			await load();
		} catch (error) {
			showNotification(
				'Upload failed',
				getApiErrorMessage(error, 'Could not upload the photo.'),
				'danger',
			);
		} finally {
			setBusy(false);
		}
	};

	const handleRemove = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!window.confirm('Remove this photo?')) return;
		setBusy(true);
		try {
			await removeVariantImageApi(variantId);
			await load();
		} catch (error) {
			showNotification('Error', getApiErrorMessage(error, 'Failed to remove photo.'), 'danger');
		} finally {
			setBusy(false);
		}
	};

	const busyOrLoading = loading || busy;

	return (
		<div
			className='position-relative d-inline-flex align-items-center justify-content-center rounded border bg-light overflow-hidden'
			style={{ width: size, height: size, cursor: canEdit ? 'pointer' : 'default', flexShrink: 0 }}
			onClick={() => canEdit && !busyOrLoading && fileInputRef.current?.click()}
			role={canEdit ? 'button' : undefined}
			tabIndex={canEdit ? 0 : undefined}
			title={
				canEdit ? (url ? 'Click to replace photo' : 'Click to upload a photo') : undefined
			}>
			{busyOrLoading ? (
				<Icon icon='HourglassEmpty' size='sm' color='secondary' />
			) : url ? (
				<img
					src={url}
					alt='Variant'
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
				/>
			) : (
				<Icon icon='AddAPhoto' size='sm' color='secondary' />
			)}
			{canEdit && url && !busyOrLoading && (
				<button
					type='button'
					className='btn btn-danger position-absolute p-0 d-flex align-items-center justify-content-center'
					style={{
						top: -6,
						right: -6,
						width: 18,
						height: 18,
						borderRadius: '50%',
						lineHeight: 1,
						border: 'none',
					}}
					onClick={handleRemove}
					aria-label='Remove photo'>
					<Icon icon='Close' style={{ fontSize: 12 }} />
				</button>
			)}
			{canEdit && (
				<input
					ref={fileInputRef}
					type='file'
					accept='image/*'
					className='d-none'
					onChange={handleFileChange}
				/>
			)}
		</div>
	);
};

export default VariantImageThumbnail;

import React, { ImgHTMLAttributes, useEffect, useMemo, useState } from 'react';
import { resolveMediaUrls } from '../../utils/media';

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
	src?: string | null;
};

const MediaImage = ({ src, onError, ...props }: MediaImageProps) => {
	const candidates = useMemo(() => resolveMediaUrls(src), [src]);
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		setActiveIndex(0);
	}, [src]);

	if (!candidates.length) return null;

	return (
		<img
			{...props}
			src={candidates[activeIndex]}
			onError={(event) => {
				if (activeIndex < candidates.length - 1) {
					setActiveIndex((currentIndex) => currentIndex + 1);
					return;
				}

				onError?.(event);
			}}
		/>
	);
};

export default MediaImage;

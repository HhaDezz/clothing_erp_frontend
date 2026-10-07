import React, { FC } from 'react';

interface ILogoProps {
	width?: number;
	height?: number;
	src?: string;
	alt?: string;
	className?: string;
}
const Logo: FC<ILogoProps> = ({
	width = 2155,
	height = 854,
	src = 'https://talnaholdings.com/wp-content/uploads/2025/01/Talna-logo-color-guide-02.png',
	alt = 'Logo',
	className,
}) => {
	return (
		<div className={className} style={{ display: 'inline-block', lineHeight: 0 }}>
			<img
				src={src}
				width={width}
				height={height}
				alt={alt}
				style={{ display: 'block', width: '80%', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
			/>
		</div>
	);
};

export default Logo;

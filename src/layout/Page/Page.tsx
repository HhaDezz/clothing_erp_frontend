import React, { forwardRef, ReactNode } from 'react';
import classNames from 'classnames';

export interface IPageProps {
	children: ReactNode;
	container?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'fluid';
	className?: string;
}
const Page = forwardRef<HTMLDivElement, IPageProps>(
	// Default is the full-width (fluid) container, so every page's content
	// lines up with the full-width sub-header above it. A page that wants a
	// narrower, centred layout can still pass container='xxl' (or sm/md/lg/xl).
	({ children, className, container = 'fluid', ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={classNames('page', className, {
					[`container${typeof container === 'string' ? `-${container}` : ''}`]: container,
				})}
				{...props}>
				{children}
			</div>
		);
	},
);
Page.displayName = 'Page';

export default Page;

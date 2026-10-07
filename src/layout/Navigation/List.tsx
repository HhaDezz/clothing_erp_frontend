import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import classNames from 'classnames';

interface IListProps extends HTMLAttributes<HTMLUListElement> {
	id?: string;
	children?: ReactNode;
	className?: string;
	ariaLabelledby?: string;
	parentId?: string;
	rootId?: string;
	horizontal?: boolean;
}
const List = forwardRef<HTMLUListElement, IListProps>(
	({ id, children, className, ariaLabelledby, parentId, rootId, horizontal, ...props }, ref) => {
		return (
			<ul
				ref={ref}
				id={id}
				className={classNames('navigation', { 'navigation-menu': horizontal }, className)}
				aria-labelledby={ariaLabelledby}
				data-bs-parent={
					parentId === `${rootId}__${rootId}`
						? `#${rootId}`
						: (parentId && `#${parentId}`) || null
				}
				{...props}>
				{children}
			</ul>
		);
	},
);
List.displayName = 'List';

export default List;

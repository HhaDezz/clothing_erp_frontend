import React, { FC, forwardRef, HTMLAttributes, ReactNode, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { TIcons } from '../../type/icons-type';
import Item from './Item';
import List from './List';
import { usePermission } from '../../hooks/usePermission';
import { PermissionRequirement } from '../../constants/permissions';

interface INavigationLineProps {
	className?: string;
}
export const NavigationLine: FC<INavigationLineProps> = ({ className }) => {
	return <hr className={classNames('navigation-line', className)} />;
};

interface INavigationTitleProps extends HTMLAttributes<HTMLSpanElement> {
	className?: string;
	children: ReactNode;
}
export const NavigationTitle: FC<INavigationTitleProps> = ({ className, children, ...props }) => {
	return (
		<li className='navigation-item'>
			<span className={classNames('navigation-title', className)} {...props}>
				{children}
			</span>
		</li>
	);
};

interface INavigationProps {
	horizontal?: boolean;
	menu: {
		[key: string]: {
			id?: string | number;
			text?: string;
			path?: string;
			icon?: TIcons;
			isDisable?: boolean;
			hide?: boolean;
			permission?: PermissionRequirement;
			subMenu?: {
				[key: string]: {
					id?: string | number;
					text?: string;
					path?: string;
					icon?: TIcons;
					isDisable?: boolean;
					hide?: boolean;
					permission?: PermissionRequirement;
				};
			} | null;
		};
	};
	id: string;
	className?: string;
}
const Navigation = forwardRef<HTMLElement, INavigationProps>(
	({ menu, horizontal, id, className, ...props }, ref) => {
		const [activeItem, setActiveItem] = useState(undefined);

		const { t } = useTranslation('menu');
		const { hasPermission } = usePermission();

		const filteredMenu = Object.entries(menu).reduce<INavigationProps['menu']>((acc, [key, item]) => {
			if (item.hide) return acc;
			if (!hasPermission(item.permission)) return acc;

			const filteredSubMenu = item.subMenu
				? Object.entries(item.subMenu).reduce<NonNullable<typeof item.subMenu>>(
						(subMenuAcc, [subMenuKey, subMenuItem]) => {
							if (subMenuItem.hide) return subMenuAcc;
							if (!hasPermission(subMenuItem.permission)) return subMenuAcc;
							subMenuAcc[subMenuKey] = subMenuItem;
							return subMenuAcc;
						},
						{},
					)
				: item.subMenu;

			if (item.path || (filteredSubMenu && Object.keys(filteredSubMenu).length > 0) || !item.subMenu) {
				acc[key] = {
					...item,
					subMenu:
						filteredSubMenu && Object.keys(filteredSubMenu).length > 0 ? filteredSubMenu : null,
				};
			}

			return acc;
		}, {});

		const hasVisibleLink = Object.values(filteredMenu).some(
			(item) => item.path || (item.subMenu && Object.keys(item.subMenu).length > 0),
		);

		if (!hasVisibleLink) return null;

		// Group flat sibling items under the preceding path-less "section
		// header" entry (e.g. Master Data -> Users / Roles / Products...) so
		// the header becomes a real collapsible parent — Item.tsx already
		// supports this via subMenu (chevron, Collapse, aria-expanded) — it
		// was just never wired up, so headers rendered as static labels with
		// orphaned flat items below them and nothing to expand/collapse.
		// Horizontal (header dropdown) menus are left flat: their headers
		// already open as a Popper flyout, not an inline accordion.
		const groupedMenu: INavigationProps['menu'] = horizontal
			? filteredMenu
			: Object.entries(filteredMenu).reduce<INavigationProps['menu']>((acc, [key, item]) => {
					const isHeader = !item.path && !item.subMenu;
					if (isHeader) {
						acc[key] = { ...item, subMenu: {} };
						return acc;
					}

					const lastKey = Object.keys(acc).pop();
					const lastEntry = lastKey ? acc[lastKey] : undefined;
					if (lastEntry && !lastEntry.path && lastEntry.subMenu) {
						(lastEntry.subMenu as NonNullable<typeof lastEntry.subMenu>)[key] = item;
						return acc;
					}

					acc[key] = item;
					return acc;
				}, {});

		// Drop headers left with no visible children after permission
		// filtering — an expandable row with nothing inside is worse than no
		// row at all.
		Object.entries(groupedMenu).forEach(([key, item]) => {
			if (!item.path && item.subMenu && Object.keys(item.subMenu).length === 0) {
				delete groupedMenu[key];
			}
		});

		function fillMenu(
			data:
				| {
						id?: string | number;
						text?: string;
						path?: string;
						icon?: TIcons;
						isDisable?: boolean;
						hide?: boolean;
						permission?: PermissionRequirement;
						subMenu?:
							| {
									id?: string | number;
									text?: string;
									path?: string;
									icon?: TIcons;
									isDisable?: boolean;
									hide?: boolean;
									permission?: PermissionRequirement;
							  }[]
							| undefined;
				  }[]
				| any,
			parentId: string,
			rootId: string,
			isHorizontal: boolean | undefined,
			isMore: boolean | undefined,
		) {
			return Object.keys(data).map((item) => {
				const hasSubMenu = !!data[item].subMenu && Object.keys(data[item].subMenu).length > 0;
				return data[item].path || hasSubMenu ? (
					<Item
						key={data[item].id}
						rootId={rootId}
						id={data[item].id}
						title={data[item].text}
						icon={data[item].icon}
						to={data[item].path ? `${data[item].path}` : undefined}
						parentId={parentId}
						isHorizontal={isHorizontal}
						setActiveItem={setActiveItem}
						activeItem={activeItem}
						notification={data[item].notification}
						hide={data[item].hide}>
						{hasSubMenu &&
							fillMenu(
								data[item].subMenu,
								data[item].id,
								rootId,
								isHorizontal,
								undefined,
							)}
					</Item>
				) : (
					!isMore &&
					!isHorizontal && (
						<NavigationTitle key={data[item].id}>
							{t(data[item].text) as ReactNode}
						</NavigationTitle>
					)
				);
			});
		}

		return (
			// @ts-ignore

			<nav ref={ref} aria-label={id} className={className} {...props}>
				<List id={id} horizontal={horizontal}>
					{fillMenu(groupedMenu, id, id, horizontal, undefined)}
					{horizontal && (
						<Item
							rootId={`other-${id}`}
							title={t('More') as string}
							icon='MoreHoriz'
							isHorizontal
							isMore>
							{fillMenu(groupedMenu, `other-${id}`, `other-${id}`, false, true)}
						</Item>
					)}
				</List>
			</nav>
		);
	},
);
Navigation.displayName = 'Navigation';

export default Navigation;

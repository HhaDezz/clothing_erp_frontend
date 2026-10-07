import React, { useContext } from 'react';
import Brand from '../../../layout/Brand/Brand';
import Navigation from '../../../layout/Navigation/Navigation';
import User from '../../../layout/User/User';
import {
	dashboardPagesMenu,
	masterDataMenu,
	salesMenu,
	productionMenu,
	purchasingMenu,
	importMenu,
	inventoryMenu,
	reportsMenu,
	goodsTransferMenu,
} from '../../../menu';
import ThemeContext from '../../../contexts/themeContext';
import Aside, { AsideBody, AsideFoot, AsideHead } from '../../../layout/Aside/Aside';
import { usePermission } from '../../../hooks/usePermission';

const DefaultAside = () => {
	const { asideStatus, setAsideStatus } = useContext(ThemeContext);
	const { hasPermission } = usePermission();

	const hasVisibleMenuItems = (menu: Record<string, any>): boolean =>
		Object.values(menu).some((item: any) => {
			if (item.hide) return false;
			if (!hasPermission(item.permission)) return false;
			if (item.path) return true;
			if (item.subMenu) return hasVisibleMenuItems(item.subMenu);
			return false;
		});

	const asideMenus = [
		{ menu: dashboardPagesMenu, id: 'aside-dashboard' },
		{ menu: masterDataMenu, id: 'aside-master-data' },
		{ menu: salesMenu, id: 'aside-sales' },
		{ menu: productionMenu, id: 'aside-production' },
		{ menu: purchasingMenu, id: 'aside-purchasing' },
		{ menu: importMenu, id: 'aside-import' },
		{ menu: inventoryMenu, id: 'aside-inventory' },
		{ menu: goodsTransferMenu, id: 'aside-goods-transfer' },
		{ menu: reportsMenu, id: 'aside-reports' },
	].filter(({ menu }) => hasVisibleMenuItems(menu));

	return (
		<Aside>
			<AsideHead>
				<Brand asideStatus={asideStatus} setAsideStatus={setAsideStatus} />
			</AsideHead>
			<AsideBody>
				{asideMenus.map(({ menu, id }) => (
					<Navigation key={id} menu={menu} id={id} />
				))}
			</AsideBody>
			<AsideFoot>
				<User />
			</AsideFoot>
		</Aside>
	);
};

export default DefaultAside;

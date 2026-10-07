import React, { FC, ReactNode, useContext, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { IButtonProps } from '../../../components/bootstrap/Button';
import { HeaderRight } from '../../../layout/Header/Header';
import Icon from '../../../components/icon/Icon';
import ThemeContext from '../../../contexts/themeContext';
import { getLangWithKey, ILang } from '../../../lang';
import showNotification from '../../../components/extras/showNotification';
import useDarkMode from '../../../hooks/useDarkMode';
import Popovers from '../../../components/bootstrap/Popovers';
import NotificationBell from '../../../components/common/NotificationBell';

interface ICommonHeaderRightProps {
	beforeChildren?: ReactNode;
	afterChildren?: ReactNode;
}
const CommonHeaderRight: FC<ICommonHeaderRightProps> = ({ beforeChildren, afterChildren }) => {
	const { darkModeStatus, setDarkModeStatus } = useDarkMode();

	const { fullScreenStatus, setFullScreenStatus } = useContext(ThemeContext);
	const styledBtn: IButtonProps = {
		color: darkModeStatus ? 'dark' : 'light',
		hoverShadow: 'default',
		isLight: !darkModeStatus,
		size: 'lg',
	};

	const { i18n } = useTranslation();

	const changeLanguage = (lng: ILang['key']['lng']) => {
		i18n.changeLanguage(lng).then();
		showNotification(
			<span className='d-flex align-items-center'>
				<Icon icon={getLangWithKey(lng)?.icon} size='lg' className='me-1' />
				<span>{`Language changed to ${getLangWithKey(lng)?.text}`}</span>
			</span>,
			'You updated the language of the site. (Only "Aside" was prepared as an example.)',
		);
	};

	useLayoutEffect(() => {
		document.documentElement.setAttribute('lang', i18n.language.substring(0, 2));
	});

	return (
		<HeaderRight>
			<div className='row g-3 align-items-center'>
				{beforeChildren}

				{/* Dark Mode */}
				<div className='col-auto'>
					<Popovers trigger='hover' desc='Dark / Light mode'>
						<Button
							// eslint-disable-next-line react/jsx-props-no-spreading
							{...styledBtn}
							onClick={() => setDarkModeStatus(!darkModeStatus)}
							className='btn-only-icon'
							data-tour='dark-mode'
							aria-label='Toggle dark mode'>
							<Icon
								icon={darkModeStatus ? 'DarkMode' : 'LightMode'}
								color={darkModeStatus ? 'info' : 'warning'}
								className='btn-icon'
							/>
						</Button>
					</Popovers>
				</div>

				{/* Full Screen */}
				<div className='col-auto'>
					<Popovers trigger='hover' desc='Fullscreen'>
						<Button
							// eslint-disable-next-line react/jsx-props-no-spreading
							{...styledBtn}
							icon={fullScreenStatus ? 'FullscreenExit' : 'Fullscreen'}
							onClick={() => setFullScreenStatus(!fullScreenStatus)}
							aria-label='Toggle fullscreen'
						/>
					</Popovers>
				</div>

				{/* Live Notification Bell — department-targeted, WebSocket real-time push */}
				<NotificationBell styledBtn={styledBtn} />

				{afterChildren}
			</div>
		</HeaderRight>
	);
};

export default CommonHeaderRight;

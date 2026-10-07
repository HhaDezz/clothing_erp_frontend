import React, { forwardRef, ReactNode, useContext, useEffect, useLayoutEffect } from 'react';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../contexts/authContext';

import Alert from '../../components/bootstrap/Alert';
import { PermissionRequirement } from '../../constants/permissions';
import { hasPermission } from '../../utils/permissions';

interface IPageWrapperProps {
	isProtected?: boolean;
	title?: string;
	description?: string;
	requiredPermission?: PermissionRequirement;
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}
const PageWrapper = forwardRef<HTMLDivElement, IPageWrapperProps>(
	(
		{ isProtected = true, title, description, className, style, requiredPermission, children },
		ref,
	) => {
		useLayoutEffect(() => {
			// @ts-ignore
			document.getElementsByTagName('TITLE')[0].text = `${title ? `${title} | ` : ''}${
				import.meta.env.VITE_SITE_NAME
			}`;
			// @ts-ignore
			document
				?.querySelector('meta[name="description"]')
				.setAttribute('content', description || import.meta.env.VITE_META_DESC || '');
		});

		const { user, authUser } = useContext(AuthContext);

		const navigate = useNavigate();
		useEffect(() => {
			if (isProtected && user === '') {
				navigate('/auth-pages/login');
			}
			return () => {};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);

		const isAuthorized = hasPermission(requiredPermission, authUser);

		if (isProtected && user !== '' && !isAuthorized) {
			return (
				<div
					ref={ref}
					className={classNames('page-wrapper', 'container-fluid', className)}
					style={style}>
					<div className='row justify-content-center py-5'>
						<div className='col-12 col-xl-6'>
							<Alert color='danger' isLight icon='Block'>
								You do not have permission to access this page.
							</Alert>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div
				ref={ref}
				className={classNames('page-wrapper', 'container-fluid', className)}
				style={style}>
				{children}
			</div>
		);
	},
);
PageWrapper.displayName = 'PageWrapper';

export default PageWrapper;

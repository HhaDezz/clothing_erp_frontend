import React from 'react';
import { Link } from 'react-router-dom';
import Header, { HeaderLeft } from '../../../layout/Header/Header';
import Icon from '../../../components/icon/Icon';
import useDeviceScreen from '../../../hooks/useDeviceScreen';
import CommonHeaderRight from './CommonHeaderRight';

const DefaultHeader = () => {
	const { width } = useDeviceScreen();
	return (
		<Header>
			<HeaderLeft>
				<div className='col d-flex align-items-center'>
					{/* Was an empty div ("Empty Header") — the sidebar brand (Brand.tsx)
					   only shows the Talna logo mark with no wordmark, and it disappears
					   entirely when the aside is collapsed, so the top bar had no app
					   identity at all. This gives every page a persistent brand + a
					   one-click way home. */}
					<Link
						to='/'
						className='d-flex align-items-center text-decoration-none'
						aria-label='Clothing ERP — go to dashboard'>
						<Icon icon='Checkroom' size='lg' color='primary' className='me-2' />
						<span className='fw-bold fs-5 text-body d-none d-sm-inline'>
							Clothing ERP
						</span>
					</Link>
				</div>
			</HeaderLeft>
			<CommonHeaderRight />
		</Header>
	);
};

export default DefaultHeader;

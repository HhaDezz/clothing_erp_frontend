import React from 'react';
import Header, { HeaderLeft } from '../../../layout/Header/Header';

import Search from '../../../components/Search';
import CommonHeaderRight from './CommonHeaderRight';

const DashboardHeader = () => {
	return (
		<Header>
			<HeaderLeft>
				<Search />
			</HeaderLeft>
			<CommonHeaderRight />
		</Header>
	);
};

export default DashboardHeader;

import React from 'react';
import { RouteProps } from 'react-router-dom';
import DefaultFooter from '../pages/_layout/_footers/DefaultFooter';

const footers: RouteProps[] = [
	{ path: '/page-layouts/blank', element: null },
	{ path: '/auth-pages/login', element: null },
	{ path: '/auth-pages/sign-up', element: null },
	{ path: '/auth-pages/404', element: null },
	{ path: '/knowledge/grid', element: null },
	{ path: '*', element: <DefaultFooter /> },
];

export default footers;

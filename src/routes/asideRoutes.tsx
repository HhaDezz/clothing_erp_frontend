import React from 'react';
import { RouteProps } from 'react-router-dom';
import DefaultAside from '../pages/_layout/_asides/DefaultAside';

const asides: RouteProps[] = [
	{ path: '/auth-pages/login', element: null },
	{ path: '/auth-pages/sign-up', element: null },
	{ path: '/page-layouts/blank', element: null },
	{ path: '*', element: <DefaultAside /> },
];

export default asides;

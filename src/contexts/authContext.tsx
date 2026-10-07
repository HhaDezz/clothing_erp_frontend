import React, { createContext, FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { getUserDataWithUsername, IUserProps } from '../common/data/userDummyData';
import { getCurrentUserApi } from '../api/auth.api';
import { getStoredAuthUser, StoredAuthUser } from '../utils/permissions';

export interface IAuthContextProps {
	user: string;
	setUser?(...args: unknown[]): unknown;
	userData: Partial<IUserProps>;
	authUser: StoredAuthUser | null;
	permissions: string[];
}
const AuthContext = createContext<IAuthContextProps>({} as IAuthContextProps);

interface IAuthContextProviderProps {
	children: ReactNode;
}
export const AuthContextProvider: FC<IAuthContextProviderProps> = ({ children }) => {
	const [user, setUser] = useState<string>(localStorage.getItem('facit_authUsername') || '');
	const [userData, setUserData] = useState<Partial<IUserProps>>({});
	const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);
	const [permissions, setPermissions] = useState<string[]>([]);

	useEffect(() => {
		localStorage.setItem('facit_authUsername', user);
	}, [user]);

	useEffect(() => {
		if (user !== '') {
			try {
				const realUserStr = localStorage.getItem('user');
				if (realUserStr) {
					const realUser = JSON.parse(realUserStr) as StoredAuthUser;
					setAuthUser(realUser);
					setPermissions(Array.isArray(realUser.permissions) ? realUser.permissions : []);
					setUserData({
						name: realUser.name || realUser.username || user,
						surname: '',
						position: realUser.role || 'Administrator',
						email: realUser.email || '',
						// Give a default avatar image
						src: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(realUser.name || realUser.username || user) + '&background=random',
						srcSet: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(realUser.name || realUser.username || user) + '&background=random',
					});
					return;
				}
				setAuthUser(null);
				setPermissions([]);
			} catch (e) {
				console.error('Failed to parse real user data', e);
				setAuthUser(null);
				setPermissions([]);
			}

			// Fallback to dummy data
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setUserData(getUserDataWithUsername(user) || { name: user });
		} else {
			setUserData({});
			setAuthUser(null);
			setPermissions([]);
		}
	}, [user]);

	// Keep an already-open tab in sync with permission/role changes made on
	// the backend, without forcing a re-login. The login response is only a
	// snapshot taken once; this refetches GET /users/me on mount, whenever
	// the tab regains focus, and on a short interval as a fallback, then
	// merges the fresh role/permissions/departments into both React state
	// and the cached localStorage 'user' object (the JWT itself — and its
	// 'token' field — is left untouched).
	useEffect(() => {
		if (user === '') return undefined;

		let cancelled = false;

		const refreshPermissions = () => {
			getCurrentUserApi()
				.then((response) => {
					if (cancelled || !response?.data) return;

					const fresh = response.data;
					const merged: StoredAuthUser = {
						...(getStoredAuthUser() ?? {}),
						role: fresh.role,
						permissions: Array.isArray(fresh.permissions) ? fresh.permissions : [],
						departments: fresh.departments,
						name: fresh.name,
						email: fresh.email,
						warehouseIds: Array.isArray(fresh.warehouseIds) ? fresh.warehouseIds : [],
						warehouseNames: Array.isArray(fresh.warehouseNames) ? fresh.warehouseNames : [],
					};

					localStorage.setItem('user', JSON.stringify(merged));
					setAuthUser(merged);
					setPermissions(merged.permissions ?? []);
				})
				.catch(() => {
					// A real auth failure (expired/blacklisted token) is already
					// handled by the global 401 interceptor in lib/axios.ts —
					// anything else here (a network blip) just skips this round.
				});
		};

		refreshPermissions();
		const intervalId = window.setInterval(refreshPermissions, 2 * 60 * 1000);
		window.addEventListener('focus', refreshPermissions);

		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
			window.removeEventListener('focus', refreshPermissions);
		};
	}, [user]);

	const value = useMemo(
		() => ({
			user,
			setUser,
			userData,
			authUser,
			permissions,
		}),
		[user, userData, authUser, permissions],
	);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

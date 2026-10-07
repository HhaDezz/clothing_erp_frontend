import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/styles.scss';
import App from './App/App';
import reportWebVitals from './reportWebVitals';
import { ThemeContextProvider } from './contexts/themeContext';
import { AuthContextProvider } from './contexts/authContext';
import './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	},
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthContextProvider>
				<ThemeContextProvider>
					<Router>
						<App />
					</Router>
				</ThemeContextProvider>
			</AuthContextProvider>

			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	</StrictMode>,
);

reportWebVitals();

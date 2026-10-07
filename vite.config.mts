import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	define: {
		global: 'window',
	},
	plugins: [react()],
	server: {
		watch: {
			// Use polling to avoid Linux inotify "ENOSPC" crashes when
			// the system watcher limit is exhausted.
			usePolling: true,
			interval: 300,
			ignored: ['**/.git/**', '**/node_modules/**'],
		},
	},
	css: {
		preprocessorOptions: {
			scss: {
				quietDeps: true,
			},
		},
	},
});

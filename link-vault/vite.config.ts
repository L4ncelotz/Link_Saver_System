import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: 'index.html' })
		}),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Vault OS',
				short_name: 'Vault',
				theme_color: '#0A0A0A',
				background_color: '#0A0A0A',
				display: 'standalone',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				],
				share_target: {
					action: '/share',
					method: 'GET',
					enctype: 'application/x-www-form-urlencoded',
					params: {
						title: 'title',
						text: 'text',
						url: 'url'
					}
				}
			}
		})
	]
});

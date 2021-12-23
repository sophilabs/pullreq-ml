import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		header: 'Github Pull Request Validator',
		loading: false
	}
});

export default app;
<script>
	import HeaderBar from './components/HeaderBar.svelte';
	import Header from './components/header/Header.svelte';
	import SubmitButton from './components/submitButton/SubmitButton.svelte';
	export let header;
</script>

<main>
	<HeaderBar />
	<Header header={header}/>
	<input placeholder="Github link">
	<SubmitButton/>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
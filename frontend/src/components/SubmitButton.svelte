<script>
    export let loading;
    function checkPullRequest() {
        loading = true;
        setTimeout(() => {
            loading = false;
        }, 3000)
    }
</script>

<button class="cta" on:click={checkPullRequest}>Check</button>
    {#if loading}
		<span>loading...</span>
	{:else}
		<span>finished loading</span>
	{/if}

<style>
.cta {
    cursor: pointer;
}
</style>
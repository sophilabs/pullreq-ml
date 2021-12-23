<script>
	export let header;
    import Github from '../assets/images/github-icon.png'
</script>


<div class="header-navigation">
    <img class="github" src={Github} alt="github-icon" />
</div>

<style>
    .github {
        position: absolute;
        left: 0;
        width: 20px;
        height: 20px
    }
	.header-navigation {
		background-color: black;
        top: 0;
        left: 0;
        position: absolute;
        width: 100%;
        height: 40px;
	}
</style>
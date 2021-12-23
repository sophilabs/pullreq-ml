<script>
	import { spring } from "svelte/motion";
	import stateData from "./data";
	import Illustration from "./components/Illustration.svelte";
	import Slider from "./components/Slider.svelte";
	import * as d3 from "d3-interpolate";
  
	let stateIndex = 1;
	let sliderPosition = spring(1 / (stateData.length - 1), {
	  stiffness: 0.4,
	  damping: 0.9
	});
	let background = stateData[stateIndex].background;
	const interpolate = d3.piecewise(
	  d3.interpolate,
	  stateData.map(o => o.background)
	);
	let ratingPosition = spring(0, {
	  stiffness: 0.2,
	  damping: 0.7
	});
  
	$: {
	  background = interpolate($sliderPosition);
	  ratingPosition.set(
		((stateIndex - (stateData.length - 1)) / stateData.length) * 100
	  );
	}
  </script>
  
  <style>
	:global(body) {
	  margin: 0;
	  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
		"Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
		"Segoe UI Symbol";
	}
	main {
	  display: flex;
	  align-items: center;
	  width: 100%;
	  height: 100vh;
	  box-sizing: border-box;
	}
	section {
	  width: 100%;
	  max-width: 300px;
	  max-height: 100%;
	  overflow: hidden;
	  margin: 0 auto 18px;
	  text-align: center;
	  display: flex;
	  flex-flow: column nowrap;
	  align-items: stretch;
	  justify-content: center;
	}
	h1 {
	  width: 75%;
	  margin: 0 auto 2rem;
	  font-size: 44px;
	  font-weight: 400;
	  line-height: 1.2;
	}
	div {
	  mask-image: linear-gradient(
		90deg,
		transparent,
		black 20%,
		black 80%,
		transparent
	  );
	  -webkit-mask-image: linear-gradient(
		90deg,
		transparent,
		black 20%,
		black 80%,
		transparent
	  );
	  overflow: hidden;
	  width: 50%;
	  margin: 0 auto;
	}
	p {
	  display: flex;
	  flex-flow: row-reverse nowrap;
	  width: 300%;
	  font-size: 28px;
	  margin: 0 0 2rem;
	}
	p span {
	  display: block;
	  width: 100%;
	}
  </style>
  
  <svelte:body />
  
  <main
	style="background: {background};"
  >
	<section>
	  <h1>How was your ride?</h1>
	  <div>
		<p style="transform: translateX({$ratingPosition}%);">
		  {#each stateData as { name }, i}
			<span
			  aria-hidden={i === stateIndex ? false : true}
			  >
			  {name}
			</span>
		  {/each}
		</p>
	  </div>
	  <Illustration
		{sliderPosition}
		{stateData}
		{stateIndex}
	  />
	  <Slider
		bind:value={stateIndex}
		bind:sliderPosition={sliderPosition}
		max={stateData.length - 1}
	  />
	</section>
  </main>
<script>
    import { spring } from "svelte/motion";
    import { cubicOut } from "svelte/easing";
    import { isSliderActive } from "../stores";
  
    export let value;
    export let min = 0;
    export let max = 2;
    export let step = 1;
    export let sliderPosition;
  
    let xMin, xMax;
    let trailingPosition = spring(value / max);
    let isActive = false;
  
    $: {
      if (!isActive) {
        sliderPosition.set(value / max);
        trailingPosition.set(value / max);
      }
    }
  
    const normalizeX = n => {
      return n <= xMin ? 0 : n >= xMax ? 1 : (n - xMin) / (xMax - xMin);
    };
  
    function mousedown(e) {
      isActive = true;
      isSliderActive.set(isActive);
      let { left, right } = e.target.getBoundingClientRect();
      let style = window.getComputedStyle(e.target);
      xMin = left + (parseInt(style.paddingLeft) || 0);
      xMax = right - (parseInt(style.paddingRight) || 0);
      let clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      sliderPosition.set(normalizeX(clientX));
      trailingPosition.set(normalizeX(clientX));
    }
  
    function mousemove(e) {
      if (!isActive) return;
      let clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      sliderPosition.set(normalizeX(clientX));
      trailingPosition.set(normalizeX(clientX));
    }
  
    function mouseup(e) {
      isActive = false;
      isSliderActive.set(isActive);
      sliderPosition.set(value / max);
      trailingPosition.set(value / max);
    }
  </script>
  
  <style>
    div {
      position: relative;
      font-size: 56px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill-opacity="0.1"></rect></svg>');
      background-size: calc(100% - 1em) 2px;
      background-position: 0.5em center;
      background-repeat: no-repeat;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      user-select: none;
      overflow: hidden;
    }
    span {
      position: absolute;
      left: 0.5em;
      display: block;
      width: calc(100% - 1em);
      height: 100%;
      pointer-events: none;
    }
    span:after {
      position: absolute;
      top: 50%;
      display: block;
      transform: translate(-50%, -50%);
      content: "";
    }
    span.thumb--dot:after {
      width: 0.2em;
      height: 0.2em;
      background: black;
      border-radius: 50%;
    }
    span.thumb--frame:after {
      height: 0.9em;
      width: 0.9em;
      border: 0.05em solid white;
      border-radius: 40%;
    }
    input {
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 1em;
      margin: 0;
      padding: 0 0.5em;
      opacity: 0;
      font-size: inherit;
      -webkit-appearance: none;
      -moz-apperance: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      user-select: none;
    }
    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 1em;
      width: 0.25em;
      transform: scaleX(5);
      transform-origin: center;
    }
    input::-moz-range-thumb {
      height: 1em;
      width: 0.25em;
      transform: scaleX(5);
      transform-origin: center;
    }
    input::-ms-thumb {
      height: 1em;
      width: 0.25em;
      transform: scaleX(5);
      transform-origin: center;
    }
  </style>
  
  <div>
    <span
      aria-hidden="true"
      style="transform: translateX({$trailingPosition * 100}%);"
      class="thumb thumb--frame"
    />
    <span
      aria-hidden="true"
      style="transform: translateX({$sliderPosition * 100}%);"
      class="thumb thumb--dot"
    />
    <input
      type=range
      bind:value={value}
      min={min}
      max={max}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      step={step}
      on:mousedown={mousedown}
      on:mousemove={mousemove}
      on:mouseup={mouseup}
      on:touchstart={mousedown}
      on:touchmove={mousemove}
      on:touchend={mouseup}
      on:touchcancel={mouseup}
    />
  </div>
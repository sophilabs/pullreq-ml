<script>
    import { onMount } from "svelte";
    import * as d3 from "d3-interpolate";
    import { isSliderActive } from "../stores";
  
    export let stateData;
    export let stateIndex;
    export let sliderPosition;
    let pathData = {};
    let pathNames = Object.keys(stateData[0].paths);
    const interpolate = d3.piecewise(d3.interpolate, stateData.map(o => o.paths));
  
    let isActive;
  
    const getClass = () => {
      return (
        stateData[stateIndex].name +
        " " +
        (isActive ? "isActive" : "")
      ).trim();
    };
  
    const unsubscribe = isSliderActive.subscribe(value => {
      isActive = value;
    });
  
    $: {
      pathData = interpolate($sliderPosition || 0);
      document.documentElement.style.setProperty(
        "--slider-position",
        $sliderPosition
      );
    }
  </script>
  
  <style>
    @keyframes shake {
      0% {
        transform: matrix(1, 0, 0, 1, 0, 0);
      }
      40% {
        transform: matrix(1, 0, 0, 1, 0, 0);
      }
      44% {
        transform: matrix(1, 0, 0, 1, 0, -4);
      }
      48% {
        transform: matrix(1, 0, 0, 1, -4, 4);
      }
      52% {
        transform: matrix(1, 0, 0, 1, 3, -3);
      }
      56% {
        transform: matrix(1, 0, 0, 1, -3, 1);
      }
      60% {
        transform: matrix(1, 0, 0, 1, 0, 0);
      }
      100% {
        transform: matrix(1, 0, 0, 1, 0, 0);
      }
    }
    @keyframes lookL {
      0% {
        transform: translate(0, 0);
      }
      2% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px + 2px), 6px);
      }
      8% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px + 2px), 6px);
      }
      10% {
        transform: translate(0, 0);
      }
      52% {
        transform: translate(0, 0);
      }
      54% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px + 2px), 6px);
      }
      62% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px + 2px), 6px);
      }
      65% {
        transform: translate(
          calc((var(--slider-position) - 0.5) * -6px + 2px),
          6px
        );
      }
      75% {
        transform: translate(
          calc((var(--slider-position) - 0.5) * -6px + 2px),
          6px
        );
      }
      77% {
        transform: translate(0, 0);
      }
    }
    @keyframes lookR {
      0% {
        transform: translate(0, 0);
      }
      2% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px - 2px), 6px);
      }
      8% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px - 2px), 6px);
      }
      10% {
        transform: translate(0, 0);
      }
      52% {
        transform: translate(0, 0);
      }
      54% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px - 2px), 6px);
      }
      62% {
        transform: translate(calc((var(--slider-position) - 0.5) * 6px - 2px), 6px);
      }
      65% {
        transform: translate(
          calc((var(--slider-position) - 0.5) * -6px - 2px),
          6px
        );
      }
      75% {
        transform: translate(
          calc((var(--slider-position) - 0.5) * -6px - 2px),
          6px
        );
      }
      77% {
        transform: translate(0, 0);
      }
    }
    figure {
      width: 100%;
      height: 100%;
      max-height: 400px;
      margin: 0 auto 2rem;
      align-self: stretch;
      justify-self: stretch;
      flex: 1 auto;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    svg.Hideous {
      animation: shake 1s linear infinite;
    }
    .mouth,
    .eyeR,
    .eyeL {
      stroke: black;
      stroke-width: 3px;
      stroke-linecap: round;
    }
    .eyeR,
    .eyeL {
      fill: white;
    }
    .pupilR,
    .pupilL {
      fill: black;
    }
    .pupilR {
      animation: lookR 6s infinite 2s;
    }
    .pupilL {
      animation: lookL 6s infinite 2s;
    }
    .isActive .pupilR,
    .isActive .pupilL {
      animation: none;
    }
    .isActive .pupilR {
      transform: translate(calc((var(--slider-position) - 0.5) * 6px - 2px), 6px);
    }
    .isActive .pupilL {
      transform: translate(calc((var(--slider-position) - 0.5) * 6px + 2px), 6px);
    }
    .mouth {
      fill: none;
    }
  </style>
  
  <figure>
    <svg
      class={stateData[stateIndex].name + ' ' + (isActive ? ' isActive' : '')}
      viewbox="0 0 198 198"
      preserveAspectRatio=xMidYMid
    >
      {#each pathNames as name}
        <path
          class={name}
          d={pathData[name]}
          vector-effect=non-scaling-stroke
        />
      {/each}
    </svg>
  </figure>
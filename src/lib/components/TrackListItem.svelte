<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import lottie, { type AnimationItem } from "lottie-web";
  import animData from "$lib/assets/add-item-animation.json";
  import type { TrackResult } from "$lib/api/qobuz";

  export let track: TrackResult;
  export let clickedId: string | null = null;
  export let queued = false;
  export let onAdd: ((track: TrackResult) => void) | null = null;
  export let onRemove: ((track: TrackResult) => void) | null = null;

  let pressed = false;
  let pressTimeout: ReturnType<typeof setTimeout> | null = null;
  let lottieContainer: HTMLSpanElement | null = null;
  let animation: AnimationItem | null = null;
  let lastQueued = queued;
  let lottieReady = false;

  type LottieAnimationData = {
    layers?: Array<{ op?: number }>;
  };

  const getLastVisibleFrame = (data: LottieAnimationData) => {
    const layerOps = data.layers
      ?.map((layer) => layer.op)
      .filter((op): op is number => typeof op === "number");
    if (!layerOps?.length) return 0;
    return Math.max(0, Math.max(...layerOps) - 1);
  };

  const lastVisibleFrame = getLastVisibleFrame(animData as LottieAnimationData);
  const segmentEndFrame = Math.max(1, lastVisibleFrame + 1);

  const handleClick = () => {
    pressed = true;
    if (pressTimeout) clearTimeout(pressTimeout);
    pressTimeout = setTimeout(() => {
      pressed = false;
    }, 220);

    if (queued && onRemove) {
      onRemove(track);
      return;
    }
    if (!queued && onAdd) {
      onAdd(track);
    }
  };

  const setStaticFrame = () => {
    if (!animation) return;
    animation.goToAndStop(queued ? lastVisibleFrame : 0, true);
    lottieReady = true;
  };

  onMount(() => {
    if (!lottieContainer) return;
    animation = lottie.loadAnimation({
      container: lottieContainer,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: animData,
    });

    animation.addEventListener("DOMLoaded", setStaticFrame);
    animation.addEventListener("data_ready", setStaticFrame);
    animation.addEventListener("complete", setStaticFrame);

    return () => {
      animation?.destroy();
      animation = null;
    };
  });

  $: if (animation && queued !== lastQueued) {
    const segment = (queued ? [0, segmentEndFrame] : [segmentEndFrame, 0]) as [
      number,
      number,
    ];
    animation.playSegments(segment, true);
    lastQueued = queued;
  }

  onDestroy(() => {
    if (pressTimeout) clearTimeout(pressTimeout);
    animation?.destroy();
  });
</script>

<article class="item" role="listitem">
  {#if track.cover}
    <img
      class="thumb"
      src={track.cover}
      alt={`Album art for ${track.title}`}
      loading="lazy"
    />
  {:else}
    <div class="thumb" aria-hidden="true"></div>
  {/if}
  <div class="meta">
    <p class="name">{track.title}</p>
    <p class="artist">{track.artist}{track.album ? ` - ${track.album}` : ""}</p>
  </div>
  {#if onAdd || onRemove}
    <button
      class="cta"
      class:cta-clicked={clickedId === track.id}
      class:cta-pressed={pressed}
      type="button"
      on:click={handleClick}
      aria-label={queued ? "Remove from queue" : "Add to queue"}
    >
      <span class="sr-only"
        >{queued ? "Remove from queue" : "Add to queue"}</span
      >
      <span class:cta-fallback-hidden={lottieReady} class="cta-fallback"
        >{queued ? "-" : "+"}</span
      >
      <span class="cta-lottie" bind:this={lottieContainer}></span>
    </button>
  {/if}
</article>

<script lang="ts">
  import TrackListItem from './TrackListItem.svelte';
  import type { TrackResult } from '$lib/api/qobuz';

  export let items: TrackResult[] = [];
  export let clickedId: string | null = null;
  export let queuedIds: Set<string> | string[] = [];
  export let onAdd: ((track: TrackResult) => void) | null = null;
  export let onRemove: ((track: TrackResult) => void) | null = null;
  export let getKey: (track: TrackResult, index: number) => string | number = (track) => track.id;

  $: queuedSet = queuedIds instanceof Set ? queuedIds : new Set(queuedIds);
</script>

<div class="list" role="list">
  {#each items as track, index (getKey(track, index))}
    <TrackListItem
      track={track}
      clickedId={clickedId}
      queued={queuedSet.has(track.id)}
      onAdd={onAdd}
      onRemove={onRemove}
    />
  {/each}
</div>

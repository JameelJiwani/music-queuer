<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { searchTracks, type TrackResult } from '$lib/api/qobuz';
  import { addQueueItem, fetchQueue, removeQueueItem, type QueueItem } from '$lib/api/queue';
  import TrackList from '$lib/components/TrackList.svelte';

  const PAGE_SIZE = 20;

  let query = '';
  let tracks: TrackResult[] = [];
  let queue: QueueItem[] = [];
  let view: 'search' | 'queue' = 'search';
  let lastView: 'search' | 'queue' = 'search';
  let queueLoading = false;
  let queueError = '';
  let total = 0;
  let loading = false;
  let error = '';
  let hasMore = false;
  let sentinel: HTMLDivElement | null = null;
  let debounceHandle: ReturnType<typeof setTimeout> | null = null;
  let clickedId: string | null = null;
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;
  const queueKey = (track: TrackResult, index: number) => `${track.id}-${index}`;
  $: queuedIds = queue.map((item) => item.id);

  const fetchTracks = async (reset = false) => {
    if (!query.trim()) {
      tracks = [];
      total = 0;
      hasMore = false;
      return;
    }

    if (loading) return;

    loading = true;
    error = '';

    try {
      const offset = reset ? 0 : tracks.length;
      const { items, total: nextTotal } = await searchTracks(query, offset, PAGE_SIZE);
      tracks = reset ? items : [...tracks, ...items];
      total = nextTotal;
      hasMore = tracks.length < total;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong while searching.';
      if (reset) {
        tracks = [];
        total = 0;
        hasMore = false;
      }
    } finally {
      loading = false;
    }
  };

  const loadQueue = async (silent = false) => {
    if (queueLoading) return;
    queueLoading = true;
    if (!silent) queueError = '';
    try {
      queue = await fetchQueue();
    } catch (err) {
      if (!silent) {
        queueError = err instanceof Error ? err.message : 'Failed to load the queue.';
      }
    } finally {
      queueLoading = false;
    }
  };

  const addToQueue = async (track: TrackResult) => {
    try {
      const item = await addQueueItem(track);
      queue = [...queue, item];
    } catch (err) {
      queueError = err instanceof Error ? err.message : 'Failed to add song to the queue.';
      return;
    }

    clickedId = null;
    await tick();
    clickedId = track.id;
    if (clickTimeout) clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      if (clickedId === track.id) clickedId = null;
    }, 320);
  };

  const removeFromQueue = async (track: TrackResult) => {
    const item = queue.find((queued) => queued.id === track.id);
    if (!item) return;

    try {
      await removeQueueItem(item);
      queue = queue.filter((queued) => queued.queued_id !== item.queued_id);
    } catch (err) {
      queueError = err instanceof Error ? err.message : 'Failed to remove song from the queue.';
    }
  };

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    query = target?.value ?? '';
    if (debounceHandle) {
      clearTimeout(debounceHandle);
    }
    debounceHandle = setTimeout(() => fetchTracks(true), 350);
  };

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            fetchTracks(false);
          }
        });
      },
      { threshold: 0.8 }
    );

    if (sentinel) observer.observe(sentinel);
    loadQueue(true);
    return () => observer.disconnect();
  });

  $: if (view !== lastView) async () =>   {
    if (view === 'queue') {
      await loadQueue();
    }
    lastView = view;
  };
</script>

<main class="page">
  <section class="card header">
    <div class="header-main">
      <div class="logo">MQ</div>
      <div class="title-block">
        <p class="title">Music Queue</p>
        <p class="subtitle">Search your backend and keep scrolling to load more.</p>
      </div>
    </div>
    <button class="queue-button" type="button" on:click={() => (view = 'queue')} aria-label="Open queue">
      <span>Queue</span>
      <span class="queue-count">{queue.length}</span>
    </button>
  </section>

  {#if view === 'queue'}
    <section class="card queue-card">
      <div class="queue-header">
        <div>
          <p class="queue-title">Queued songs</p>
          <p class="subtitle">Ready when you are.</p>
        </div>
        <button class="ghost-button" type="button" on:click={() => (view = 'search')}>Back to search</button>
      </div>

      {#if queueError}
        <div class="error">{queueError}</div>
      {:else if queueLoading}
        <div class="loading">Loading queue...</div>
      {:else if queue.length}
        <TrackList items={queue} getKey={queueKey} queuedIds={queuedIds} />
      {:else}
        <div class="empty">No songs queued yet. Add some from search.</div>
      {/if}
    </section>
  {:else}
    <section class="card search-bar">
      <input
        class="search-input"
        placeholder="Search songs, artists, albums..."
        value={query}
        on:input={handleInput}
        aria-label="Search tracks"
        autocomplete="off"
      />
      <span class="pill">Live</span>
    </section>

    <section class="card">
      {#if error}
        <div class="error">{error}</div>
      {:else if !tracks.length && query.trim() && !loading}
        <div class="empty">No results yet. Try refining your search.</div>
      {:else if !tracks.length && !query.trim()}
        <div class="empty">Start typing to find songs from your backend.</div>
      {:else}
        <TrackList
          items={tracks}
          onAdd={addToQueue}
          onRemove={removeFromQueue}
          clickedId={clickedId}
          queuedIds={queuedIds}
        />
      {/if}

      {#if loading}
        <div class="loading">Fetching songs...</div>
      {/if}
      <div class="sentinel" bind:this={sentinel}></div>
    </section>
  {/if}
</main>

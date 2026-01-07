<script>
  import { onMount } from 'svelte';
  import { searchTracks } from '$lib/api/qobuz.js';

  const PAGE_SIZE = 20;

  let query = '';
  let tracks = [];
  let total = 0;
  let loading = false;
  let error = '';
  let hasMore = false;
  let sentinel;
  let debounceHandle;

  async function fetchTracks(reset = false) {
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
      error = err?.message ?? 'Something went wrong while searching.';
      if (reset) {
        tracks = [];
        total = 0;
        hasMore = false;
      }
    } finally {
      loading = false;
    }
  }

  function handleInput(event) {
    query = event.target.value;
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => fetchTracks(true), 350);
  }

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
    return () => observer.disconnect();
  });
</script>

<main class="page">
  <section class="card header">
    <div class="logo">MQ</div>
    <div class="title-block">
      <p class="title">Music Queue</p>
      <p class="subtitle">Search your backend and keep scrolling to load more.</p>
    </div>
  </section>

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
      <div class="list" role="list">
        {#each tracks as track (track.id)}
          <article class="item" role="listitem">
            {#if track.cover}
              <img class="thumb" src={track.cover} alt={`Album art for ${track.title}`} loading="lazy" />
            {:else}
              <div class="thumb" aria-hidden="true"></div>
            {/if}
            <div class="meta">
              <p class="name">{track.title}</p>
              <p class="artist">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
            </div>
            <div class="cta">+</div>
          </article>
        {/each}
      </div>
    {/if}

    {#if loading}
      <div class="loading">Fetching songs...</div>
    {/if}
    <div class="sentinel" bind:this={sentinel}></div>
  </section>
</main>


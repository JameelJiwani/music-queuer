/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8080';
const DEFAULT_LIMIT = 20;

export async function searchTracks(query, offset = 0, limit = DEFAULT_LIMIT) {
  if (!query?.trim()) {
    return { items: [], total: 0 };
  }

  const params = new URLSearchParams({
    q: query.trim(),
    offset: String(offset),
    limit: String(limit)
  });

  const url = `${API_BASE}/search?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Failed to reach the search backend.');
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? data.total : items.length;

  // Normalize defensively in case backend omits fields
  const normalized = items.map((track) => ({
    id: track.id || (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    title: track.title || 'Unknown title',
    artist: track.artist || 'Unknown artist',
    album: track.album,
    cover: track.cover
  }));

  return { items: normalized, total };
}


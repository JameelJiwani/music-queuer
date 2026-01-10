/// <reference types="vite/client" />

export type TrackResult = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  cover?: string | null;
};

export type SearchResponse = {
  items: TrackResult[];
  total: number;
};

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8080';
const DEFAULT_LIMIT = 20;

export const searchTracks = async (
  query: string,
  offset = 0,
  limit = DEFAULT_LIMIT
): Promise<SearchResponse> => {
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

  const data = (await res.json()) as { items?: TrackResult[]; total?: number };
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? (data.total as number) : items.length;

  const normalized = items.map((track) => ({
    id: track.id || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    title: track.title || 'Unknown title',
    artist: track.artist || 'Unknown artist',
    album: track.album ?? undefined,
    cover: track.cover ?? undefined
  }));

  return { items: normalized, total };
}

import type { TrackResult } from './qobuz';

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8080';

export type QueueItem = TrackResult & {
  queued_id: number;
  created_at: string;
};

export async function fetchQueue(): Promise<QueueItem[]> {
  const res = await fetch(`${API_BASE}/queue`);
  if (!res.ok) {
    throw new Error('Failed to load queued songs.');
  }

  const data = (await res.json()) as { items?: QueueItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function addQueueItem(track: TrackResult): Promise<QueueItem> {
  const res = await fetch(`${API_BASE}/queue/add`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover
    })
  });

  if (!res.ok) {
    throw new Error('Failed to add song to the queue.');
  }

  const data = (await res.json()) as { item?: QueueItem };
  if (!data.item) {
    throw new Error('Queue response was missing the queued song.');
  }

  return data.item;
}

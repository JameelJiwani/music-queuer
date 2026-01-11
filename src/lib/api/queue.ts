import type { TrackResult } from './qobuz';

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8080';

export type QueueItem = TrackResult & {
  queued_id: number;
  created_at: string;
  queue_id: number;
};

export type QueueRef = {
  id?: number;
  code?: string;
  name?: string;
};

export type QueueInfo = {
  id: number;
  code: string;
  name: string;
};

export type QueueResponse = {
  items: QueueItem[];
  queue: QueueInfo;
};

const buildQueueParams = (queue?: QueueRef): string => {
  if (!queue) return '';
  const params = new URLSearchParams();
  if (queue.id) params.set('queue_id', String(queue.id));
  if (queue.code) params.set('code', queue.code);
  if (!queue.id && !queue.code && queue.name) params.set('queue', queue.name);
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const fetchQueue = async (queue?: QueueRef): Promise<QueueResponse> => {
  const res = await fetch(`${API_BASE}/queue${buildQueueParams(queue)}`);
  if (!res.ok) {
    throw new Error('Failed to load queued songs.');
  }

  const data = (await res.json()) as {
    items?: QueueItem[];
    queue_id?: number;
    code?: string;
    name?: string;
  };

  return {
    items: Array.isArray(data.items) ? data.items : [],
    queue: {
      id: data.queue_id ?? queue?.id ?? 0,
      code: data.code ?? queue?.code ?? '',
      name: data.name ?? queue?.name ?? 'Queue',
    },
  };
};

export const addQueueItem = async (track: TrackResult, queue?: QueueRef): Promise<QueueItem> => {
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
      cover: track.cover,
      queue_id: queue?.id,
      queue: queue?.name
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

export const removeQueueItem = async (item: QueueItem | TrackResult, queue?: QueueRef): Promise<void> => {
  const res = await fetch(`${API_BASE}/queue/remove`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      queued_id: 'queued_id' in item ? item.queued_id : undefined,
      track_id: item.id,
      queue_id: queue?.id,
      queue: queue?.name
    })
  });

  if (!res.ok) {
    throw new Error('Failed to remove song from the queue.');
  }
};

export const createQueue = async (name?: string): Promise<QueueInfo> => {
  const res = await fetch(`${API_BASE}/queue/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error('Failed to create a queue.');
  }

  const data = (await res.json()) as QueueInfo & { queue_id?: number };
  const id = data.id ?? data.queue_id;
  if (!id || !data?.code) {
    throw new Error('Queue creation response was missing data.');
  }
  return { id, code: data.code, name: data.name };
};

export type QueueStreamEvent =
  | { type: 'init'; queue_id: number; code: string; name: string }
  | { type: 'add'; queue_id: number; item: QueueItem }
  | { type: 'remove'; queue_id: number; queued_id: number };

export const subscribeQueue = (queue: QueueRef | undefined, onEvent: (event: QueueStreamEvent) => void): EventSource => {
  const source = new EventSource(`${API_BASE}/queue/stream${buildQueueParams(queue)}`);
  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data) as QueueStreamEvent;
      onEvent(parsed);
    } catch (err) {
      console.error('Failed to parse queue stream event', err);
    }
  };
  return source;
};

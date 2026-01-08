from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_http_methods
from django.conf import settings
from .models import Queue, Song
import httpx
import uuid
import json

API_BASE = "https://www.qobuz.com/api.json/0.2"
DEFAULT_LIMIT = 20
MAX_LIMIT = 200


def _safe_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _normalize_track(track: dict) -> dict:
    album = track.get("album") or {}
    image = track.get("image") or {}
    album_image = album.get("image") or {}

    cover = (
        album_image.get("small")
        or album.get("cover")
        or image.get("small")
        or track.get("cover_url")
    )

    track_id = track.get("id")
    artist = (track.get("artist") or {}).get("name")
    performer = (track.get("performer") or {}).get("name")

    return {
        "id": str(track_id) if track_id is not None else str(uuid.uuid4()),
        "title": track.get("title") or "Unknown title",
        "artist": artist or performer or "Unknown artist",
        "album": album.get("title"),
        "cover": cover,
    }


def _serialize_queue_item(item: Song) -> dict:
    return {
        "id": item.track_id,
        "title": item.title,
        "artist": item.artist,
        "album": item.album,
        "cover": item.cover,
        "queued_id": item.id,
        "created_at": item.created_at.isoformat(),
        "queue_id": item.queue_id,
    }


def _get_queue(request, payload: dict | None = None) -> Queue:
    queue_id = request.GET.get("queue_id") if request else None
    if not queue_id and payload:
        queue_id = payload.get("queue_id")
    if queue_id:
        return Queue.objects.get(id=queue_id)

    queue_name = request.GET.get("queue") if request else None
    if not queue_name and payload:
        queue_name = payload.get("queue")
    queue_name = (queue_name or "Default").strip() or "Default"
    queue, _ = Queue.objects.get_or_create(name=queue_name)
    return queue


@require_GET
def health(_: object) -> HttpResponse:
    return HttpResponse("ok")


@require_GET
def search(request) -> JsonResponse:
    query = request.GET.get("q") or request.GET.get("query")
    if not query or not query.strip():
        return JsonResponse({"error": "Missing 'q' query parameter."}, status=400)

    limit = _safe_int(request.GET.get("limit"), DEFAULT_LIMIT)
    offset = _safe_int(request.GET.get("offset"), 0)

    limit = max(1, min(limit, MAX_LIMIT))
    offset = max(0, offset)

    try:
        response = httpx.get(
            f"{API_BASE}/search/getResults",
            params={
                "app_id": settings.QOBUZ_APP_ID,
                "query": query.strip(),
                "limit": str(limit),
                "offset": str(offset),
            },
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"Accept": "application/json"},
        )
    except httpx.HTTPError:
        return JsonResponse({"error": "Qobuz request failed: Qobuz request failed"}, status=502)

    if response.status_code < 200 or response.status_code >= 300:
        return JsonResponse(
            {"error": f"Qobuz request failed: Qobuz responded with {response.status_code}"},
            status=502,
        )

    payload = response.json()
    tracks_section = payload.get("tracks") or {}
    items = tracks_section.get("items") or []
    total = tracks_section.get("total") or len(items)

    normalized = [_normalize_track(track) for track in items]
    return JsonResponse({"items": normalized, "total": total})


@require_GET
def queue_list(request) -> JsonResponse:
    queue = _get_queue(request)
    items = queue.songs.all()
    return JsonResponse({"items": [_serialize_queue_item(item) for item in items], "queue_id": queue.id})


@require_http_methods(["POST"])
def queue_add(request) -> JsonResponse:
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    queue = _get_queue(request, payload)
    title = (payload.get("title") or "").strip()
    artist = (payload.get("artist") or "").strip()
    if not title or not artist:
        return JsonResponse({"error": "Both 'title' and 'artist' are required."}, status=400)

    track_id = (payload.get("id") or payload.get("track_id") or str(uuid.uuid4())).strip()
    album = (payload.get("album") or "").strip() or None
    cover = (payload.get("cover") or "").strip() or None

    item = Song.objects.create(
        queue=queue,
        track_id=track_id,
        title=title,
        artist=artist,
        album=album,
        cover=cover,
    )

    return JsonResponse({"item": _serialize_queue_item(item), "queue_id": queue.id}, status=201)

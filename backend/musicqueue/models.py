from __future__ import annotations

import secrets
import string

from django.db import models


def generate_queue_code(length: int = 8) -> str:
    """Generate a short, URL-safe code for sharing queues."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Queue(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=12, unique=True, default=generate_queue_code, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Song(models.Model):
    queue = models.ForeignKey(Queue, related_name="songs", on_delete=models.CASCADE)
    track_id = models.CharField(max_length=128)
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255, blank=True, null=True)
    cover = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

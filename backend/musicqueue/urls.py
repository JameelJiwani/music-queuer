from django.urls import path
from . import views

urlpatterns = [
    path("health", views.health),
    path("search", views.search),
    path("queue", views.queue_list),
    path("queue/add", views.queue_add),
    path("queue/remove", views.queue_remove),
]

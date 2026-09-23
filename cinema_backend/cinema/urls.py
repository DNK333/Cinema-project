from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MovieViewSet, SessionViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = router.urls

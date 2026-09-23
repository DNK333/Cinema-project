from django.db import IntegrityError
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Movie, Session, Ticket
from .serializers import MovieSerializer, SessionSerializer, TicketSerializer


class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().order_by('id')
    serializer_class = MovieSerializer


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related('movie').all().order_by('date', 'time')
    serializer_class = SessionSerializer

    @action(detail=False, methods=['get'])
    def by_movie(self, request):
        movie_id = request.query_params.get('movie_id')
        if movie_id:
            sessions = self.queryset.filter(movie_id=movie_id)
            serializer = self.get_serializer(sessions, many=True)
            return Response(serializer.data)
        return Response([], status=status.HTTP_200_OK)


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related('session__movie').all().order_by('-created_at')
    serializer_class = TicketSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            ticket = serializer.save()
            return Response(self.get_serializer(ticket).data, status=status.HTTP_201_CREATED)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'detail': 'This seat is already taken for this session.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            if 'unique_session_row_seat' in str(exc):
                return Response({'detail': 'This seat is already taken for this session.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            ticket = serializer.save()
            return Response(self.get_serializer(ticket).data)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'detail': 'This seat is already taken for this session.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            if 'unique_session_row_seat' in str(exc):
                return Response({'detail': 'This seat is already taken for this session.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def occupied(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response([], status=status.HTTP_200_OK)

        occupied = Ticket.objects.filter(session_id=session_id).values_list('row', 'seat')
        return Response([{'row': row, 'seat': seat} for row, seat in occupied])

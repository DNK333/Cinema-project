from rest_framework import serializers

from .models import Movie, Session, Ticket


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = '__all__'


class SessionSerializer(serializers.ModelSerializer):
    movie = serializers.PrimaryKeyRelatedField(queryset=Movie.objects.all())
    movie_title = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = ['id', 'movie', 'movie_title', 'date', 'time']

    def get_movie_title(self, obj):
        return obj.movie.title


class TicketSerializer(serializers.ModelSerializer):
    session = serializers.PrimaryKeyRelatedField(queryset=Session.objects.all())
    movie_title = serializers.SerializerMethodField()
    session_time = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ['id', 'session', 'movie_title', 'session_time', 'customer_name', 'row', 'seat', 'price', 'created_at']

    def validate(self, attrs):
        session = attrs.get('session')
        row = attrs.get('row')
        seat = attrs.get('seat')

        if session is not None and row is not None and seat is not None:
            queryset = Ticket.objects.filter(session=session, row=row, seat=seat)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({'detail': 'This seat is already taken for this session.'})

        return attrs

    def get_movie_title(self, obj):
        return obj.session.movie.title

    def get_session_time(self, obj):
        return f"{obj.session.date} {obj.session.time}"

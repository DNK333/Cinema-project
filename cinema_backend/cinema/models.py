from django.core.exceptions import ValidationError
from django.db import models


class Movie(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    genre = models.CharField(max_length=100)
    duration = models.IntegerField()
    age_rating = models.CharField(max_length=50)

    def __str__(self):
        return self.title


class Session(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    time = models.TimeField()

    class Meta:
        ordering = ['date', 'time']

    def __str__(self):
        return f'{self.movie.title} - {self.date} {self.time}'


class Ticket(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='tickets')
    customer_name = models.CharField(max_length=200)
    row = models.PositiveIntegerField()
    seat = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['session', 'row', 'seat'], name='unique_session_row_seat')
        ]

    def clean(self):
        if not (1 <= self.row <= 5):
            raise ValidationError('Row must be between 1 and 5.')
        if not (1 <= self.seat <= 6):
            raise ValidationError('Seat must be between 1 and 6.')

    def __str__(self):
        return f'{self.session} - Row {self.row}, Seat {self.seat}'

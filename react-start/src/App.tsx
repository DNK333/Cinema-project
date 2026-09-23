import { type FormEvent, useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

type Movie = {
  id: number
  title: string
  description: string
  genre: string
  duration: number
  age_rating: string
}

type Session = {
  id: number
  movie: number
  movie_title: string
  date: string
  time: string
}

type SeatPosition = {
  row: number
  seat: number
}

type Ticket = {
  id: number
  session: number
  customer_name: string
  row: number
  seat: number
  price: number | string
  movie_title: string
  session_time: string
  created_at: string
}

const API_BASE = 'http://127.0.0.1:8000/api'
const ROWS = 5
const SEATS_PER_ROW = 6
const TICKET_PRICE = 2500

function App() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [occupiedSeats, setOccupiedSeats] = useState<SeatPosition[]>([])
  const [selectedSeat, setSelectedSeat] = useState<SeatPosition | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedMovie = movies.find((movie) => movie.id === selectedMovieId) ?? null
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null

  const isSeatOccupied = (row: number, seat: number) =>
    occupiedSeats.some((position) => position.row === row && position.seat === seat)

  const isSeatSelected = (row: number, seat: number) =>
    selectedSeat?.row === row && selectedSeat?.seat === seat

  useEffect(() => {
    void loadMovies()
    void loadAllSessions()
    void loadTickets()
  }, [])

  useEffect(() => {
    if (!selectedMovieId) {
      setSessions([])
      setSelectedSessionId(null)
      setSelectedSeat(null)
      return
    }

    void loadSessions(selectedMovieId)
  }, [selectedMovieId])

  useEffect(() => {
    if (!selectedSessionId) {
      setOccupiedSeats([])
      return
    }

    void loadOccupiedSeats(selectedSessionId)
  }, [selectedSessionId])

  const loadMovies = async () => {
    const { data } = await axios.get<Movie[]>(`${API_BASE}/movies/`)
    setMovies(data)
  }

  const loadAllSessions = async () => {
    const { data } = await axios.get<Session[]>(`${API_BASE}/sessions/`)
    setAllSessions(data)
  }

  const loadSessions = async (movieId: number) => {
    const { data } = await axios.get<Session[]>(`${API_BASE}/sessions/by_movie/?movie_id=${movieId}`)
    setSessions(data)
    setSelectedSessionId(null)
    setSelectedSeat(null)
    setCustomerName('')
    setEditingTicketId(null)
  }

  const loadOccupiedSeats = async (sessionId: number) => {
    const { data } = await axios.get<SeatPosition[]>(`${API_BASE}/tickets/occupied/?session_id=${sessionId}`)
    setOccupiedSeats(data)

    if (selectedSeat && isSeatOccupied(selectedSeat.row, selectedSeat.seat)) {
      setSelectedSeat(null)
    }
  }

  const loadTickets = async () => {
    const { data } = await axios.get<Ticket[]>(`${API_BASE}/tickets/`)
    setTickets(data)
  }

  const handleSeatClick = (row: number, seat: number) => {
    if (isSeatOccupied(row, seat)) {
      return
    }

    setSelectedSeat({ row, seat })
    setErrorMessage('')
  }

  const handlePurchase = async (event: FormEvent) => {
    event.preventDefault()

    if (!selectedSessionId || !selectedSeat) {
      setErrorMessage('Сначала выберите свободное место.')
      return
    }

    if (!customerName.trim()) {
      setErrorMessage('Укажите имя покупателя.')
      return
    }

    const payload = {
      session: selectedSessionId,
      customer_name: customerName.trim(),
      row: selectedSeat.row,
      seat: selectedSeat.seat,
      price: TICKET_PRICE,
    }

    try {
      if (editingTicketId) {
        await axios.put(`${API_BASE}/tickets/${editingTicketId}/`, payload)
        setSuccessMessage('Билет успешно изменён.')
      } else {
        await axios.post(`${API_BASE}/tickets/`, payload)
        setSuccessMessage('Билет успешно куплен.')
      }

      setCustomerName('')
      setSelectedSeat(null)
      setEditingTicketId(null)
      setErrorMessage('')
      await loadTickets()
      if (selectedSessionId) {
        await loadOccupiedSeats(selectedSessionId)
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(error.response.data?.detail ?? 'Не удалось сохранить билет.')
      } else {
        setErrorMessage('Не удалось сохранить билет.')
      }
    }
  }

  const handleDeleteTicket = async (ticketId: number) => {
    try {
      await axios.delete(`${API_BASE}/tickets/${ticketId}/`)
      setSuccessMessage('Билет удалён.')
      setErrorMessage('')
      await loadTickets()
      if (selectedSessionId) {
        await loadOccupiedSeats(selectedSessionId)
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(error.response.data?.detail ?? 'Не удалось удалить билет.')
      } else {
        setErrorMessage('Не удалось удалить билет.')
      }
    }
  }

  const handleEditTicket = async (ticket: Ticket) => {
    const relatedSession = allSessions.find((session) => session.id === ticket.session)
    if (!relatedSession) {
      setErrorMessage('Сеанс для этого билета не найден.')
      return
    }

    setSelectedMovieId(relatedSession.movie)
    setSelectedSessionId(ticket.session)
    setSelectedSeat({ row: ticket.row, seat: ticket.seat })
    setCustomerName(ticket.customer_name)
    setEditingTicketId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Cinema booking</p>
          <h1>Кинотеатр</h1>
        </div>
      </header>

      <div className="content-grid">
        <main className="panel">
          {!selectedMovie && (
            <section>
              <h2>Фильмы</h2>
              <div className="movie-list">
                {movies.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="movie-card"
                    onClick={() => setSelectedMovieId(movie.id)}
                  >
                    <span className="movie-title">{movie.title}</span>
                    <span>{movie.genre}</span>
                    <span>{movie.duration} мин</span>
                    <span>{movie.age_rating}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedMovie && !selectedSession && (
            <section>
              <div className="section-header">
                <button type="button" className="back-link" onClick={() => setSelectedMovieId(null)}>
                  Назад к фильмам
                </button>
              </div>
              <h2>{selectedMovie.title}</h2>
              <p>{selectedMovie.description}</p>
              <div className="movie-meta">
                <span>{selectedMovie.genre}</span>
                <span>{selectedMovie.duration} мин</span>
                <span>{selectedMovie.age_rating}</span>
              </div>

              <div className="session-list">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className="session-card"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <strong>{session.date}</strong>
                    <span>{session.time}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedMovie && selectedSession && (
            <section>
              <div className="section-header">
                <button type="button" className="back-link" onClick={() => setSelectedSessionId(null)}>
                  ← Выбор сеанса
                </button>
              </div>

              <h2>{selectedMovie.title}</h2>
              <p className="film-session">
                {selectedSession.date} · {selectedSession.time}
              </p>

              <div className="screen-wrapper">
                <div className="screen-top"></div>
                <div className="screen-label">ЭКРАН</div>
              </div>

              <div className="seat-map" aria-label="Seat map">
                <div className="seat-map-header">
                  <span className="row-label">Ряд</span>
                  {Array.from({ length: SEATS_PER_ROW }, (_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>

                {Array.from({ length: ROWS }, (_, rowIndex) => (
                  <div key={rowIndex} className="seat-row">
                    <span className="row-label">Ряд {rowIndex + 1}</span>
                    {Array.from({ length: SEATS_PER_ROW }, (_, seatIndex) => {
                      const row = rowIndex + 1
                      const seat = seatIndex + 1
                      const occupied = isSeatOccupied(row, seat)
                      const selected = isSeatSelected(row, seat)

                      return (
                        <button
                          key={`${row}-${seat}`}
                          type="button"
                          className={`seat ${occupied ? 'occupied' : ''} ${selected ? 'selected' : ''}`}
                          disabled={occupied}
                          onClick={() => handleSeatClick(row, seat)}
                          aria-label={`Ряд ${row}, место ${seat}`}
                        >
                          {seat}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="hall-summary">Всего: 5 рядов × 6 мест = 30 мест</div>

              <div className="legend">
                <span><i className="legend-dot free" /> Свободно</span>
                <span><i className="legend-dot busy" /> Занято</span>
                <span><i className="legend-dot selected" /> Выбрано</span>
              </div>

              {selectedSeat && (
                <form className="booking-form" onSubmit={handlePurchase}>
                  <h3>Выбрано:</h3>
                  <p>Ряд: {selectedSeat.row}</p>
                  <p>Место: {selectedSeat.seat}</p>
                  <p>Цена: {TICKET_PRICE} ₸</p>

                  <label>
                    Имя покупателя
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Введите имя"
                    />
                  </label>

                  <button type="submit" className="primary-button">
                    {editingTicketId ? 'Сохранить изменения' : 'Купить билет'}
                  </button>
                </form>
              )}
            </section>
          )}
        </main>

        <aside className="panel sidebar">
          <h2>Мои билеты</h2>

          {errorMessage && <div className="alert error">{errorMessage}</div>}
          {successMessage && <div className="alert success">{successMessage}</div>}

          {tickets.length === 0 ? (
            <p>Пока нет купленных билетов.</p>
          ) : (
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="ticket-item">
                  <div>
                    <strong>{ticket.movie_title}</strong>
                    <p>{ticket.session_time}</p>
                    <p>
                      {ticket.customer_name} · ряд {ticket.row}, место {ticket.seat}
                    </p>
                    <p>Цена: {Number(ticket.price ?? TICKET_PRICE)} ₸</p>
                  </div>

                  <div className="ticket-actions">
                    <button type="button" onClick={() => handleEditTicket(ticket)}>
                      Изменить
                    </button>
                    <button type="button" className="danger-button" onClick={() => handleDeleteTicket(ticket.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Trip = { id: string; name: string; created_at?: string }
type Participant = { id: string; name: string }

type Props = {
  role: 'user' | 'admin'
  onLoginSuccess: () => Promise<void> | void
  onLogout: () => void
}

export function AdminPage({ role, onLoginSuccess, onLogout }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string>('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tripName, setTripName] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isAdmin = role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadTrips()
    }
  }, [isAdmin])

  useEffect(() => {
    if (selectedTripId) loadParticipants(selectedTripId)
  }, [selectedTripId])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      setAuthError('관리자 로그인에 실패했습니다.')
      setAuthLoading(false)
      return
    }
    await onLoginSuccess()
    setAuthLoading(false)
  }

  async function loadTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      setMessage('여행 목록을 불러오지 못했습니다.')
      return
    }
    setTrips(data || [])
    if (data && data.length > 0) setSelectedTripId(data[0].id)
  }

  async function loadParticipants(tripId: string) {
    const { data, error } = await supabase
      .from('participants')
      .select('id, name')
      .eq('trip_id', tripId)
      .order('name')
    if (error) {
      setMessage('참여자 목록을 불러오지 못했습니다.')
      return
    }
    setParticipants(data || [])
  }

  async function addTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!tripName.trim()) return
    setBusy(true)
    const { error } = await supabase.from('trips').insert({ name: tripName.trim() })
    if (error) setMessage('여행 추가에 실패했습니다.')
    else {
      setTripName('')
      await loadTrips()
      setMessage('여행을 추가했습니다.')
    }
    setBusy(false)
  }

  async function deleteTrip(id: string) {
    setBusy(true)
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) setMessage('여행 삭제에 실패했습니다.')
    else {
      await loadTrips()
      setParticipants([])
      setMessage('여행을 삭제했습니다.')
    }
    setBusy(false)
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTripId || !participantName.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('participants')
      .insert({ trip_id: selectedTripId, name: participantName.trim(), user_id: null })
    if (error) setMessage('참여자 추가에 실패했습니다.')
    else {
      setParticipantName('')
      await loadParticipants(selectedTripId)
      setMessage('참여자를 추가했습니다.')
    }
    setBusy(false)
  }

  async function deleteParticipant(id: string) {
    setBusy(true)
    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) setMessage('참여자 삭제에 실패했습니다.')
    else {
      await loadParticipants(selectedTripId)
      setMessage('참여자를 삭제했습니다.')
    }
    setBusy(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white/80 backdrop-blur rounded-2xl shadow-lg p-8 border border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">관리자 로그인</h1>
            <Link to="/" className="text-sky-600 hover:text-sky-800 text-sm">메인으로</Link>
          </div>
          <p className="text-sm text-gray-600 mb-4">Supabase Auth에 등록된 관리자 계정으로 로그인하세요.</p>
          <form className="space-y-3" onSubmit={handleLogin}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="관리자 이메일"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            />
            {authError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{authError}</div>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-sky-600 text-white font-semibold py-2 rounded-lg hover:bg-sky-700 disabled:bg-gray-300"
            >
              {authLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur rounded-2xl shadow-lg p-8 border border-sky-100 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">Admin</p>
            <h1 className="text-2xl font-bold text-gray-800">여행 세션 관리</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">메인으로</Link>
            <button onClick={onLogout} className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700">로그아웃</button>
          </div>
        </div>

        {message && (
          <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{message}</div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">여행 세션</h2>
            <form onSubmit={addTrip} className="flex gap-2">
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="새 여행 이름"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300"
              >
                추가
              </button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {trips.map((trip) => (
                <div key={trip.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${trip.id === selectedTripId ? 'border-sky-500 bg-sky-50' : 'border-gray-200'}`}>
                  <div>
                    <div className="font-semibold text-gray-800">{trip.name}</div>
                    <div className="text-xs text-gray-500">{trip.id.slice(0,8)}...</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTripId(trip.id)}
                      className="text-sky-600 text-sm hover:underline"
                    >선택</button>
                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="text-red-600 text-sm hover:underline"
                    >삭제</button>
                  </div>
                </div>
              ))}
              {trips.length === 0 && <div className="text-sm text-gray-500">저장된 여행 세션이 없습니다.</div>}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">참여자 (선택한 세션)</h2>
            <form onSubmit={addParticipant} className="flex gap-2">
              <input
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="참여자 이름"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={busy || !selectedTripId}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300"
              >
                추가
              </button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <span className="text-gray-800">{p.name}</span>
                  <button
                    onClick={() => deleteParticipant(p.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    삭제
                  </button>
                </div>
              ))}
              {participants.length === 0 && <div className="text-sm text-gray-500">참여자가 없습니다.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// @ts-nocheck
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpenseList } from '@/components/ExpenseList'

type Trip = { id: string; name: string; created_at?: string }
type Participant = { id: string; name: string; is_treasurer?: boolean }
type TripRow = Database['public']['Tables']['trips']['Row']
type ParticipantRow = Database['public']['Tables']['participants']['Row']
type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type ExpenseParticipantRow = Database['public']['Tables']['expense_participants']['Row']

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
  const [expenses, setExpenses] = useState<any[]>([])
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
    if (selectedTripId) loadExpenses(selectedTripId)
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
      .order('created_at', { ascending: false }) as { data: TripRow[] | null; error: any }
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
      .select('id, name, is_treasurer')
      .eq('trip_id', tripId)
      .order('name') as { data: ParticipantRow[] | null; error: any }
    if (error) {
      setMessage('참여자 목록을 불러오지 못했습니다.')
      return
    }
    setParticipants((data || []) as Participant[])
  }

  async function loadExpenses(tripId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }) as { data: ExpenseRow[] | null; error: any }
    if (error) {
      setMessage('지출 목록을 불러오지 못했습니다.')
      return
    }

    const withParticipants = await Promise.all(
      (data || []).map(async (expense) => {
        const { data: ep } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id) as { data: ExpenseParticipantRow[] | null; error: any }
        return { ...expense, participant_ids: ep?.map(e => e.participant_id) || [] }
      })
    )

    setExpenses(withParticipants)
  }

  async function addTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!tripName.trim()) return
    setBusy(true)
    const { error } = await supabase.from('trips').insert({ name: tripName.trim() } as Partial<TripRow>)
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
      .insert({ trip_id: selectedTripId, name: participantName.trim(), user_id: null } as Partial<ParticipantRow>)
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

  async function deleteExpense(id: string) {
    setBusy(true)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) setMessage('지출 삭제에 실패했습니다.')
    else {
      await loadExpenses(selectedTripId)
      setMessage('지출을 삭제했습니다.')
    }
    setBusy(false)
  }

  async function toggleTreasurer(id: string, next: boolean) {
    setBusy(true)
    const { error } = await supabase
      .from('participants')
      .update({ is_treasurer: next })
      .eq('id', id)
    if (error) setMessage('총무 변경에 실패했습니다.')
    else {
      await loadParticipants(selectedTripId)
      setMessage('총무 권한을 변경했습니다.')
    }
    setBusy(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">관리자 로그인</CardTitle>
              <CardDescription>관리자 계정으로 로그인해 세션을 관리하세요.</CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/">메인으로</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="관리자 이메일"
                />
              </div>
              <div className="space-y-2">
                <Label>비밀번호</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                />
              </div>
              {authError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{authError}</div>
              )}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-5xl bg-white/90 shadow-xl border border-orange-100">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Admin</p>
            <CardTitle className="text-2xl">여행 세션 관리</CardTitle>
            <CardDescription>세션 생성/삭제 및 참여자 관리</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/">메인으로</Link>
            </Button>
            <Button variant="default" onClick={onLogout}>로그아웃</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="text-sm text-gray-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{message}</div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="font-semibold text-gray-800">여행 세션</p>
              <form onSubmit={addTrip} className="flex gap-2">
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="새 여행 이름"
                />
                <Button type="submit" disabled={busy}>추가</Button>
              </form>

              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {trips.map((trip) => (
                  <div key={trip.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${trip.id === selectedTripId ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <div>
                      <div className="font-semibold text-gray-800">{trip.name}</div>
                      <div className="text-xs text-gray-500">{trip.id.slice(0,8)}...</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTripId(trip.id)}>선택</Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteTrip(trip.id)}>삭제</Button>
                    </div>
                  </div>
                ))}
                {trips.length === 0 && <div className="text-sm text-gray-500">저장된 여행 세션이 없습니다.</div>}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-gray-800">참여자 (선택한 세션)</p>
              <form onSubmit={addParticipant} className="flex gap-2">
                <Input
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="참여자 이름"
                />
                <Button type="submit" variant="secondary" disabled={busy || !selectedTripId}>추가</Button>
              </form>

              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 gap-2">
                    <div>
                      <span className="text-gray-800">{p.name}</span>
                      {p.is_treasurer && (
                        <span className="ml-2 text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                          총무
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTreasurer(p.id, !p.is_treasurer)}
                      >
                        {p.is_treasurer ? '총무 해제' : '총무 지정'}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteParticipant(p.id)}>
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && <div className="text-sm text-gray-500">참여자가 없습니다.</div>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-gray-800">지출 내역 (선택한 세션)</p>
            <ExpenseList
              expenses={expenses}
              participants={participants}
              onDelete={deleteExpense}
              showDelete
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
// @ts-nocheck

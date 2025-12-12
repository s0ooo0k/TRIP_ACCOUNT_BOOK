// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/settlement'

type Trip = { id: string; name: string; created_at?: string }
type Participant = { id: string; name: string; trip_id: string; user_id?: string | null; is_treasurer?: boolean; has_account?: boolean }
type TripRow = Database['public']['Tables']['trips']['Row']
type ParticipantRow = Database['public']['Tables']['participants']['Row']

type Props = {
  role: 'user' | 'admin'
  onLoginSuccess: () => Promise<void> | void
  onLogout: () => void
}

const tabs = [
  { id: 'overview', label: '대시보드' },
  { id: 'trips', label: '세션' },
  { id: 'participants', label: '참여자' },
  { id: 'expenses', label: '지출' },
  { id: 'dues', label: '회비' },
  { id: 'treasury', label: '정산/입출금' },
  { id: 'deleted', label: '삭제내역' },
  { id: 'accounts', label: '계좌' },
] as const

export function AdminPage({ role, onLoginSuccess, onLogout }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('overview')

  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string>('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantName, setParticipantName] = useState('')
  const [tripName, setTripName] = useState('')

  const [expenses, setExpenses] = useState<any[]>([])
  const [deletedExpenses, setDeletedExpenses] = useState<any[]>([])
  const [dues, setDues] = useState<any[]>([])
  const [deletedDues, setDeletedDues] = useState<any[]>([])
  const [treasury, setTreasury] = useState<any[]>([])
  const [deletedTreasury, setDeletedTreasury] = useState<any[]>([])
  const [participantAccounts, setParticipantAccounts] = useState<any[]>([])
  const [tripTreasuryAccount, setTripTreasuryAccount] = useState<any | null>(null)

  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isAdmin = role === 'admin'

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])
  const participantMap = useMemo(() => new Map(participants.map(p => [p.id, p.name])), [participants])

  useEffect(() => {
    if (isAdmin) loadTrips()
  }, [isAdmin])

  useEffect(() => {
    if (!selectedTripId) return
    loadParticipants(selectedTripId)
    loadExpenses(selectedTripId)
    loadDeletedExpenses(selectedTripId)
    loadDues(selectedTripId)
    loadDeletedDues(selectedTripId)
    loadTreasury(selectedTripId)
    loadDeletedTreasury(selectedTripId)
    loadAccounts(selectedTripId)
    loadTripTreasuryAccount(selectedTripId)
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
      .select('*')
      .eq('trip_id', tripId)
      .order('name')
    if (error) {
      setMessage('참여자 목록을 불러오지 못했습니다.')
      return
    }
    setParticipants((data || []) as any)
  }

  async function loadExpenses(tripId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) {
      setMessage('지출 목록을 불러오지 못했습니다.')
      return
    }
    const withParticipants = await Promise.all(
      (data || []).map(async (expense: any) => {
        const { data: ep } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id)
        return { ...expense, participant_ids: ep?.map((e: any) => e.participant_id) || [] }
      })
    )
    setExpenses(withParticipants)
  }

  async function loadDeletedExpenses(tripId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) return
    const withParticipants = await Promise.all(
      (data || []).map(async (expense: any) => {
        const { data: ep } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id)
        return { ...expense, participant_ids: ep?.map((e: any) => e.participant_id) || [] }
      })
    )
    setDeletedExpenses(withParticipants)
  }

  async function loadDues(tripId: string) {
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) return
    setDues(data || [])
  }

  async function loadDeletedDues(tripId: string) {
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) return
    setDeletedDues(data || [])
  }

  async function loadTreasury(tripId: string) {
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) return
    setTreasury(data || [])
  }

  async function loadDeletedTreasury(tripId: string) {
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) return
    setDeletedTreasury(data || [])
  }

  async function loadAccounts(tripId: string) {
    const { data, error } = await supabase
      .from('participant_accounts')
      .select('*')
    if (error) return
    setParticipantAccounts(data || [])
  }

  async function loadTripTreasuryAccount(tripId: string) {
    const { data, error } = await supabase
      .from('trip_treasury_accounts')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle()
    if (error) return
    setTripTreasuryAccount(data || null)
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
    const ok = window.confirm('이 세션을 완전히 삭제할까요? 관련 데이터가 모두 사라집니다.')
    if (!ok) return
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

  async function renameTrip(id: string, nextName: string) {
    if (!nextName.trim()) return
    setBusy(true)
    const { error } = await supabase.from('trips').update({ name: nextName.trim() }).eq('id', id)
    if (error) setMessage('여행 이름 수정에 실패했습니다.')
    else {
      await loadTrips()
      setMessage('여행 이름을 수정했습니다.')
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
    const ok = window.confirm('이 참여자를 완전히 삭제할까요?')
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) setMessage('참여자 삭제에 실패했습니다.')
    else {
      await loadParticipants(selectedTripId)
      setMessage('참여자를 삭제했습니다.')
    }
    setBusy(false)
  }

  async function hardDeleteExpense(id: string) {
    const ok = window.confirm('이 지출을 완전히 삭제할까요? (복구 불가)')
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) setMessage('지출 완전삭제에 실패했습니다.')
    else {
      await loadExpenses(selectedTripId)
      await loadDeletedExpenses(selectedTripId)
      setMessage('지출을 완전히 삭제했습니다.')
    }
    setBusy(false)
  }

  async function hardDeleteDue(id: string) {
    const ok = window.confirm('이 회비 목표를 완전히 삭제할까요? (복구 불가)')
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('dues').delete().eq('id', id)
    if (error) setMessage('회비 목표 완전삭제에 실패했습니다.')
    else {
      await loadDues(selectedTripId)
      await loadDeletedDues(selectedTripId)
      setMessage('회비 목표를 완전히 삭제했습니다.')
    }
    setBusy(false)
  }

  async function hardDeleteTreasury(id: string) {
    const ok = window.confirm('이 정산/입출금 기록을 완전히 삭제할까요? (복구 불가)')
    if (!ok) return
    setBusy(true)
    const { error } = await supabase.from('treasury_transactions').delete().eq('id', id)
    if (error) setMessage('정산 기록 완전삭제에 실패했습니다.')
    else {
      await loadTreasury(selectedTripId)
      await loadDeletedTreasury(selectedTripId)
      setMessage('정산 기록을 완전히 삭제했습니다.')
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

  const totals = useMemo(() => {
    const sumExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const sumTreasuryReceive = treasury.filter((t: any) => t.direction === 'receive').reduce((s, t) => s + (t.amount || 0), 0)
    const sumTreasurySend = treasury.filter((t: any) => t.direction === 'send').reduce((s, t) => s + (t.amount || 0), 0)
    return { sumExpenses, sumTreasuryReceive, sumTreasurySend }
  }, [expenses, treasury])

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
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="관리자 이메일" />
              </div>
              <div className="space-y-2">
                <Label>비밀번호</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[240px,1fr] lg:gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block sticky top-6 self-start">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div className="text-sm font-semibold text-slate-800">Admin Console</div>
            <div className="space-y-1">
              {tabs.map(t => (
                <Button
                  key={t.id}
                  variant={activeTab === t.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
              <div className="text-slate-500">선택 세션</div>
              <div className="font-semibold text-slate-800">
                {selectedTrip ? selectedTrip.name : '없음'}
              </div>
              <Select value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)}>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>{trip.name}</option>
                ))}
              </Select>
              <Button variant="outline" className="w-full" onClick={onLogout}>로그아웃</Button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Admin</p>
              <h1 className="text-3xl font-bold text-slate-900">여행 정산 관리</h1>
              <p className="text-sm text-slate-600">세션/참여자/지출/회비/정산 기록을 관리합니다.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/">메인으로</Link>
              </Button>
              <Button variant="default" onClick={onLogout}>로그아웃</Button>
            </div>
          </header>

          {/* Mobile tab bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {tabs.map(t => (
              <Button
                key={t.id}
                variant={activeTab === t.id ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(t.id)}
                className="shrink-0"
              >
                {t.label}
              </Button>
            ))}
          </div>

          {message && (
            <div className="text-sm text-slate-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{message}</div>
          )}

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">세션 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-700">
                  <div>총 세션: <span className="font-semibold">{trips.length}</span></div>
                  <div>선택 세션: <span className="font-semibold">{selectedTrip?.name || '-'}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">지출/정산</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-700">
                  <div>참여자 수: <span className="font-semibold">{participants.length}</span></div>
                  <div>활성 지출 합계: <span className="font-semibold">{formatCurrency(totals.sumExpenses)}원</span></div>
                  <div>삭제 지출: <span className="font-semibold">{deletedExpenses.length}</span>건</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">회비/입출금</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-700">
                  <div>활성 회비 목표: <span className="font-semibold">{dues.length}</span>건</div>
                  <div>삭제 회비 목표: <span className="font-semibold">{deletedDues.length}</span>건</div>
                  <div>받기/보내기 합: <span className="font-semibold">{formatCurrency(totals.sumTreasuryReceive)} / {formatCurrency(totals.sumTreasurySend)}원</span></div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trips tab */}
          {activeTab === 'trips' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">세션 생성</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addTrip} className="flex gap-2">
                    <Input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="새 여행 이름" />
                    <Button type="submit" disabled={busy}>추가</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">세션 목록</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto p-0">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50">
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>생성일</TableHead>
                        <TableHead className="w-40 text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map(trip => (
                        <TableRow key={trip.id} className={cn(trip.id === selectedTripId && 'bg-amber-50')}>
                          <TableCell>
                            <div className="font-semibold">{trip.name}</div>
                            <div className="text-xs text-slate-500">{trip.id.slice(0, 8)}...</div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedTripId(trip.id)}>선택</Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              const next = window.prompt('새 이름을 입력하세요', trip.name)
                              if (next) renameTrip(trip.id, next)
                            }}>이름변경</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteTrip(trip.id)}>삭제</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {trips.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-slate-500 py-6">세션이 없습니다.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Participants tab */}
          {activeTab === 'participants' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">참여자 추가</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addParticipant} className="flex gap-2">
                    <Input value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="참여자 이름" />
                    <Button type="submit" disabled={busy || !selectedTripId}>추가</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">참여자 목록</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto p-0">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50">
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="w-44 text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.id.slice(0, 8)}...</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.user_id ? (
                              <span className="text-emerald-700 font-semibold">연결됨</span>
                            ) : (
                              <span className="text-slate-400">미연결</span>
                            )}
                            {p.is_treasurer && (
                              <span className="ml-2 text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">총무</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => toggleTreasurer(p.id, !p.is_treasurer)}>
                              {p.is_treasurer ? '총무 해제' : '총무 지정'}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteParticipant(p.id)}>
                              삭제
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {participants.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-slate-500 py-6">참여자가 없습니다.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expenses tab */}
          {activeTab === 'expenses' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">활성 지출</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {expenses.length === 0 ? (
                    <p className="text-sm text-slate-500">활성 지출이 없습니다.</p>
                  ) : (
                    expenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{e.description || '기타'} · {formatCurrency(e.amount)}원</div>
                          <div className="text-xs text-slate-500">
                            {participantMap.get(e.payer_id) || e.payer_id} → {(e.participant_ids || []).map((pid: string) => participantMap.get(pid) || '').join(', ')}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteExpense(e.id)}>완전삭제</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">삭제된 지출</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedExpenses.length === 0 ? (
                    <p className="text-sm text-slate-500">삭제된 지출이 없습니다.</p>
                  ) : (
                    deletedExpenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{e.description || '기타'} · {formatCurrency(e.amount)}원</div>
                          <div className="text-xs text-slate-500">
                            삭제일: {e.deleted_at ? new Date(e.deleted_at).toLocaleString() : '-'}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteExpense(e.id)}>완전삭제</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dues tab */}
          {activeTab === 'dues' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">활성 회비 목표</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {dues.length === 0 ? (
                    <p className="text-sm text-slate-500">활성 회비 목표가 없습니다.</p>
                  ) : (
                    dues.map(d => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-sm text-slate-900">
                          <span className="font-semibold">{d.title}</span> · 인당 {formatCurrency(d.target_amount)}원
                          <div className="text-xs text-slate-500">마감일: {d.due_date || '없음'}</div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteDue(d.id)}>완전삭제</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">삭제된 회비 목표</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedDues.length === 0 ? (
                    <p className="text-sm text-slate-500">삭제된 회비 목표가 없습니다.</p>
                  ) : (
                    deletedDues.map(d => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                        <div className="text-sm text-slate-900">
                          <span className="font-semibold">{d.title}</span> · 인당 {formatCurrency(d.target_amount)}원
                          <div className="text-xs text-slate-500">삭제일: {d.deleted_at ? new Date(d.deleted_at).toLocaleString() : '-'}</div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteDue(d.id)}>완전삭제</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Treasury tab */}
          {activeTab === 'treasury' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">활성 정산/입출금</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {treasury.length === 0 ? (
                    <p className="text-sm text-slate-500">기록이 없습니다.</p>
                  ) : (
                    treasury.map(t => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div>
                          <div className="text-sm text-slate-900">
                            <span className="font-semibold">{t.direction === 'receive' ? '받기' : '보내기'}</span> · {participantMap.get(t.counterparty_id) || '알 수 없음'}
                          </div>
                          {t.memo && <div className="text-xs text-slate-500">{t.memo}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={t.direction === 'receive' ? 'text-emerald-700 font-semibold' : 'text-orange-700 font-semibold'}>
                            {t.direction === 'receive' ? '+' : '-'}{formatCurrency(t.amount)}원
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteTreasury(t.id)}>완전삭제</Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">삭제된 정산/입출금</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedTreasury.length === 0 ? (
                    <p className="text-sm text-slate-500">삭제된 기록이 없습니다.</p>
                  ) : (
                    deletedTreasury.map(t => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                        <div>
                          <div className="text-sm text-slate-900">
                            <span className="font-semibold">{t.direction === 'receive' ? '받기' : '보내기'}</span> · {participantMap.get(t.counterparty_id) || '알 수 없음'}
                          </div>
                          {t.memo && <div className="text-xs text-slate-500">{t.memo}</div>}
                          {t.deleted_at && <div className="text-xs text-slate-500">삭제일: {new Date(t.deleted_at).toLocaleString()}</div>}
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteTreasury(t.id)}>완전삭제</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Deleted tab */}
          {activeTab === 'deleted' && (
            <div className="grid lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">삭제된 지출</CardTitle></CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedExpenses.length === 0 ? <p className="text-sm text-slate-500">없음</p> : deletedExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                      <div className="text-sm">
                        <div className="font-semibold">{e.description || '기타'}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(e.amount)}원 · {e.deleted_at ? new Date(e.deleted_at).toLocaleString() : ''}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteExpense(e.id)}>완전삭제</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">삭제된 회비</CardTitle></CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedDues.length === 0 ? <p className="text-sm text-slate-500">없음</p> : deletedDues.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                      <div className="text-sm">
                        <div className="font-semibold">{d.title}</div>
                        <div className="text-xs text-slate-500">인당 {formatCurrency(d.target_amount)}원</div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteDue(d.id)}>완전삭제</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">삭제된 정산</CardTitle></CardHeader>
                <CardContent className="max-h-[520px] overflow-auto space-y-2">
                  {deletedTreasury.length === 0 ? <p className="text-sm text-slate-500">없음</p> : deletedTreasury.map(t => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
                      <div className="text-sm">
                        <div className="font-semibold">{t.direction === 'receive' ? '받기' : '보내기'}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(t.amount)}원</div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => hardDeleteTreasury(t.id)}>완전삭제</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Accounts tab */}
          {activeTab === 'accounts' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">참여자 계좌</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-auto p-0">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50">
                      <TableRow>
                        <TableHead>참여자</TableHead>
                        <TableHead>계좌 정보</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map(p => {
                        const acc = participantAccounts.find((a: any) => a.participant_id === p.id)
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-semibold">{p.name}</TableCell>
                            <TableCell className="text-sm text-slate-700">
                              {acc ? (
                                <>
                                  <div>{acc.bank_name} {acc.account_number}</div>
                                  <div className="text-xs text-slate-500">{acc.account_holder}{acc.is_public ? ' · 공개' : ' · 비공개'}</div>
                                </>
                              ) : p.has_account ? (
                                <span className="text-xs text-slate-500">비공개 등록</span>
                              ) : (
                                <span className="text-xs text-slate-400">미등록</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">공금 계좌</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  {tripTreasuryAccount ? (
                    <>
                      <div className="font-semibold">{tripTreasuryAccount.bank_name} {tripTreasuryAccount.account_number}</div>
                      <div>예금주: {tripTreasuryAccount.account_holder}</div>
                      {tripTreasuryAccount.memo && <div className="text-xs text-slate-500">메모: {tripTreasuryAccount.memo}</div>}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">등록된 공금 계좌가 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

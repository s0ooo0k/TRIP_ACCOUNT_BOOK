// @ts-nocheck
import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { ParticipantManager } from './components/ParticipantManager'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { SettlementGuide } from './components/SettlementGuide'
import { Button } from '@/components/ui/button'
import { AdminPage } from './pages/AdminPage'
import { calculateSettlements } from './utils/settlement'
import type { Expense, Participant } from './utils/settlement'
import type { Database } from './lib/database.types'

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [tripId, setTripId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [loading, setLoading] = useState(true)

  const settlements = calculateSettlements(participants, expenses)

  useEffect(() => {
    restoreSession()
  }, [])

  // realtime subscriptions
  useEffect(() => {
    if (!tripId) return
    const channel = supabase
      .channel('participants_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `trip_id=eq.${tripId}` }, () => {
        loadParticipants()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tripId])

  useEffect(() => {
    if (!tripId) return
    const channel = supabase
      .channel('expenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => {
        loadExpenses()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tripId])

  async function restoreSession() {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다. README.md의 설정 가이드를 확인해주세요.')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
        const { error: anonError } = await supabase.auth.signInAnonymously()
        if (anonError) throw anonError
      }

      const { data: ensuredSession, error: ensuredError } = await supabase.auth.getSession()
      if (ensuredError || !ensuredSession.session) throw ensuredError || new Error('세션을 만들지 못했습니다.')
      const currentUserId = ensuredSession.session.user.id

      const savedTripId = localStorage.getItem('tripId')
      const savedParticipantId = localStorage.getItem('participantId')

      if (savedTripId && savedParticipantId) {
        const { data } = await supabase
          .from('participants')
          .select('id, name, trip_id, user_id')
          .eq('trip_id', savedTripId)
          .eq('id', savedParticipantId)
          .maybeSingle()

        if (data && data.user_id === currentUserId) {
          setTripId(savedTripId)
          setUser({ id: data.id, name: data.name })
          await syncRole()
          await loadParticipants(savedTripId)
          await loadExpenses(savedTripId)
        } else {
          clearLocalSession()
        }
      }
    } catch (error) {
      console.error('세션 복원 오류:', error)
      alert(error instanceof Error ? error.message : '데이터 로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function clearLocalSession() {
    localStorage.removeItem('tripId')
    localStorage.removeItem('participantId')
    localStorage.removeItem('participantName')
  }

  async function syncRole() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setRole('user')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      await supabase.from('profiles').insert<ProfileRow>({ id: userId, role: 'user' } as ProfileRow).catch(() => {})
      setRole('user')
    } else {
      setRole(profile.role === 'admin' ? 'admin' : 'user')
    }
  }

  async function handleLogin(selectedTripId: string, participant: { id: string; name: string }) {
    setTripId(selectedTripId)
    setUser({ id: participant.id, name: participant.name })
    localStorage.setItem('tripId', selectedTripId)
    localStorage.setItem('participantId', participant.id)
    localStorage.setItem('participantName', participant.name)

    await syncRole()
    await loadParticipants(selectedTripId)
    await loadExpenses(selectedTripId)
  }

  function handleLogout() {
    supabase.auth.signOut().catch(err => console.error('로그아웃 실패:', err))
    setTripId(null)
    setUser(null)
    setRole('user')
    setParticipants([])
    setExpenses([])
    clearLocalSession()
  }

  async function adminLoggedIn() {
    // 로그인 후 현재 사용자 정보를 반영
    const { data } = await supabase.auth.getUser()
    const u = data.user
    if (u) setUser({ id: u.id, name: u.email || '관리자' })
    await syncRole()
  }

  async function loadParticipants(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('trip_id', targetId)
      .order('name') as { data: ParticipantRow[] | null; error: any }
    if (error) {
      console.error('참여자 로드 오류:', error)
      return
    }
    setParticipants(data || [])
  }

  async function loadExpenses(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', targetId)
      .order('created_at', { ascending: false }) as { data: ExpenseRow[] | null; error: any }
    if (expensesError) {
      console.error('결제 내역 로드 오류:', expensesError)
      return
    }

    const expensesWithParticipants = await Promise.all(
      (expensesData || []).map(async (expense) => {
        const { data: participantData } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id) as { data: ExpenseParticipantRow[] | null; error: any }

        return {
          ...(expense as ExpenseRow),
          participant_ids: participantData?.map(p => p.participant_id) || []
        }
      })
    )

    setExpenses(expensesWithParticipants)
  }

  async function handleAddParticipant(name: string) {
    if (!tripId) return
    const { error } = await supabase
      .from('participants')
      .insert({ trip_id: tripId, name } as Partial<ParticipantRow>)
    if (error) {
      console.error('참여자 추가 오류:', error)
      alert('참여자 추가에 실패했습니다.')
      return
    }
    await loadParticipants()
  }

  async function handleRemoveParticipant(id: string) {
    if (participants.length <= 2) {
      alert('최소 2명의 참여자가 필요합니다.')
      return
    }

    const hasExpenses = expenses.some(
      expense => expense.payer_id === id || expense.participant_ids.includes(id)
    )
    if (hasExpenses) {
      alert('이 참여자가 포함된 결제 내역이 있습니다. 먼저 결제 내역을 삭제해주세요.')
      return
    }

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('참여자 삭제 오류:', error)
      alert('참여자 삭제에 실패했습니다.')
      return
    }
    await loadParticipants()
  }

  async function handleAddExpense(expenseData: { payerId: string; amount: number; description: string; participantIds: string[] }) {
    if (!tripId) return
    const { data: newExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        payer_id: expenseData.payerId,
        amount: expenseData.amount,
        description: expenseData.description
      } as Partial<ExpenseRow>)
      .select()
      .single()
    if (expenseError) {
      console.error('결제 추가 오류:', expenseError)
      alert('결제 추가에 실패했습니다.')
      return
    }

    const participantMappings = expenseData.participantIds.map(participantId => ({
      expense_id: newExpense.id,
      participant_id: participantId
    })) as Partial<ExpenseParticipantRow>[]
    const { error: mappingError } = await supabase
      .from('expense_participants')
      .insert(participantMappings)
    if (mappingError) {
      console.error('참여자 매핑 오류:', mappingError)
      await supabase.from('expenses').delete().eq('id', newExpense.id)
      alert('결제 추가에 실패했습니다.')
      return
    }
    await loadExpenses()
  }

  async function handleDeleteExpense(id: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('결제 삭제 오류:', error)
      alert('결제 삭제에 실패했습니다.')
      return
    }
    await loadExpenses()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  const MainPage = () => {
    if (!tripId || !user) {
      return <Login onLogin={handleLogin} onAdminNavigate={() => { window.location.assign('/admin') }} />
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex justify-between items-center mb-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-800">세션</span>{' '}
              <span className="text-gray-600">{tripId.slice(0, 8)}...</span>
              <span className="mx-2">•</span>
              <span className="font-semibold text-gray-800">사용자</span>{' '}
              <span className="text-gray-600">{user.name}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link to="/admin">관리자</Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>로그아웃</Button>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">여행 정산</h1>
            <p className="text-gray-600">함께한 여행, 간편하게 정산하세요</p>
          </div>

          <div className="space-y-6">
            <ParticipantManager
              participants={participants}
              onAdd={handleAddParticipant}
              onRemove={handleRemoveParticipant}
              isAdmin={role === 'admin'}
            />

            {participants.length >= 2 && (
              <ExpenseForm participants={participants} onAdd={handleAddExpense} />
            )}

            <ExpenseList expenses={expenses} participants={participants} onDelete={handleDeleteExpense} />

            {expenses.length > 0 && <SettlementGuide settlements={settlements} />}
          </div>

          <div className="text-center mt-12 text-sm text-gray-500 space-y-3">
            <p>데이터는 Supabase에 실시간 저장됩니다</p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              관리자 페이지로 이동
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminPage
            isAdmin={!!user}
            role={role}
            onLoginSuccess={adminLoggedIn}
            onLogout={handleLogout}
            onDataChanged={() => {
              loadParticipants()
              loadExpenses()
            }}
          />
        }
      />
      <Route path="/" element={<MainPage />} />
    </Routes>
  )
}

export default App
type ParticipantRow = Database['public']['Tables']['participants']['Row']
type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type ExpenseParticipantRow = Database['public']['Tables']['expense_participants']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type TripRow = Database['public']['Tables']['trips']['Row']
// @ts-nocheck

import { useState, useEffect } from 'react'
import { ParticipantManager } from './components/ParticipantManager'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { SettlementGuide } from './components/SettlementGuide'
import { calculateSettlements } from './utils/settlement'
import type { Participant, Expense } from './utils/settlement'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { AdminPanel } from './components/AdminPanel'

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [tripId, setTripId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'main' | 'admin'>('main')

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)

  const settlements = calculateSettlements(participants, expenses)

  // 초기 로드: 저장된 세션 복원 시도
  useEffect(() => {
    restoreSession()
  }, [])

  // 참여자 변경 감지
  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel('participants_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        loadParticipants()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  // 결제 내역 변경 감지
  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel('expenses_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        loadExpenses()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  async function restoreSession() {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다. README.md의 설정 가이드를 확인해주세요.')
      }

      // 세션 확보 (익명 로그인 포함)
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
          localStorage.removeItem('tripId')
          localStorage.removeItem('participantId')
          localStorage.removeItem('participantName')
        }
      }
    } catch (error) {
      console.error('세션 복원 오류:', error)
      alert(error instanceof Error ? error.message : '데이터 로드에 실패했습니다.')
    } finally {
      setLoading(false)
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
    localStorage.removeItem('tripId')
    localStorage.removeItem('participantId')
    localStorage.removeItem('participantName')
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (error || !data.session) {
      console.error('관리자 로그인 실패:', error)
      setAdminError('관리자 로그인에 실패했습니다.')
      setAdminLoading(false)
      return
    }
    setUser({ id: data.session.user.id, name: adminEmail })
    await syncRole()
    setAdminLoading(false)
  }

  async function syncRole() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return setRole('user')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      await supabase.from('profiles').insert({ id: userId, role: 'user' }).select().single().catch(() => {})
      setRole('user')
    } else {
      const nextRole = profile.role === 'admin' ? 'admin' : 'user'
      setRole(nextRole)
    }
  }

  async function loadParticipants(id?: string) {
    const targetId = id || tripId
    if (!targetId) return

    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('trip_id', targetId)
      .order('name')

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
      .order('created_at', { ascending: false })

    if (expensesError) {
      console.error('결제 내역 로드 오류:', expensesError)
      return
    }

    // 각 결제의 참여자 목록 로드
    const expensesWithParticipants = await Promise.all(
      (expensesData || []).map(async (expense) => {
        const { data: participantData } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id)

        return {
          ...expense,
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
      .insert({ trip_id: tripId, name })

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

    // 해당 참여자가 포함된 결제가 있는지 확인
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

  async function handleAddExpense(expenseData: {
    payerId: string
    amount: number
    description: string
    participantIds: string[]
  }) {
    if (!tripId) return

    // 결제 내역 추가
    const { data: newExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        payer_id: expenseData.payerId,
        amount: expenseData.amount,
        description: expenseData.description
      })
      .select()
      .single()

    if (expenseError) {
      console.error('결제 추가 오류:', expenseError)
      alert('결제 추가에 실패했습니다.')
      return
    }

    // 참여자 매핑 추가
    const participantMappings = expenseData.participantIds.map(participantId => ({
      expense_id: newExpense.id,
      participant_id: participantId
    }))

    const { error: mappingError } = await supabase
      .from('expense_participants')
      .insert(participantMappings)

    if (mappingError) {
      console.error('참여자 매핑 오류:', mappingError)
      // 결제 내역 롤백
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

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">관리자 페이지</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setView('main')}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                메인으로 돌아가기
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              >
                로그아웃
              </button>
            </div>
          </div>

          {role !== 'admin' ? (
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 border border-sky-100 max-w-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">관리자 로그인</h2>
              <p className="text-sm text-gray-600 mb-4">Supabase Auth에 등록된 관리자 이메일/비밀번호로 로그인하세요.</p>
              <form className="space-y-3" onSubmit={handleAdminLogin}>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="관리자 이메일"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
                {adminError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{adminError}</div>
                )}
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-sky-600 text-white font-semibold py-2 rounded-lg hover:bg-sky-700 disabled:bg-gray-300"
                >
                  {adminLoading ? '로그인 중...' : '관리자 로그인'}
                </button>
              </form>
            </div>
          ) : (
            <AdminPanel
              isAdmin
              onDataChanged={() => {
                loadParticipants()
                loadExpenses()
              }}
            />
          )}
        </div>
      </div>
    )
  }

  if (!tripId || !user) {
    return <Login onLogin={handleLogin} onAdminNavigate={() => setView('admin')} />
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
          <button
            onClick={handleLogout}
            className="text-sky-600 hover:text-sky-800 font-semibold"
          >
            로그아웃
          </button>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            여행 정산
          </h1>
          <p className="text-gray-600">
            함께한 여행, 간편하게 정산하세요
          </p>
        </div>

        {role === 'admin' && (
          <AdminPanel
            isAdmin
            onDataChanged={() => {
              loadParticipants()
              loadExpenses()
            }}
          />
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Participant Manager */}
          <ParticipantManager
            participants={participants}
            onAdd={handleAddParticipant}
            onRemove={handleRemoveParticipant}
            isAdmin={role === 'admin'}
          />

          {/* Expense Form */}
          {participants.length >= 2 && (
          <ExpenseForm
            participants={participants}
            onAdd={handleAddExpense}
          />
          )}

          {/* Expense List */}
          <ExpenseList
            expenses={expenses}
            participants={participants}
            onDelete={handleDeleteExpense}
          />

          {/* Settlement Guide */}
          {expenses.length > 0 && (
            <SettlementGuide settlements={settlements} />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500 space-y-3">
          <p>데이터는 Supabase에 실시간 저장됩니다</p>
          <button
            onClick={() => setView('admin')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

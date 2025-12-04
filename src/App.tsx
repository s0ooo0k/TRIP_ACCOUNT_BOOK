import { useState, useEffect } from 'react'
import { ParticipantManager } from './components/ParticipantManager'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { SettlementGuide } from './components/SettlementGuide'
import { calculateSettlements } from './utils/settlement'
import type { Participant, Expense } from './utils/settlement'
import { supabase } from './lib/supabase'

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [tripId, setTripId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const settlements = calculateSettlements(participants, expenses)

  // 초기 로드: 여행 세션 생성 또는 로드
  useEffect(() => {
    initializeTrip()
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

  async function initializeTrip() {
    try {
      // 환경 변수 체크
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다. README.md의 설정 가이드를 확인해주세요.')
      }

      // localStorage에서 기존 trip_id 확인
      const savedTripId = localStorage.getItem('tripId')

      if (savedTripId) {
        // 기존 여행 로드
        setTripId(savedTripId)
        await loadParticipants(savedTripId)
        await loadExpenses(savedTripId)
      } else {
        // 새 여행 생성
        const { data, error } = await supabase
          .from('trips')
          .insert({ name: '여행 정산' })
          .select()
          .single()

        if (error) throw error

        const newTripId = data.id
        setTripId(newTripId)
        localStorage.setItem('tripId', newTripId)

        // 기본 참여자 2명 추가
        await supabase.from('participants').insert([
          { trip_id: newTripId, name: '철수' },
          { trip_id: newTripId, name: '영희' }
        ])

        await loadParticipants(newTripId)
      }
    } catch (error) {
      console.error('초기화 오류:', error)
      alert(error instanceof Error ? error.message : '데이터 로드에 실패했습니다.')
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            여행 정산
          </h1>
          <p className="text-gray-600">
            함께한 여행, 간편하게 정산하세요
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Participant Manager */}
          <ParticipantManager
            participants={participants}
            onAdd={handleAddParticipant}
            onRemove={handleRemoveParticipant}
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
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>데이터는 Supabase에 실시간 저장됩니다</p>
        </div>
      </div>
    </div>
  )
}

export default App

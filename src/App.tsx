import { useState } from 'react'
import { ParticipantManager } from './components/ParticipantManager'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { SettlementGuide } from './components/SettlementGuide'
import { calculateSettlements } from './utils/settlement'
import type { Participant, Expense } from './utils/settlement'

function App() {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '철수' },
    { id: '2', name: '영희' }
  ])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [nextId, setNextId] = useState(3)

  const settlements = calculateSettlements(participants, expenses)

  const handleAddParticipant = (name: string) => {
    setParticipants([...participants, { id: String(nextId), name }])
    setNextId(nextId + 1)
  }

  const handleRemoveParticipant = (id: string) => {
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

    setParticipants(participants.filter(p => p.id !== id))
  }

  const handleAddExpense = (expenseData: {
    payerId: string
    amount: number
    description: string
    participantIds: string[]
  }) => {
    const newExpense: Expense = {
      id: String(nextId),
      payer_id: expenseData.payerId,
      amount: expenseData.amount,
      description: expenseData.description,
      participant_ids: expenseData.participantIds
    }
    setExpenses([...expenses, newExpense])
    setNextId(nextId + 1)
  }

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id))
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
          <p>모든 데이터는 로컬에 저장됩니다</p>
        </div>
      </div>
    </div>
  )
}

export default App

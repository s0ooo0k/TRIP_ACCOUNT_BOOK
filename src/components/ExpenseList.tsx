import type { Participant, Expense } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'

interface Props {
  expenses: Expense[]
  participants: Participant[]
  onDelete: (id: string) => void
}

export function ExpenseList({ expenses, participants, onDelete }: Props) {
  const participantMap = new Map(participants.map(p => [p.id, p.name]))

  const getParticipantNames = (participantIds: string[]) => {
    return participantIds.map(id => participantMap.get(id) || '').join(', ')
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 내역</h2>
        <p className="text-gray-500 text-center py-8">아직 결제 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 내역</h2>

      <div className="space-y-2">
        {expenses.map(expense => (
          <div
            key={expense.id}
            className="flex items-center justify-between p-4 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  {expense.description}
                </span>
                <span className="text-sky-600 font-semibold">
                  {formatCurrency(expense.amount)}원
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {participantMap.get(expense.payer_id)} → {getParticipantNames(expense.participant_ids)}
              </div>
            </div>

            <button
              onClick={() => onDelete(expense.id)}
              className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
              title="삭제"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

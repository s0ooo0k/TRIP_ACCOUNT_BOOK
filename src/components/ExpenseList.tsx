import type { Participant, Expense } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  expenses: Expense[]
  participants: Participant[]
  onDelete?: (id: string) => void
  showDelete?: boolean
}

export function ExpenseList({ expenses, participants, onDelete, showDelete = false }: Props) {
  const participantMap = new Map(participants.map(p => [p.id, p.name]))

  const getParticipantNames = (participantIds: string[]) => {
    return participantIds.map(id => participantMap.get(id) || '').join(', ')
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">아직 결제 내역이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>결제 내역</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {expenses.map(expense => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{expense.description}</span>
                <span className="text-orange-600 font-semibold">
                  {formatCurrency(expense.amount)}원
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {participantMap.get(expense.payer_id)} → {getParticipantNames(expense.participant_ids)}
              </div>
              {expense.created_by && (
                <div className="text-xs text-gray-500 mt-1">
                  등록자: {participantMap.get(expense.created_by) || '알 수 없음'}
                </div>
              )}
            </div>

            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-600"
                onClick={() => onDelete(expense.id)}
                title="삭제"
              >
                삭제
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

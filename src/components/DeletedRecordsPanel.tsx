// @ts-nocheck
import type { Participant, Expense, DuesGoal, TreasuryTx } from '@/utils/settlement'
import { formatCurrency } from '@/utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = {
  participants: Participant[]
  deletedExpenses: Expense[]
  deletedDues: DuesGoal[]
  deletedTreasury: TreasuryTx[]
  onRestoreExpense: (id: string) => void
  onRestoreDue: (id: string) => void
  onRestoreTreasury: (id: string) => void
  canRestore?: boolean
}

export function DeletedRecordsPanel({
  participants,
  deletedExpenses,
  deletedDues,
  deletedTreasury,
  onRestoreExpense,
  onRestoreDue,
  onRestoreTreasury,
  canRestore = false,
}: Props) {
  const participantMap = new Map(participants.map(p => [p.id, p.name]))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>삭제된 지출</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deletedExpenses.length === 0 ? (
            <p className="text-sm text-gray-500">삭제된 지출이 없습니다.</p>
          ) : (
            deletedExpenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{expense.description}</span>
                    <span className="text-orange-600 font-semibold">
                      {formatCurrency(expense.amount)}원
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {participantMap.get(expense.payer_id)} → {(expense.participant_ids || []).map(id => participantMap.get(id) || '').join(', ')}
                  </div>
                  {expense.deleted_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      삭제일: {new Date(expense.deleted_at).toLocaleString()}
                    </div>
                  )}
                </div>
                {canRestore && (
                  <Button variant="outline" size="sm" onClick={() => onRestoreExpense(expense.id)}>
                    복구
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>삭제된 회비 목표</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deletedDues.length === 0 ? (
            <p className="text-sm text-gray-500">삭제된 회비 목표가 없습니다.</p>
          ) : (
            deletedDues.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
                <div className="text-sm text-gray-800">
                  {d.title} · 인당 {formatCurrency(d.target_amount)}원
                  {d.deleted_at && (
                    <span className="text-xs text-gray-500"> · 삭제일: {new Date(d.deleted_at).toLocaleDateString()}</span>
                  )}
                </div>
                {canRestore && (
                  <Button variant="outline" size="sm" onClick={() => onRestoreDue(d.id)}>
                    복구
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>삭제된 정산/입출금 기록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deletedTreasury.length === 0 ? (
            <p className="text-sm text-gray-500">삭제된 기록이 없습니다.</p>
          ) : (
            deletedTreasury.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
                <div>
                  <div className="text-sm text-gray-900">
                    {tx.direction === 'receive' ? '받기' : '보내기'} · {participantMap.get(tx.counterparty_id || '') || '알 수 없음'}
                  </div>
                  {tx.memo && <div className="text-xs text-gray-500">{tx.memo}</div>}
                  {tx.deleted_at && (
                    <div className="text-xs text-gray-500">삭제일: {new Date(tx.deleted_at).toLocaleString()}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={tx.direction === 'receive' ? 'text-emerald-700 font-semibold' : 'text-orange-700 font-semibold'}>
                    {tx.direction === 'receive' ? '+' : '-'}{formatCurrency(tx.amount)}원
                  </div>
                  {canRestore && (
                    <Button variant="outline" size="sm" onClick={() => onRestoreTreasury(tx.id)}>
                      복구
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

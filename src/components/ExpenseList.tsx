import { useMemo, useState } from 'react'
import type { Participant, Expense, ParticipantAccount } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Props {
  expenses: Expense[]
  participants: Participant[]
  accounts?: ParticipantAccount[]
  currentParticipantId?: string
  isTreasurer?: boolean
  onDelete?: (id: string) => void
  showDelete?: boolean
  onSettle?: (expense: Expense) => void
  showSettle?: boolean
}

export function ExpenseList({
  expenses,
  participants,
  accounts = [],
  currentParticipantId,
  isTreasurer = false,
  onDelete,
  showDelete = false,
  onSettle,
  showSettle = false
}: Props) {
  const participantMap = new Map(participants.map(p => [p.id, p.name]))
  const [showAccounts, setShowAccounts] = useState(false)

  const accountMap = useMemo(() => {
    return new Map(accounts.map(acc => [acc.participant_id, acc]))
  }, [accounts])

  const getParticipantNames = (participantIds: string[]) => {
    return participantIds.map(id => participantMap.get(id) || '').join(', ')
  }

  const getAccountLabel = (participantId: string) => {
    const account = accountMap.get(participantId)
    if (!account) return '등록하지 않음'
    const isOwner = currentParticipantId === participantId
    if (!account.is_public && !isTreasurer && !isOwner) {
      return '비공개'
    }
    const holder = account.account_holder ? ` · ${account.account_holder}` : ''
    return `${account.bank_name} ${account.account_number}${holder}`
  }

  const getSendTargets = (expense: Expense) => {
    if (!expense.participant_ids || expense.participant_ids.length === 0) return []
    const share = expense.amount / expense.participant_ids.length
    const participantSet = new Set(expense.participant_ids)
    const impactedIds = new Set<string>(expense.participant_ids)
    if (expense.payer_id) impactedIds.add(expense.payer_id)
    const result: Array<{ id: string; name: string; amount: number }> = []
    impactedIds.forEach((pid) => {
      let balance = 0
      if (pid === expense.payer_id) balance += expense.amount
      if (participantSet.has(pid)) balance -= share
      const rounded = Math.round(balance)
      if (rounded <= 0) return
      result.push({
        id: pid,
        name: participantMap.get(pid) || '알 수 없음',
        amount: rounded
      })
    })
    return result
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>결제 내역</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Checkbox
              id="show-expense-accounts"
              checked={showAccounts}
              onChange={(e) => setShowAccounts(e.target.checked)}
            />
            <Label htmlFor="show-expense-accounts" className="cursor-pointer">
              보낼 대상 계좌 표시
            </Label>
          </div>
        </div>
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
                {expense.is_settled && (
                  <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                    정산 완료됨
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {participantMap.get(expense.payer_id)} → {getParticipantNames(expense.participant_ids)}
              </div>
              {expense.created_by && (
                <div className="text-xs text-gray-500 mt-1">
                  등록자: {participantMap.get(expense.created_by) || '알 수 없음'}
                </div>
              )}
              {showAccounts && (
                <div className="mt-2 rounded-md border border-orange-100 bg-white/80 p-2 text-xs text-gray-700 space-y-1">
                  <div className="font-semibold text-gray-800">보낼 대상 계좌</div>
                  {getSendTargets(expense).length === 0 ? (
                    <div>보낼 사람이 없습니다.</div>
                  ) : (
                    getSendTargets(expense).map((target) => (
                      <div key={target.id} className="flex items-center justify-between gap-2">
                        <div className="text-gray-800">
                          {target.name} · {formatCurrency(target.amount)}원
                        </div>
                        <div className="text-gray-500">{getAccountLabel(target.id)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {expense.images && expense.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {expense.images
                    .filter(img => !!img.url)
                    .map((img) => (
                      <a
                        key={img.id || img.path}
                        href={img.url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                        title="이미지 보기"
                      >
                        <img
                          src={img.url as string}
                          alt="receipt"
                          className="h-16 w-16 object-cover rounded-md border border-orange-100"
                        />
                      </a>
                    ))}
                </div>
              )}
            </div>

            {(showSettle && onSettle && !expense.is_settled) || (showDelete && onDelete) ? (
              <div className="flex items-center gap-2">
                {showSettle && onSettle && !expense.is_settled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-700 hover:text-emerald-800"
                    onClick={() => onSettle(expense)}
                    title="정산 완료"
                  >
                    정산 완료
                  </Button>
                )}
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
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

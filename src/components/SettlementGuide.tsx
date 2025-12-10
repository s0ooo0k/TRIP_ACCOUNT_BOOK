import type { Participant, Expense } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  participants: Participant[]
  expenses: Expense[]
}

type NetBalance = { id: string; name: string; balance: number }

function computeNetBalances(participants: Participant[], expenses: Expense[]): NetBalance[] {
  const map = new Map<string, { name: string; balance: number }>()
  participants.forEach(p => map.set(p.id, { name: p.name, balance: 0 }))

  expenses.forEach(expense => {
    const share = expense.amount / expense.participant_ids.length
    // payer pays -> credit
    const payer = map.get(expense.payer_id)
    if (payer) payer.balance += expense.amount
    // each participant owes their share
    expense.participant_ids.forEach(pid => {
      const entry = map.get(pid)
      if (entry) entry.balance -= share
    })
  })

  return Array.from(map.entries()).map(([id, { name, balance }]) => ({
    id,
    name,
    balance: Math.round(balance)
  }))
}

export function SettlementGuide({ participants, expenses }: Props) {
  const net = computeNetBalances(participants, expenses)
  const receivers = net.filter(n => n.balance > 0)
  const payers = net.filter(n => n.balance < 0)

  const isAllSettled = receivers.length === 0 && payers.length === 0

  if (isAllSettled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>정산 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">정산이 완료되었습니다!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>정산 안내 (총무 일괄 정산)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-orange-900">총무가 받을 금액</h3>
              <span className="text-xs text-orange-700">마이너스 잔액</span>
            </div>
            {payers.length === 0 ? (
              <p className="text-sm text-gray-600">모두 정산 완료</p>
            ) : (
              <div className="space-y-2">
                {payers.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <span className="text-gray-800">{p.name}</span>
                    <span className="font-semibold text-orange-700">-{formatCurrency(Math.abs(p.balance))}원</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-emerald-900">총무가 보내줄 금액</h3>
              <span className="text-xs text-emerald-700">플러스 잔액</span>
            </div>
            {receivers.length === 0 ? (
              <p className="text-sm text-gray-600">보낼 사람이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {receivers.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <span className="text-gray-800">{p.name}</span>
                    <span className="font-semibold text-emerald-700">+{formatCurrency(p.balance)}원</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <p className="text-orange-700 font-medium">
            위 금액대로 총무가 모아서 보내면 정산 완료!
          </p>
          <p className="text-xs text-gray-600 mt-1">* 정밀 계산은 모든 지출을 반영한 순수 잔액 기준입니다.</p>
        </div>
      </CardContent>
    </Card>
  )
}

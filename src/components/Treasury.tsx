// @ts-nocheck
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency, Participant, TreasuryTx, DuesGoal, Expense, ParticipantAccount } from '../utils/settlement'
import { cn } from '@/lib/utils'

type Props = {
  participants: Participant[]
  treasury: TreasuryTx[]
  expenses?: Expense[]
  accounts?: ParticipantAccount[]
  isTreasurer: boolean
  dues?: DuesGoal[]
  onAdd: (tx: { direction: 'receive' | 'send'; counterpartyId: string; amount: number; memo: string; dueId?: string; expenseId?: string }) => void
  onSettleExpense?: (expense: Expense) => Promise<void> | void
  onDeleteTx?: (id: string) => void
}

export function Treasury({ participants, treasury, expenses = [], accounts = [], isTreasurer, onAdd, onSettleExpense, onDeleteTx, dues = [] }: Props) {
  const [direction, setDirection] = useState<'receive' | 'send'>('receive')
  const [counterpartyId, setCounterpartyId] = useState(participants[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [selectedExpenseId, setSelectedExpenseId] = useState('')

  const totals = useMemo(() => {
    let receive = 0
    let send = 0
    treasury.forEach(tx => {
      if (tx.direction === 'receive') receive += tx.amount || 0
      else send += tx.amount || 0
    })
    return { receive, send }
  }, [treasury])

  const accountMap = useMemo(() => {
    return new Map(accounts.map(acc => [acc.participant_id, acc]))
  }, [accounts])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(amount, 10)
    if (!counterpartyId || !amt || amt <= 0) {
      alert('금액과 상대방을 입력하세요.')
      return
    }
    onAdd({ direction, counterpartyId, amount: amt, memo })
    setAmount('')
    setMemo('')
  }

  const unsettledExpenses = useMemo(
    () => expenses.filter(expense => !expense.is_settled),
    [expenses]
  )

  const selectedExpense = useMemo(
    () => unsettledExpenses.find(expense => expense.id === selectedExpenseId),
    [unsettledExpenses, selectedExpenseId]
  )

  const settlementReceivers = useMemo(() => {
    if (!selectedExpense) return []
    if (!selectedExpense.participant_ids || selectedExpense.participant_ids.length === 0) return []
    const share = selectedExpense.amount / selectedExpense.participant_ids.length
    const participantSet = new Set(selectedExpense.participant_ids)
    const impactedIds = new Set<string>(selectedExpense.participant_ids)
    if (selectedExpense.payer_id) impactedIds.add(selectedExpense.payer_id)
    const result: Array<{ id: string; name: string; amount: number; accountLabel: string }> = []
    impactedIds.forEach((pid) => {
      let balance = 0
      if (pid === selectedExpense.payer_id) balance += selectedExpense.amount
      if (participantSet.has(pid)) balance -= share
      const rounded = Math.round(balance)
      if (rounded <= 0) return
      const name = participants.find(p => p.id === pid)?.name || '알 수 없음'
      const account = accountMap.get(pid)
      const accountLabel = account
        ? `${account.bank_name} ${account.account_number}${account.account_holder ? ` · ${account.account_holder}` : ''}`
        : '등록하지 않음'
      result.push({ id: pid, name, amount: rounded, accountLabel })
    })
    return result
  }, [participants, selectedExpense, accountMap])

  const handleAutoSettle = async () => {
    if (!selectedExpense || !onSettleExpense) return
    if (!selectedExpense.participant_ids || selectedExpense.participant_ids.length === 0) {
      alert('참여자가 없어 정산할 수 없습니다.')
      return
    }
    await onSettleExpense(selectedExpense)
    setSelectedExpenseId('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>모임통장 입출금 기록</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTreasurer && (
          <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-orange-900">지출 정산 자동 추가</div>
              <span className="text-xs text-orange-700">정산 완료 연동</span>
            </div>
            {unsettledExpenses.length === 0 ? (
              <p className="text-xs text-gray-600">정산할 지출 내역이 없습니다.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>지출 내역 선택</Label>
                  <Select value={selectedExpenseId} onChange={(e) => setSelectedExpenseId(e.target.value)}>
                    <option value="">선택하세요</option>
                    {unsettledExpenses.map(expense => (
                      <option key={expense.id} value={expense.id}>
                        {(expense.description || '지출')} · {formatCurrency(expense.amount)}원
                      </option>
                    ))}
                  </Select>
                </div>
                {selectedExpense && (
                  <div className="rounded-md bg-white/80 border border-orange-100 p-2 text-xs text-gray-700 space-y-1">
                    <div className="font-semibold text-gray-800">보내기 예정</div>
                    {settlementReceivers.length === 0 ? (
                      <div>보낼 사람이 없습니다.</div>
                    ) : (
                      settlementReceivers.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2">
                          <div className="text-gray-800">{r.name}</div>
                          <div className="text-right">
                            <div className="font-semibold text-orange-700">-{formatCurrency(r.amount)}원</div>
                            <div className="text-[11px] text-gray-500">{r.accountLabel}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleAutoSettle}
                  disabled={!selectedExpenseId || !onSettleExpense}
                >
                  정산 완료 자동 추가
                </Button>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="text-emerald-800 font-semibold">받기 총합</div>
            <div className="text-2xl font-bold text-emerald-900">{formatCurrency(totals.receive)}원</div>
          </div>
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
            <div className="text-orange-800 font-semibold">보내기 총합</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(totals.send)}원</div>
          </div>
        </div>

        {isTreasurer ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === 'receive' ? 'default' : 'outline'}
                className={cn(direction === 'receive' && 'bg-emerald-500 hover:bg-emerald-600')}
                onClick={() => setDirection('receive')}
              >
                받기
              </Button>
              <Button
                type="button"
                variant={direction === 'send' ? 'default' : 'outline'}
                className={cn(direction === 'send' && 'bg-orange-500 hover:bg-orange-600')}
                onClick={() => setDirection('send')}
              >
                보내기
              </Button>
            </div>

            <div className="space-y-2">
              <Label>상대방</Label>
              <Select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)}>
                <option value="">선택하세요</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>금액</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 사용 내역" />
            </div>

            <Button type="submit" className="w-full">기록 추가</Button>
          </form>
        ) : (
          <div className="text-sm text-gray-600">총무만 입출금 기록을 추가할 수 있습니다.</div>
        )}

        <div className="space-y-2">
          {treasury.length === 0 ? (
            <p className="text-sm text-gray-500">아직 기록이 없습니다.</p>
          ) : (
            treasury.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
                <div>
                  <div className="text-sm text-gray-900">
                    {tx.direction === 'receive' ? '받기' : '보내기'} · {participants.find(p => p.id === tx.counterparty_id)?.name || '알 수 없음'}
                  </div>
                  {tx.memo && <div className="text-xs text-gray-500">{tx.memo}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "font-semibold",
                    tx.direction === 'receive' ? 'text-emerald-700' : 'text-orange-700'
                  )}>
                    {tx.direction === 'receive' ? '+' : '-'}{formatCurrency(tx.amount)}원
                  </div>
                  {isTreasurer && onDeleteTx && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => onDeleteTx(tx.id)}
                      title="삭제"
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

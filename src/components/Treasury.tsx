// @ts-nocheck
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency, Participant, TreasuryTx, DuesGoal } from '../utils/settlement'
import { cn } from '@/lib/utils'

type Props = {
  participants: Participant[]
  treasury: TreasuryTx[]
  isTreasurer: boolean
  dues?: DuesGoal[]
  onAdd: (tx: { direction: 'receive' | 'send'; counterpartyId: string; amount: number; memo: string; dueId?: string }) => void
  onDeleteTx?: (id: string) => void
}

export function Treasury({ participants, treasury, isTreasurer, onAdd, onDeleteTx, dues = [] }: Props) {
  const [direction, setDirection] = useState<'receive' | 'send'>('receive')
  const [counterpartyId, setCounterpartyId] = useState(participants[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  const totals = useMemo(() => {
    let receive = 0
    let send = 0
    treasury.forEach(tx => {
      if (tx.direction === 'receive') receive += tx.amount || 0
      else send += tx.amount || 0
    })
    return { receive, send }
  }, [treasury])

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

  return (
      <Card>
      <CardHeader>
        <CardTitle>모임통장 입출금 기록</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

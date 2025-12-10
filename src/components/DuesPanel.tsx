// @ts-nocheck
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, DuesGoal, Participant, TreasuryTx } from '@/utils/settlement'
import { Select } from '@/components/ui/select'

type Props = {
  dues: DuesGoal[]
  participants: Participant[]
  treasury: TreasuryTx[]
  isTreasurer: boolean
  onAddDue: (data: { title: string; dueDate: string | null; target: number }) => void
  onAddTreasury: (data: { direction: 'receive' | 'send'; counterpartyId: string; amount: number; memo: string; dueId?: string }) => void
}

export function DuesPanel({ dues, participants, treasury, isTreasurer, onAddDue, onAddTreasury }: Props) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [target, setTarget] = useState('')
  const [selectedDueId, setSelectedDueId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [counterpartyId, setCounterpartyId] = useState(participants[0]?.id || '')
  const [memo, setMemo] = useState('')

  const dueStats = useMemo(() => {
    const map = new Map<string, number>()
    treasury.forEach(tx => {
      if (tx.direction === 'receive' && tx.due_id) {
        map.set(tx.due_id, (map.get(tx.due_id) || 0) + tx.amount)
      }
    })
    return map
  }, [treasury])

  const handleAddDue = (e: React.FormEvent) => {
    e.preventDefault()
    const t = parseInt(target, 10)
    if (!title.trim() || !t || t <= 0) {
      alert('제목과 금액을 입력하세요.')
      return
    }
    onAddDue({ title: title.trim(), dueDate: dueDate || null, target: t })
    setTitle('')
    setTarget('')
    setDueDate('')
  }

  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(amount, 10)
    if (!selectedDueId || !counterpartyId || !amt || amt <= 0) {
      alert('회비 항목, 상대방, 금액을 입력하세요.')
      return
    }
    onAddTreasury({
      direction: 'receive',
      counterpartyId,
      amount: amt,
      memo: memo || `회비 - ${dues.find(d => d.id === selectedDueId)?.title || ''}`,
      dueId: selectedDueId
    })
    setAmount('')
    setMemo('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>회비 목표</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTreasurer ? (
            <form onSubmit={handleAddDue} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>회비 이름</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 1차 회비" />
              </div>
              <div className="space-y-2">
                <Label>인당 금액</Label>
                <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>마감일 (선택)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button type="submit" className="w-full sm:w-auto">목표 추가</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-600">총무만 회비 목표를 설정할 수 있습니다.</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {dues.length === 0 && <p className="text-sm text-gray-500">등록된 회비 목표가 없습니다.</p>}
            {dues.map(d => {
              const received = dueStats.get(d.id) || 0
              const totalTarget = d.target_amount * participants.length
              const remaining = Math.max(totalTarget - received, 0)
              return (
                <div key={d.id} className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{d.title}</div>
                    <div className="text-xs text-gray-500">{d.due_date || '마감일 없음'}</div>
                  </div>
                  <div className="text-sm text-gray-700">인당: {formatCurrency(d.target_amount)}원</div>
                  <div className="text-sm text-gray-700">총 목표: {formatCurrency(totalTarget)}원</div>
                  <div className="text-sm text-emerald-700">받은 금액: {formatCurrency(received)}원</div>
                  <div className="text-sm text-orange-700">남은 금액: {formatCurrency(remaining)}원</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>회비 입금 기록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isTreasurer ? (
            <form onSubmit={handleAddReceipt} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>회비 항목</Label>
                <Select value={selectedDueId} onChange={(e) => setSelectedDueId(e.target.value)}>
                  <option value="">선택</option>
                  {dues.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>입금자</Label>
                <Select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)}>
                  <option value="">선택</option>
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
                <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 현금 입금" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">입금 기록 추가</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-600">총무만 회비 입금 기록을 추가할 수 있습니다.</p>
          )}

          <div className="space-y-2">
            {treasury.filter(t => t.direction === 'receive' && t.due_id).length === 0 ? (
              <p className="text-sm text-gray-500">입금 기록이 없습니다.</p>
            ) : (
              treasury
                .filter(t => t.direction === 'receive' && t.due_id)
                .map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <div className="text-sm text-gray-800">
                      {dues.find(d => d.id === t.due_id)?.title || '회비'} · {participants.find(p => p.id === t.counterparty_id)?.name || '알 수 없음'}
                      {t.memo && <span className="text-xs text-gray-500"> · {t.memo}</span>}
                    </div>
                    <div className="text-emerald-700 font-semibold">+{formatCurrency(t.amount)}원</div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

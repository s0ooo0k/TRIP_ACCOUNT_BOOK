// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, DuesGoal, Participant, TreasuryTx, TripTreasuryAccount } from '@/utils/settlement'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Props = {
  dues: DuesGoal[]
  participants: Participant[]
  treasury: TreasuryTx[]
  isTreasurer: boolean
  tripTreasuryAccount?: TripTreasuryAccount | null
  onUpsertTripTreasuryAccount?: (data: { bankName: string; accountNumber: string; accountHolder: string; memo?: string }) => void
  onAddDue: (data: { title: string; dueDate: string | null; target: number }) => void
  onAddTreasury: (data: { direction: 'receive' | 'send'; counterpartyId: string; amount: number; memo: string; dueId?: string }) => void
  onDeleteDue?: (id: string) => void
  onDeleteTreasuryTx?: (id: string) => void
}

export function DuesPanel({ dues, participants, treasury, isTreasurer, tripTreasuryAccount, onUpsertTripTreasuryAccount, onAddDue, onAddTreasury, onDeleteDue, onDeleteTreasuryTx }: Props) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [target, setTarget] = useState('')
  const [selectedDueId, setSelectedDueId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [selectedCounterparties, setSelectedCounterparties] = useState<Set<string>>(new Set())
  const [memo, setMemo] = useState('')

  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [accountMemo, setAccountMemo] = useState('')

  useEffect(() => {
    if (tripTreasuryAccount) {
      setBankName(tripTreasuryAccount.bank_name || '')
      setAccountNumber(tripTreasuryAccount.account_number || '')
      setAccountHolder(tripTreasuryAccount.account_holder || '')
      setAccountMemo(tripTreasuryAccount.memo || '')
    } else {
      setBankName('')
      setAccountNumber('')
      setAccountHolder('')
      setAccountMemo('')
    }
  }, [tripTreasuryAccount?.id])

  const dueStats = useMemo(() => {
    const map = new Map<string, number>()
    treasury.forEach(tx => {
      if (tx.direction === 'receive' && tx.due_id) {
        map.set(tx.due_id, (map.get(tx.due_id) || 0) + tx.amount)
      }
    })
    return map
  }, [treasury])

  const perPersonPaid = useMemo(() => {
    const map = new Map<string, Map<string, number>>() // dueId -> (participantId -> amount)
    treasury.forEach(tx => {
      if (tx.direction === 'receive' && tx.due_id && tx.counterparty_id) {
        const inner = map.get(tx.due_id) || new Map<string, number>()
        inner.set(tx.counterparty_id, (inner.get(tx.counterparty_id) || 0) + tx.amount)
        map.set(tx.due_id, inner)
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
    if (!selectedDueId || selectedCounterparties.size === 0 || !amt || amt <= 0) {
      alert('회비 항목, 입금자, 금액을 입력하세요.')
      return
    }
    const memoText = memo || `회비 - ${dues.find(d => d.id === selectedDueId)?.title || ''}`
    selectedCounterparties.forEach(pid => {
      onAddTreasury({
        direction: 'receive',
        counterpartyId: pid,
        amount: amt,
        memo: memoText,
        dueId: selectedDueId
      })
    })
    setAmount('')
    setMemo('')
    // 선택 유지해서 연속 입력 가능
  }

  const toggleCounterparty = (id: string) => {
    const next = new Set(selectedCounterparties)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedCounterparties(next)
  }

  const toggleAll = () => {
    if (selectedCounterparties.size === participants.length) {
      setSelectedCounterparties(new Set())
    } else {
      setSelectedCounterparties(new Set(participants.map(p => p.id)))
    }
  }

  const handleSaveTreasuryAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onUpsertTripTreasuryAccount) return
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      alert('은행명, 계좌번호, 예금주를 모두 입력해주세요.')
      return
    }
    onUpsertTripTreasuryAccount({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
      memo: accountMemo.trim() || undefined
    })
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/90 border-orange-100">
        <CardHeader>
          <CardTitle>회비 입금 계좌</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tripTreasuryAccount ? (
            <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3 text-sm text-gray-900 space-y-1">
              <div className="font-semibold">
                {tripTreasuryAccount.bank_name} {tripTreasuryAccount.account_number}
              </div>
              <div className="text-xs text-gray-600">예금주: {tripTreasuryAccount.account_holder}</div>
              {tripTreasuryAccount.memo && (
                <div className="text-xs text-gray-600">{tripTreasuryAccount.memo}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">아직 공금 계좌가 설정되지 않았습니다.</p>
          )}

          {isTreasurer ? (
            <form onSubmit={handleSaveTreasuryAccount} className="grid gap-3 sm:grid-cols-3 sm:gap-4 pt-2 border-t border-orange-100">
              <div className="space-y-2">
                <Label>은행명</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행" />
              </div>
              <div className="space-y-2">
                <Label>계좌번호</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="예: 123-456-7890" />
              </div>
              <div className="space-y-2">
                <Label>예금주</Label>
                <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="예: 홍길동" />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label>메모 (선택)</Label>
                <Input value={accountMemo} onChange={(e) => setAccountMemo(e.target.value)} placeholder="예: 회비 입금용 계좌" />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" className="w-full sm:w-auto">
                  {tripTreasuryAccount ? '수정 저장' : '계좌 설정'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-gray-500">* 공금 계좌는 총무만 설정/수정할 수 있습니다.</p>
          )}
        </CardContent>
      </Card>

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
              const perPerson = perPersonPaid.get(d.id) || new Map<string, number>()
              return (
                <div key={d.id} className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{d.title}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">{d.due_date || '마감일 없음'}</div>
                      {isTreasurer && onDeleteDue && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => onDeleteDue(d.id)}
                          title="삭제"
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">인당: {formatCurrency(d.target_amount)}원</div>
                  <div className="text-sm text-gray-700">총 목표: {formatCurrency(totalTarget)}원</div>
                  <div className="text-sm text-emerald-700">받은 금액: {formatCurrency(received)}원</div>
                  <div className="text-sm text-orange-700">남은 금액: {formatCurrency(remaining)}원</div>
                  <div className="pt-1 border-t border-orange-100">
                    <div className="text-xs font-semibold text-gray-700 mb-1">개인별 현황</div>
                    <div className="space-y-1">
                      {participants.map(p => {
                        const paid = perPerson.get(p.id) || 0
                        const done = paid >= d.target_amount
                        return (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-800">{p.name}</span>
                            <span className={done ? 'text-emerald-700 font-semibold' : 'text-orange-700'}>
                              {done ? '완납' : `${formatCurrency(paid)} / ${formatCurrency(d.target_amount)}원`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
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
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>입금자</Label>
                      <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                        {selectedCounterparties.size === participants.length ? '전체 해제' : '전체 선택'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {participants.map(p => {
                        const active = selectedCounterparties.has(p.id)
                        return (
                          <Button
                            key={p.id}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            className={cn(
                              'justify-start text-sm',
                              active
                                ? 'bg-amber-400 hover:bg-amber-500 text-orange-950 border-amber-400'
                                : 'border-gray-200 text-gray-800 hover:border-orange-200 hover:text-orange-700'
                            )}
                            onClick={() => toggleCounterparty(p.id)}
                            aria-pressed={active}
                          >
                            {p.name}
                          </Button>
                        )
                      })}
                    </div>
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
                    <div className="flex items-center gap-2">
                      <div className="text-emerald-700 font-semibold">+{formatCurrency(t.amount)}원</div>
                      {isTreasurer && onDeleteTreasuryTx && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => onDeleteTreasuryTx(t.id)}
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
    </div>
  )
}

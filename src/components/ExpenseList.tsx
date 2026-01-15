import { useMemo, useState } from 'react'
import type { Participant, Expense, ParticipantAccount } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface Props {
  expenses: Expense[]
  participants: Participant[]
  accounts?: ParticipantAccount[]
  currentParticipantId?: string
  isTreasurer?: boolean
  onUpdate?: (id: string, data: { payerId: string; amount: number; description: string; participantIds: string[] }) => Promise<void> | void
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
  onUpdate,
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPayerId, setEditPayerId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editParticipants, setEditParticipants] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

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
    if (!expense.payer_id) return []
    return [
      {
        id: expense.payer_id,
        name: participantMap.get(expense.payer_id) || '알 수 없음',
        amount: expense.amount
      }
    ]
  }

  const canEditExpense = (expense: Expense) => {
    if (!onUpdate) return false
    if (isTreasurer) return true
    if (!currentParticipantId) return false
    return expense.created_by === currentParticipantId
  }

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setEditPayerId(expense.payer_id || '')
    setEditAmount(String(expense.amount ?? ''))
    setEditDescription(expense.description || '')
    setEditParticipants(new Set(expense.participant_ids || []))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setSaving(false)
  }

  const toggleEditParticipant = (participantId: string) => {
    setEditParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        next.add(participantId)
      }
      return next
    })
  }

  const toggleAllParticipants = () => {
    if (editParticipants.size === participants.length) {
      setEditParticipants(new Set())
    } else {
      setEditParticipants(new Set(participants.map(p => p.id)))
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onUpdate || !editingId || saving) return

    if (!editPayerId || !editAmount || editParticipants.size === 0) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    const amountNum = parseInt(editAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('올바른 금액을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      await onUpdate(editingId, {
        payerId: editPayerId,
        amount: amountNum,
        description: editDescription || '기타',
        participantIds: Array.from(editParticipants)
      })
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const canDeleteExpense = (expense: Expense) => {
    if (!showDelete || !onDelete) return false
    if (isTreasurer) return true
    if (!currentParticipantId) return false
    return expense.created_by === currentParticipantId
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
        {expenses.map(expense => {
          const canDelete = canDeleteExpense(expense)
          const canEdit = canEditExpense(expense)
          const isEditing = editingId === expense.id
          return (
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
                {isEditing && (
                  <form
                    onSubmit={handleEditSubmit}
                    className="mt-3 space-y-3 rounded-md border border-orange-100 bg-white/80 p-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-payer-${expense.id}`}>결제자</Label>
                        <Select
                          id={`edit-payer-${expense.id}`}
                          value={editPayerId}
                          onChange={(e) => setEditPayerId(e.target.value)}
                        >
                          <option value="">선택하세요</option>
                          {participants.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-amount-${expense.id}`}>금액</Label>
                        <div className="relative">
                          <Input
                            id={`edit-amount-${expense.id}`}
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="0"
                            className="pr-10"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-gray-500">원</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-desc-${expense.id}`}>항목</Label>
                      <Input
                        id={`edit-desc-${expense.id}`}
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="항목을 입력하세요"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>참여자</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-gray-500"
                          onClick={toggleAllParticipants}
                        >
                          전체 선택
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {participants.map(p => (
                          <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <Checkbox
                              checked={editParticipants.has(p.id)}
                              onChange={() => toggleEditParticipant(p.id)}
                            />
                            <span>{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" disabled={saving}>
                        저장
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                        취소
                      </Button>
                    </div>
                  </form>
                )}
              </div>

            {(showSettle && onSettle && !expense.is_settled) || canEdit || canDelete ? (
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
                {canEdit && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-800"
                    onClick={() => startEdit(expense)}
                    title="수정"
                  >
                    수정
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => onDelete?.(expense.id)}
                      title="삭제"
                    >
                      삭제
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

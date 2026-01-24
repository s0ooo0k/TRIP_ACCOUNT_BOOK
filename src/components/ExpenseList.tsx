import { useEffect, useMemo, useRef, useState } from 'react'
import type { Participant, Expense, ParticipantAccount, ChangeLogEntry } from '../utils/settlement'
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
  changeLogs?: Record<string, ChangeLogEntry[]>
  onLoadChangeLogs?: (expenseId: string) => void
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
  showSettle = false,
  changeLogs,
  onLoadChangeLogs
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const [loadingHistoryIds, setLoadingHistoryIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!openMenuId) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  useEffect(() => {
    if (!openHistoryId || !changeLogs) return
    if (Object.prototype.hasOwnProperty.call(changeLogs, openHistoryId)) {
      setLoadingHistoryIds(prev => {
        if (!prev.has(openHistoryId)) return prev
        const next = new Set(prev)
        next.delete(openHistoryId)
        return next
      })
    }
  }, [changeLogs, openHistoryId])

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

  const toggleHistory = (expenseId: string) => {
    if (openHistoryId === expenseId) {
      setOpenHistoryId(null)
      return
    }
    setOpenHistoryId(expenseId)
    if (!changeLogs || !Object.prototype.hasOwnProperty.call(changeLogs, expenseId)) {
      setLoadingHistoryIds(prev => {
        const next = new Set(prev)
        next.add(expenseId)
        return next
      })
      onLoadChangeLogs?.(expenseId)
    }
  }

  const formatParticipantNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return '-'
    return ids.map(id => participantMap.get(id) || '알 수 없음').join(', ')
  }

  const formatChangeSummary = (log: ChangeLogEntry) => {
    const before = (log.before || {}) as Record<string, any>
    const after = (log.after || {}) as Record<string, any>
    const items: string[] = []

    if (log.action === 'participants_update') {
      const beforeIds = before.participant_ids as string[] | undefined
      const afterIds = after.participant_ids as string[] | undefined
      items.push(`참여자: ${formatParticipantNames(beforeIds)} → ${formatParticipantNames(afterIds)}`)
      return items
    }
    if (log.action === 'delete') {
      items.push('삭제 처리됨')
      return items
    }
    if (log.action === 'restore') {
      items.push('복구 처리됨')
      return items
    }

    if (before.description !== undefined && after.description !== undefined && before.description !== after.description) {
      items.push(`항목: ${before.description || '-'} → ${after.description || '-'}`)
    }
    if (before.amount !== undefined && after.amount !== undefined && before.amount !== after.amount) {
      items.push(`금액: ${formatCurrency(Number(before.amount || 0))}원 → ${formatCurrency(Number(after.amount || 0))}원`)
    }
    if (before.payer_id !== undefined && after.payer_id !== undefined && before.payer_id !== after.payer_id) {
      items.push(`결제자: ${participantMap.get(before.payer_id) || '알 수 없음'} → ${participantMap.get(after.payer_id) || '알 수 없음'}`)
    }
    if (before.participant_ids && after.participant_ids && JSON.stringify(before.participant_ids) !== JSON.stringify(after.participant_ids)) {
      items.push(`참여자: ${formatParticipantNames(before.participant_ids)} → ${formatParticipantNames(after.participant_ids)}`)
    }
    if (before.is_settled !== undefined && after.is_settled !== undefined && before.is_settled !== after.is_settled) {
      items.push(`정산: ${before.is_settled ? '완료' : '미완료'} → ${after.is_settled ? '완료' : '미완료'}`)
    }
    if (items.length === 0) {
      items.push('변경 항목 없음')
    }
    return items
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'delete':
        return '삭제'
      case 'restore':
        return '복구'
      case 'participants_update':
        return '참여자 변경'
      default:
        return '수정'
    }
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
          const hasActions = (showSettle && onSettle && !expense.is_settled) || canEdit || canDelete || !!onLoadChangeLogs
          const isMenuOpen = openMenuId === expense.id
          const isHistoryOpen = openHistoryId === expense.id
          const isHistoryLoading = loadingHistoryIds.has(expense.id)
          const logs = changeLogs?.[expense.id]
          return (
            <div
              key={expense.id}
              className="relative rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 sm:flex sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <div className={`flex items-center gap-2 ${hasActions ? 'pr-10 sm:pr-0' : ''}`}>
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

              {hasActions ? (
                <div
                  ref={isMenuOpen ? menuRef : null}
                  className="absolute right-2 top-2 flex flex-col items-end"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:bg-orange-100 hover:text-gray-700"
                    onClick={() => setOpenMenuId(isMenuOpen ? null : expense.id)}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    title="메뉴"
                  >
                    <span className="sr-only">지출 메뉴</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </Button>
                  {isMenuOpen && (
                    <div className="mt-1 w-32 rounded-md border border-orange-100 bg-white py-1 text-sm shadow-lg z-10">
                      {showSettle && onSettle && !expense.is_settled && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-emerald-700 hover:bg-orange-50"
                          onClick={() => {
                            setOpenMenuId(null)
                            onSettle(expense)
                          }}
                        >
                          정산 완료
                        </button>
                      )}
                      {canEdit && !isEditing && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-gray-700 hover:bg-orange-50"
                          onClick={() => {
                            setOpenMenuId(null)
                            startEdit(expense)
                          }}
                        >
                          수정
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-red-600 hover:bg-orange-50"
                          onClick={() => {
                            setOpenMenuId(null)
                            onDelete?.(expense.id)
                          }}
                        >
                          삭제
                        </button>
                      )}
                      {onLoadChangeLogs && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-gray-700 hover:bg-orange-50"
                          onClick={() => {
                            setOpenMenuId(null)
                            toggleHistory(expense.id)
                          }}
                        >
                          수정 이력
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {isHistoryOpen && (
                <div className="mt-3 w-full rounded-md border border-orange-100 bg-white/80 p-3 text-xs text-gray-700">
                  <div className="text-xs font-semibold text-gray-800 mb-2">수정 이력</div>
                  {isHistoryLoading ? (
                    <div className="text-xs text-gray-500">불러오는 중...</div>
                  ) : logs && logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((log) => {
                        const actor = log.changed_by ? participantMap.get(log.changed_by) || '알 수 없음' : '알 수 없음'
                        return (
                          <div key={log.id} className="rounded-md border border-orange-50 bg-orange-50/40 p-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                              <span className="font-semibold text-gray-700">{getActionLabel(log.action)}</span>
                              <span>{new Date(log.changed_at).toLocaleString()}</span>
                              <span>·</span>
                              <span>{actor}</span>
                            </div>
                            <div className="mt-1 space-y-1 text-gray-700">
                              {formatChangeSummary(log).map((line, idx) => (
                                <div key={`${log.id}-line-${idx}`}>{line}</div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">이력이 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

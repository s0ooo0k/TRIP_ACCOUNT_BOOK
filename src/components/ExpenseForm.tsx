import { useEffect, useState } from 'react'
import type { Participant } from '../utils/settlement'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  participants: Participant[]
  currentParticipantId?: string
  onAdd: (expense: {
    payerId: string
    amount: number
    description: string
    participantIds: string[]
  }) => void
}

export function ExpenseForm({ participants, currentParticipantId, onAdd }: Props) {
  const [payerId, setPayerId] = useState(currentParticipantId || '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(currentParticipantId ? [currentParticipantId] : [])
  )

  // 기본 결제자: 현재 로그인 사용자
  useEffect(() => {
    if (currentParticipantId) {
      setPayerId(currentParticipantId)
      setSelectedParticipants((prev) => {
        const next = new Set(prev)
        next.add(currentParticipantId)
        return next
      })
    }
  }, [currentParticipantId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!payerId || !amount || selectedParticipants.size === 0) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('올바른 금액을 입력해주세요.')
      return
    }

    onAdd({
      payerId,
      amount: amountNum,
      description: description || '기타',
      participantIds: Array.from(selectedParticipants)
    })

    // Reset form
    setAmount('')
    setDescription('')
  }

  const toggleParticipant = (id: string) => {
    const newSet = new Set(selectedParticipants)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedParticipants(newSet)
  }

  const selectAll = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set())
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.id)))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 추가</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payer">결제자</Label>
            <Select
              id="payer"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              <option value="">선택하세요</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">금액</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pr-10"
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">원</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">항목</Label>
          <Input
            id="desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 점심, 숙소, 택시"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>함께한 사람</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {selectedParticipants.size === participants.length ? '전체 해제' : '전체 선택'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {participants.map((p) => {
              const active = selectedParticipants.has(p.id)
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "justify-start",
                    active
                      ? "bg-amber-400 hover:bg-amber-500 text-orange-950 border-amber-400"
                      : "border-gray-200 text-gray-800 hover:border-orange-200 hover:text-orange-700"
                  )}
                  aria-pressed={active}
                  onClick={() => toggleParticipant(p.id)}
                >
                  {p.name}
                </Button>
              )
            })}
          </div>
        </div>

        <Button type="submit" className="w-full">
          추가
        </Button>
      </form>
    </div>
  )
}

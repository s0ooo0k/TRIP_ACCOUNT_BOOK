import { useState } from 'react'
import type { Participant } from '../utils/settlement'

interface Props {
  participants: Participant[]
  onAdd: (expense: {
    payerId: string
    amount: number
    description: string
    participantIds: string[]
  }) => void
}

export function ExpenseForm({ participants, onAdd }: Props) {
  const [payerId, setPayerId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())

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
    setPayerId('')
    setAmount('')
    setDescription('')
    setSelectedParticipants(new Set())
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
    setSelectedParticipants(new Set(participants.map(p => p.id)))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 추가</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              결제자
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">선택하세요</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              금액
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <span className="absolute right-4 top-2 text-gray-500">원</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            항목
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 점심, 숙소, 택시"
            className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              함께한 사람
            </label>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-sky-600 hover:text-sky-800"
            >
              전체 선택
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map(p => (
              <label
                key={p.id}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.has(p.id)}
                  onChange={() => toggleParticipant(p.id)}
                  className="w-4 h-4 text-sky-600 border-sky-300 rounded focus:ring-sky-500"
                />
                <span className="text-sm text-gray-700">{p.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
        >
          추가
        </button>
      </form>
    </div>
  )
}

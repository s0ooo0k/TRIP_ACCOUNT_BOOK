import { useState } from 'react'
import type { Participant } from '../utils/settlement'

interface Props {
  participants: Participant[]
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  isAdmin: boolean
}

export function ParticipantManager({ participants, onAdd, onRemove, isAdmin }: Props) {
  const [newName, setNewName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim()) {
      onAdd(newName.trim())
      setNewName('')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">참여자</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="inline-flex items-center gap-2 bg-sky-100 text-sky-800 px-4 py-2 rounded-full"
          >
            <span>{participant.name}</span>
            {isAdmin && participants.length > 2 && (
              <button
                onClick={() => onRemove(participant.id)}
                className="text-sky-600 hover:text-sky-800 font-bold"
                title="삭제"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="이름 입력"
          className="flex-1 px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        <button
          type="submit"
          disabled={!isAdmin}
          className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isAdmin ? '추가' : '관리자 전용'}
        </button>
      </form>
    </div>
  )
}

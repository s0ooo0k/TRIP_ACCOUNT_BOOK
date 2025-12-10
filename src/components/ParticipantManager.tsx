import { useState } from 'react'
import type { Participant } from '../utils/settlement'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
            className="inline-flex items-center gap-2 bg-orange-100 text-orange-900 px-4 py-2 rounded-full"
          >
            <span>{participant.name}</span>
            {isAdmin && participants.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(participant.id)}
                title="삭제"
              >
                ×
              </Button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="이름 입력"
        />
        <Button type="submit" disabled={!isAdmin}>
          {isAdmin ? '추가' : '관리자 전용'}
        </Button>
      </form>
    </div>
  )
}

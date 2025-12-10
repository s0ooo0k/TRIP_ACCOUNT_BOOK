// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Trip = { id: string; name: string }

type AdminPanelProps = {
  isAdmin: boolean
  onDataChanged?: () => void
}

export function AdminPanel({ isAdmin, onDataChanged }: AdminPanelProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripName, setTripName] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) loadTrips()
  }, [isAdmin])

  async function loadTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('id, name')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('어드민 trips 로드 실패:', error)
      setMessage('여행 목록을 불러오지 못했습니다.')
      return
    }
    setTrips(data || [])
    if (data && data.length > 0) {
      setSelectedTripId(data[0].id)
    }
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!tripName.trim()) {
      setMessage('여행 이름을 입력하세요.')
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.from('trips').insert({ name: tripName.trim() })
    if (error) {
      console.error('여행 생성 실패:', error)
      setMessage('여행 생성에 실패했습니다.')
    } else {
      setTripName('')
      setMessage('여행을 추가했습니다.')
      await loadTrips()
      onDataChanged?.()
    }
    setLoading(false)
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTripId) {
      setMessage('여행을 선택하세요.')
      return
    }
    if (!participantName.trim()) {
      setMessage('참여자 이름을 입력하세요.')
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await supabase
      .from('participants')
      .insert({ trip_id: selectedTripId, name: participantName.trim(), user_id: null })
    if (error) {
      console.error('참여자 추가 실패:', error)
      setMessage('참여자 추가에 실패했습니다.')
    } else {
      setParticipantName('')
      setMessage('참여자를 추가했습니다.')
      onDataChanged?.()
    }
    setLoading(false)
  }

  if (!isAdmin) return null

  return (
    <div className="mb-8 rounded-2xl border border-sky-200 bg-white/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">Admin</p>
          <h2 className="text-xl font-bold text-gray-800">어드민 패널</h2>
        </div>
        <button
          onClick={loadTrips}
          className="text-sm text-sky-600 hover:text-sky-800"
        >
          새로고침
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={createTrip} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sky-500" />
            <h3 className="font-semibold text-gray-800">여행 세션 추가</h3>
          </div>
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="예: 제주도 여행"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white font-semibold py-2 rounded-lg hover:bg-sky-700 disabled:bg-gray-300"
          >
            추가
          </button>
        </form>

        <form onSubmit={addParticipant} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="font-semibold text-gray-800">참여자 추가</h3>
          </div>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {trips.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="예: 한현진"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
          >
            추가
          </button>
        </form>
      </div>

      {message && (
        <div className="mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}
    </div>
  )
}
// @ts-nocheck

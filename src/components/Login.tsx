// @ts-nocheck
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Trip = {
  id: string
  name: string
}

type Participant = {
  id: string
  name: string
}

type LoginProps = {
  onLogin: (tripId: string, participant: Participant) => Promise<void> | void
  onAdminNavigate?: () => void
}

export function Login({ onLogin, onAdminNavigate }: LoginProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [participantName, setParticipantName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingTrips, setFetchingTrips] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSession()
  }, [])

  useEffect(() => {
    if (sessionReady) {
      loadTrips()
    }
  }, [sessionReady])

  async function ensureSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('세션 확인 실패:', error)
      setError('로그인 세션을 만들지 못했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (!data.session) {
      const { error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError) {
        console.error('익명 로그인 실패:', anonError)
        setError('익명 로그인에 실패했습니다. 새로고침 후 다시 시도해주세요.')
        return
      }
    }
    setSessionReady(true)
  }

  async function loadTrips() {
    setFetchingTrips(true)
    const { data, error } = await supabase
      .from('trips')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('여행 목록 로드 실패:', error)
      setError('여행 목록을 불러오지 못했습니다.')
    } else {
      setTrips(data || [])
      // 최근 생성 순으로 기본 선택
      if (data && data.length > 0) {
        setSelectedTripId(data[0].id)
      }
    }

    setFetchingTrips(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedTripId) {
      setError('여행을 선택해주세요.')
      return
    }

    const trimmed = participantName.trim()
    if (!trimmed) {
      setError('이름을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError('로그인 세션을 만들지 못했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    const sessionUserId = sessionData.session.user.id

    const { data: existing, error: fetchError } = await supabase
      .from('participants')
      .select('id, name, user_id')
      .eq('trip_id', selectedTripId)
      .ilike('name', trimmed)
      .maybeSingle()

    if (fetchError || !existing) {
      console.error('참여자 확인 실패:', fetchError)
      setError('해당 참여자를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    if (existing.user_id && existing.user_id !== sessionUserId) {
      setError('이미 다른 사용자가 이 이름으로 로그인했습니다.')
      setLoading(false)
      return
    }

    let participant = existing

    if (!existing.user_id) {
      const { data: claimed, error: claimError } = await supabase
        .from('participants')
        .update({ user_id: sessionUserId })
        .eq('id', existing.id)
        .select('id, name, user_id')
        .single()

      if (claimError || !claimed) {
        console.error('참여자 할당 실패:', claimError)
        setError('이름 할당에 실패했습니다. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      participant = claimed
    }

    await onLogin(selectedTripId, participant)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <Card className="bg-white/90">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">여행 세션 선택</CardTitle>
            <CardDescription>세션을 고르고 참여자 이름을 입력해 바로 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">여행 목록</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadTrips}
              disabled={fetchingTrips}
            >
              {fetchingTrips ? '불러오는 중...' : '새로고침'}
            </Button>
          </div>

          {trips.length === 0 && (
            <div className="text-gray-500 text-sm text-center border border-dashed border-gray-300 rounded-lg p-4">
              저장된 여행 세션이 없습니다. Supabase에서 먼저 생성해주세요.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trips.map((trip) => {
              const active = trip.id === selectedTripId
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setSelectedTripId(trip.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition shadow-sm ${
                    active
                      ? 'border-sky-500 bg-sky-50 text-sky-900'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-sky-200'
                  }`}
                >
                  <div className="font-semibold">{trip.name}</div>
                  <div className="text-xs text-gray-500">{trip.id.slice(0, 8)}...</div>
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block">참여자 이름</Label>
            <Input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="예: 한현진"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!sessionReady || loading || fetchingTrips || trips.length === 0}
          >
            {!sessionReady ? '세션 준비 중...' : loading ? '확인 중...' : '시작하기'}
          </Button>
        </form>

        {onAdminNavigate && (
          <div className="text-center">
            <Button variant="outline" onClick={onAdminNavigate}>
              관리자 페이지로 이동
            </Button>
          </div>
        )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
// @ts-nocheck

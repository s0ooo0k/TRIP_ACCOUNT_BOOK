// @ts-nocheck
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ParticipantManager } from '@/components/ParticipantManager'
import { ExpenseForm } from '@/components/ExpenseForm'
import { ExpenseList } from '@/components/ExpenseList'
import { SettlementGuide } from '@/components/SettlementGuide'

export function MainDashboard({
  tripId,
  tripName,
  user,
  participants,
  expenses,
  settlements,
  role,
  onAddExpense,
  onDeleteExpense,
  onLogout,
}: any) {
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
  const [activeSection, setActiveSection] = useState<'summary' | 'participants' | 'expenses' | 'settlement'>('expenses')

  const sections = [
    { id: 'expenses', label: '지출' },
    { id: 'summary', label: '요약' },
    { id: 'participants', label: '참여자' },
    { id: 'settlement', label: '정산' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:grid lg:grid-cols-[230px,1fr] lg:gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block sticky top-4 self-start">
          <div className="rounded-2xl border border-orange-100 bg-white/90 shadow-sm p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Navigation</p>
            </div>
            <div className="flex flex-col gap-2">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant={activeSection === s.id ? 'secondary' : 'ghost'}
                  className="justify-start w-full"
                  onClick={() => setActiveSection(s.id as any)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="pt-4 border-t border-orange-100 space-y-2 text-sm text-gray-700">
              <div className="font-semibold">세션</div>
              <div className="text-gray-600">{tripName || tripId.slice(0, 8) + '...'}</div>
              <div className="font-semibold mt-2">사용자</div>
              <div className="text-gray-600">{user.name}</div>
              <Button variant="outline" className="w-full mt-3" onClick={onLogout}>로그아웃</Button>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Trip Dashboard</p>
              <h1 className="text-3xl font-bold text-gray-900">여행 정산</h1>
              <p className="text-sm text-gray-600">한 화면에서 참여자·지출·정산을 관리하세요</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700 lg:hidden">
              <div className="px-3 py-2 rounded-lg bg-white/80 border border-orange-100 shadow-sm">
                <span className="font-semibold">세션</span>{' '}
                <span className="text-gray-600">{tripName || tripId.slice(0, 8) + '...'}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white/80 border border-orange-100 shadow-sm">
                <span className="font-semibold">사용자</span>{' '}
                <span className="text-gray-600">{user.name}</span>
              </div>
              <Button variant="ghost" onClick={onLogout}>로그아웃</Button>
            </div>
          </header>

          {/* Mobile quick nav */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {sections.map((s) => (
              <Button
                key={s.id}
                variant={activeSection === s.id ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setActiveSection(s.id as any)}
                className="shrink-0"
              >
                {s.label}
              </Button>
            ))}
          </div>

          {/* Summary cards */}
          {activeSection === 'summary' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">참여자</p>
                <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">총 지출</p>
                <p className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString()}원</p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">정산 건수</p>
                <p className="text-2xl font-bold text-gray-900">{settlements.length}</p>
              </div>
            </div>
          )}

          {activeSection === 'participants' && (
            <ParticipantManager participants={participants} />
          )}

          {activeSection === 'expenses' && (
            <div className="space-y-4">
              {participants.length >= 2 ? (
                <ExpenseForm
                  participants={participants}
                  currentParticipantId={user.id}
                  onAdd={onAddExpense}
                />
              ) : (
                <div className="text-sm text-gray-500">
                  참여자가 2명 이상일 때 지출을 추가할 수 있습니다.
                </div>
              )}

              <ExpenseList expenses={expenses} participants={participants} />
            </div>
          )}

          {activeSection === 'settlement' && expenses.length > 0 && (
              <SettlementGuide
                settlements={settlements}
                participants={participants}
                expenses={expenses}
              />
          )}

          {activeSection === 'settlement' && expenses.length === 0 && (
            <div className="text-sm text-gray-500">정산 안내를 보려면 지출을 추가하세요.</div>
          )}

          <footer className="text-center mt-6 text-xs text-gray-500 pb-2">
            데이터는 Supabase에 실시간 저장됩니다
          </footer>
        </div>
      </div>
    </div>
  )
}

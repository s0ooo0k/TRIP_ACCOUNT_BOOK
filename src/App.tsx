// @ts-nocheck
import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { AdminPage } from './pages/AdminPage'
import { MainDashboard } from './routes/MainDashboard'
import { calculateSettlements } from './utils/settlement'
import type { Expense, Participant, TreasuryTx, DuesGoal, ParticipantAccount, TripTreasuryAccount, ExpenseImageInput } from './utils/settlement'
import type { Database } from './lib/database.types'

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dues, setDues] = useState<DuesGoal[]>([])
  const [tripId, setTripId] = useState<string | null>(null)
  const [tripName, setTripName] = useState<string>('')
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [treasury, setTreasury] = useState<TreasuryTx[]>([])
  const [accounts, setAccounts] = useState<ParticipantAccount[]>([])
  const [tripTreasuryAccount, setTripTreasuryAccount] = useState<TripTreasuryAccount | null>(null)
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([])
  const [deletedDues, setDeletedDues] = useState<DuesGoal[]>([])
  const [deletedTreasury, setDeletedTreasury] = useState<TreasuryTx[]>([])
  const [loading, setLoading] = useState(true)

  const settlements = calculateSettlements(participants, expenses)

  useEffect(() => {
    restoreSession()
  }, [])

  // realtime subscriptions
  useEffect(() => {
    if (!tripId) return
    const channel = supabase
      .channel('participants_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `trip_id=eq.${tripId}` }, () => {
        loadParticipants()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tripId])

  useEffect(() => {
    if (!tripId) return
    const channel = supabase
      .channel('expenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => {
        loadExpenses()
        loadDeletedExpenses()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tripId])

  async function restoreSession() {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다. README.md의 설정 가이드를 확인해주세요.')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
        const { error: anonError } = await supabase.auth.signInAnonymously()
        if (anonError) throw anonError
      }

      const { data: ensuredSession, error: ensuredError } = await supabase.auth.getSession()
      if (ensuredError || !ensuredSession.session) throw ensuredError || new Error('세션을 만들지 못했습니다.')
      const currentUserId = ensuredSession.session.user.id

      const savedTripId = localStorage.getItem('tripId')
      const savedParticipantId = localStorage.getItem('participantId')
      const savedTripName = localStorage.getItem('tripName') || ''

      if (savedTripId && savedParticipantId) {
        const { data } = await supabase
          .from('participants')
          .select('id, name, trip_id, user_id')
          .eq('trip_id', savedTripId)
          .eq('id', savedParticipantId)
          .maybeSingle()

        if (data && data.user_id === currentUserId) {
          setTripId(savedTripId)
          if (savedTripName) setTripName(savedTripName)
          setUser({ id: data.id, name: data.name })
          if (!savedTripName) {
            const { data: tripRow } = await supabase
              .from('trips')
              .select('name')
              .eq('id', savedTripId)
              .maybeSingle()
            if (tripRow?.name) {
              setTripName(tripRow.name)
              localStorage.setItem('tripName', tripRow.name)
            }
          }
          await syncRole()
          await loadParticipants(savedTripId)
          await loadExpenses(savedTripId)
          await loadDeletedExpenses(savedTripId)
          await loadAccounts(savedTripId)
          await loadTripTreasuryAccount(savedTripId)
          await loadDues(savedTripId)
          await loadDeletedDues(savedTripId)
          await loadTreasury(savedTripId)
          await loadDeletedTreasury(savedTripId)
        } else {
          clearLocalSession()
        }
      }
    } catch (error) {
      console.error('세션 복원 오류:', error)
      alert(error instanceof Error ? error.message : '데이터 로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function clearLocalSession() {
    localStorage.removeItem('tripId')
    localStorage.removeItem('participantId')
    localStorage.removeItem('participantName')
    localStorage.removeItem('tripName')
  }

  async function syncRole() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setRole('user')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert<ProfileRow>({ id: userId, role: 'user' } as ProfileRow)
      if (insertError) {
        console.error('profiles insert error', insertError)
      }
      setRole('user')
    } else {
      setRole(profile.role === 'admin' ? 'admin' : 'user')
    }
  }

  async function handleLogin(selectedTrip: { id: string; name: string }, participant: { id: string; name: string }) {
    setTripId(selectedTrip.id)
    setTripName(selectedTrip.name)
    setUser({ id: participant.id, name: participant.name })
    localStorage.setItem('tripId', selectedTrip.id)
    localStorage.setItem('tripName', selectedTrip.name)
    localStorage.setItem('participantId', participant.id)
    localStorage.setItem('participantName', participant.name)

    await syncRole()
    await loadParticipants(selectedTrip.id)
    await loadAccounts(selectedTrip.id)
    await loadTripTreasuryAccount(selectedTrip.id)
    await loadExpenses(selectedTrip.id)
    await loadDues(selectedTrip.id)
    await loadTreasury(selectedTrip.id)
  }

  function handleLogout() {
    supabase.auth.signOut().catch(err => console.error('로그아웃 실패:', err))
    setTripId(null)
    setUser(null)
    setRole('user')
    setParticipants([])
    setExpenses([])
    setAccounts([])
    setTripTreasuryAccount(null)
    clearLocalSession()
  }

  async function adminLoggedIn() {
    // 로그인 후 현재 사용자 정보를 반영
    const { data } = await supabase.auth.getUser()
    const u = data.user
    if (u) setUser({ id: u.id, name: u.email || '관리자' })
    await syncRole()
  }

  async function loadParticipants(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('trip_id', targetId)
      .order('name') as { data: ParticipantRow[] | null; error: any }
    if (error) {
      console.error('참여자 로드 오류:', error)
      return
    }
    setParticipants(data || [])
  }

  async function loadExpenses(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }) as { data: ExpenseRow[] | null; error: any }
    if (expensesError) {
      console.error('결제 내역 로드 오류:', expensesError)
      return
    }

    const expensesWithParticipants = await Promise.all(
      (expensesData || []).map(async (expense) => {
        const { data: participantData } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id) as { data: ExpenseParticipantRow[] | null; error: any }

        let imagesWithUrls: any[] = []
        try {
          const { data: imageRows, error: imageError } = await supabase
            .from('expense_images')
            .select('*')
            .eq('expense_id', expense.id)
            .order('created_at', { ascending: true })
          if (!imageError && imageRows) {
            imagesWithUrls = await Promise.all(
              imageRows.map(async (img: any) => {
                const { data: signed } = await supabase.storage
                  .from('expense-images')
                  .createSignedUrl(img.path, 60 * 60)
                return { ...img, url: signed?.signedUrl || null }
              })
            )
          } else if (imageError) {
            console.warn('expense_images 로드 오류:', imageError)
          }
        } catch (err) {
          console.warn('expense_images 테이블이 아직 없을 수 있습니다:', err)
        }

        return {
          ...(expense as ExpenseRow),
          participant_ids: participantData?.map(p => p.participant_id) || [],
          images: imagesWithUrls
        }
      })
    )

    setExpenses(expensesWithParticipants)
  }

  async function loadDeletedExpenses(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (expensesError) {
      console.error('삭제된 결제 내역 로드 오류:', expensesError)
      return
    }

    const expensesWithParticipants = await Promise.all(
      (expensesData || []).map(async (expense: any) => {
        const { data: participantData } = await supabase
          .from('expense_participants')
          .select('participant_id')
          .eq('expense_id', expense.id)

        let imagesWithUrls: any[] = []
        try {
          const { data: imageRows } = await supabase
            .from('expense_images')
            .select('*')
            .eq('expense_id', expense.id)
            .order('created_at', { ascending: true })
          if (imageRows) {
            imagesWithUrls = await Promise.all(
              imageRows.map(async (img: any) => {
                const { data: signed } = await supabase.storage
                  .from('expense-images')
                  .createSignedUrl(img.path, 60 * 60)
                return { ...img, url: signed?.signedUrl || null }
              })
            )
          }
        } catch (err) {
          console.warn('expense_images 로드 오류:', err)
        }

        return {
          ...(expense as any),
          participant_ids: participantData?.map((p: any) => p.participant_id) || [],
          images: imagesWithUrls
        }
      })
    )

    setDeletedExpenses(expensesWithParticipants as any)
  }

  async function loadDues(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('회비 목표 로드 오류:', error)
      return
    }
    setDues((data || []) as DuesGoal[])
  }

  async function loadDeletedDues(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) {
      console.error('삭제된 회비 목표 로드 오류:', error)
      return
    }
    setDeletedDues((data || []) as any)
  }

  async function loadTreasury(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('정산 기록 로드 오류:', error)
      return
    }
    setTreasury(data || [])
  }

  async function loadDeletedTreasury(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .eq('trip_id', targetId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
    if (error) {
      console.error('삭제된 정산 기록 로드 오류:', error)
      return
    }
    setDeletedTreasury(data || [])
  }

  async function loadAccounts(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('participant_accounts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('계좌 정보 로드 오류:', error)
      return
    }
    setAccounts((data || []) as ParticipantAccount[])
  }

  async function loadTripTreasuryAccount(id?: string) {
    const targetId = id || tripId
    if (!targetId) return
    const { data, error } = await supabase
      .from('trip_treasury_accounts')
      .select('*')
      .eq('trip_id', targetId)
      .maybeSingle()
    if (error) {
      console.error('공금 계좌 로드 오류:', error)
      return
    }
    setTripTreasuryAccount((data as TripTreasuryAccount) || null)
  }

  async function handleUpsertTripTreasuryAccount(data: {
    bankName: string
    accountNumber: string
    accountHolder: string
    memo?: string
  }) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 공금 계좌를 설정할 수 있습니다.')
      return
    }
    const payload = {
      trip_id: tripId,
      treasurer_id: current.id,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      account_holder: data.accountHolder,
      memo: data.memo || null
    }
    const { error } = await supabase
      .from('trip_treasury_accounts')
      .upsert(payload, { onConflict: 'trip_id' })
    if (error) {
      console.error('공금 계좌 저장 오류:', error)
      alert('공금 계좌를 저장하지 못했습니다.')
      return
    }
    await loadTripTreasuryAccount()
    alert('공금 계좌를 저장했습니다.')
  }

  async function handleUpsertAccount(data: {
    bankName: string
    accountNumber: string
    accountHolder: string
    isPublic: boolean
  }) {
    if (!user) return
    const payload = {
      participant_id: user.id,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      account_holder: data.accountHolder,
      is_public: data.isPublic
    }
    const { error } = await supabase
      .from('participant_accounts')
      .upsert(payload, { onConflict: 'participant_id' })
    if (error) {
      console.error('계좌 정보 저장 오류:', error)
      alert('계좌 정보를 저장하지 못했습니다.')
      return
    }

    // 공개/비공개 여부와 관계없이 계좌 등록 여부만 표시할 수 있도록 플래그 업데이트
    const { error: flagError } = await supabase
      .from('participants')
      .update({ has_account: true })
      .eq('id', user.id)
    if (flagError) {
      console.error('has_account 업데이트 오류:', flagError)
    }
    await loadAccounts()
    alert('계좌 정보를 저장했습니다.')
  }

  async function handleAddParticipant(name: string) {
    if (!tripId) return
    const { error } = await supabase
      .from('participants')
      .insert({ trip_id: tripId, name } as Partial<ParticipantRow>)
    if (error) {
      console.error('참여자 추가 오류:', error)
      alert('참여자 추가에 실패했습니다.')
      return
    }
    await loadParticipants()
  }

  async function handleRemoveParticipant(id: string) {
    if (participants.length <= 2) {
      alert('최소 2명의 참여자가 필요합니다.')
      return
    }

    const hasExpenses = expenses.some(
      expense => expense.payer_id === id || expense.participant_ids.includes(id)
    )
    if (hasExpenses) {
      alert('이 참여자가 포함된 결제 내역이 있습니다. 먼저 결제 내역을 삭제해주세요.')
      return
    }

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('참여자 삭제 오류:', error)
      alert('참여자 삭제에 실패했습니다.')
      return
    }
    await loadParticipants()
  }

  async function handleAddExpense(expenseData: { payerId: string; amount: number; description: string; participantIds: string[]; images?: ExpenseImageInput[] }) {
    if (!tripId) return
    const current = participants.find(p => p.id === user?.id)
    if (!current?.is_treasurer) {
      alert('총무 권한이 있는 사용자만 지출을 추가할 수 있습니다.')
      return
    }
    const { data: newExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        payer_id: expenseData.payerId,
        amount: expenseData.amount,
        description: expenseData.description,
        created_by: user?.id ?? null
      } as Partial<ExpenseRow>)
      .select()
      .single()
    if (expenseError) {
      console.error('결제 추가 오류:', expenseError)
      alert('결제 추가에 실패했습니다.')
      return
    }

    const participantMappings = expenseData.participantIds.map(participantId => ({
      expense_id: newExpense.id,
      participant_id: participantId
    })) as Partial<ExpenseParticipantRow>[]
    const { error: mappingError } = await supabase
      .from('expense_participants')
      .insert(participantMappings)
    if (mappingError) {
      console.error('참여자 매핑 오류:', mappingError)
      await supabase.from('expenses').delete().eq('id', newExpense.id)
      alert('결제 추가에 실패했습니다.')
      return
    }

    const images = expenseData.images || []
    if (images.length > 0) {
      const uploadedRows: any[] = []
      for (const img of images) {
        try {
          const path = `${tripId}/${newExpense.id}/${crypto.randomUUID()}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('expense-images')
            .upload(path, img.blob, {
              contentType: img.mimeType || 'image/jpeg',
              upsert: false
            })
          if (uploadError) {
            console.error('이미지 업로드 오류:', uploadError)
            continue
          }
          uploadedRows.push({
            expense_id: newExpense.id,
            path,
            mime_type: img.mimeType,
            size: img.size,
            width: img.width,
            height: img.height
          })
        } catch (err) {
          console.error('이미지 업로드 처리 오류:', err)
        }
      }

      if (uploadedRows.length > 0) {
        const { error: insertImagesError } = await supabase
          .from('expense_images')
          .insert(uploadedRows)
        if (insertImagesError) {
          console.error('expense_images 저장 오류:', insertImagesError)
        }
      }
    }

    await loadExpenses()
  }

  async function handleAddTreasury(tx: { direction: 'receive' | 'send'; counterpartyId: string; amount: number; memo: string; dueId?: string }) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 기록할 수 있습니다.')
      return
    }
    const { error } = await supabase
      .from('treasury_transactions')
      .insert({
        trip_id: tripId,
        treasurer_id: current.id,
        direction: tx.direction,
        counterparty_id: tx.counterpartyId,
        amount: tx.amount,
        memo: tx.memo,
        due_id: tx.dueId || null
      })
    if (error) {
      console.error('정산 기록 추가 오류:', error)
      alert('정산 기록 추가에 실패했습니다.')
      return
    }
    await loadTreasury()
  }

  async function handleAddDue(due: { title: string; dueDate: string | null; target: number }) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 회비 목표를 추가할 수 있습니다.')
      return
    }
    const { error } = await supabase
      .from('dues')
      .insert({
        trip_id: tripId,
        title: due.title,
        due_date: due.dueDate,
        target_amount: due.target
      })
    if (error) {
      console.error('회비 목표 추가 오류:', error)
      alert('회비 목표 추가에 실패했습니다.')
      return
    }
    await loadDues()
  }

  async function handleDeleteExpense(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 삭제할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 지출을 삭제할까요? 삭제된 내역 탭에서 복구할 수 있습니다.')
    if (!ok) return
    const { error } = await supabase
      .from('expenses')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', id)
    if (error) {
      console.error('결제 삭제 오류:', error)
      alert('결제 삭제에 실패했습니다.')
      return
    }
    await loadExpenses()
    await loadDeletedExpenses()
  }

  async function handleRestoreExpense(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 복구할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 지출을 복구할까요?')
    if (!ok) return
    const { error } = await supabase
      .from('expenses')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', id)
    if (error) {
      console.error('결제 복구 오류:', error)
      alert('결제 복구에 실패했습니다.')
      return
    }
    await loadExpenses()
    await loadDeletedExpenses()
  }

  async function handleDeleteDue(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 삭제할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 회비 목표를 삭제할까요? 삭제된 내역 탭에서 복구할 수 있습니다.')
    if (!ok) return
    const { error } = await supabase
      .from('dues')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', id)
    if (error) {
      console.error('회비 목표 삭제 오류:', error)
      alert('회비 목표 삭제에 실패했습니다.')
      return
    }
    await loadDues()
    await loadDeletedDues()
  }

  async function handleRestoreDue(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 복구할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 회비 목표를 복구할까요?')
    if (!ok) return
    const { error } = await supabase
      .from('dues')
      .update({ is_deleted: false, deleted_at: null, deleted_by: null })
      .eq('id', id)
    if (error) {
      console.error('회비 목표 복구 오류:', error)
      alert('회비 목표 복구에 실패했습니다.')
      return
    }
    await loadDues()
    await loadDeletedDues()
  }

  async function handleDeleteTreasuryTx(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 삭제할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 정산/입출금 기록을 삭제할까요? 삭제된 내역 탭에서 복구할 수 있습니다.')
    if (!ok) return
    const { error } = await supabase
      .from('treasury_transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', id)
    if (error) {
      console.error('정산 기록 삭제 오류:', error)
      alert('정산 기록 삭제에 실패했습니다.')
      return
    }
    await loadTreasury()
    await loadDeletedTreasury()
  }

  async function handleRestoreTreasuryTx(id: string) {
    if (!tripId || !user) return
    const current = participants.find(p => p.id === user.id)
    if (!current?.is_treasurer) {
      alert('총무만 복구할 수 있습니다.')
      return
    }
    const ok = window.confirm('이 정산/입출금 기록을 복구할까요?')
    if (!ok) return
    const { error } = await supabase
      .from('treasury_transactions')
      .update({ is_deleted: false, deleted_at: null, deleted_by: null })
      .eq('id', id)
    if (error) {
      console.error('정산 기록 복구 오류:', error)
      alert('정산 기록 복구에 실패했습니다.')
      return
    }
    await loadTreasury()
    await loadDeletedTreasury()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminPage
            isAdmin={!!user}
            role={role}
            onLoginSuccess={adminLoggedIn}
            onLogout={handleLogout}
            onDataChanged={() => {
              loadParticipants()
              loadExpenses()
            }}
          />
        }
      />
      <Route
        path="/"
        element={
          tripId && user ? (
            <MainDashboard
              tripId={tripId}
              tripName={tripName}
              user={user}
              participants={participants}
              expenses={expenses}
              settlements={settlements}
              role={role}
              treasury={treasury}
              dues={dues}
              accounts={accounts}
              tripTreasuryAccount={tripTreasuryAccount}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onDeleteDue={handleDeleteDue}
              onDeleteTreasuryTx={handleDeleteTreasuryTx}
              deletedExpenses={deletedExpenses}
              deletedDues={deletedDues}
              deletedTreasury={deletedTreasury}
              onRestoreExpense={handleRestoreExpense}
              onRestoreDue={handleRestoreDue}
              onRestoreTreasury={handleRestoreTreasuryTx}
              onAddTreasury={handleAddTreasury}
              onAddDue={handleAddDue}
              onUpsertAccount={handleUpsertAccount}
              onUpsertTripTreasuryAccount={handleUpsertTripTreasuryAccount}
              onLogout={handleLogout}
            />
          ) : (
            <Login onLogin={handleLogin} onAdminNavigate={() => { window.location.assign('/admin') }} />
          )
        }
      />
    </Routes>
  )
}

export default App
type ParticipantRow = Database['public']['Tables']['participants']['Row']
type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type ExpenseParticipantRow = Database['public']['Tables']['expense_participants']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type TripRow = Database['public']['Tables']['trips']['Row']
// @ts-nocheck

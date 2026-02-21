import { useEffect, useMemo, useState } from 'react'
import type { Participant, ParticipantAccount } from '../utils/settlement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  participants: Participant[]
  currentParticipantId?: string
  isTreasurer?: boolean
  accounts?: ParticipantAccount[]
  onUpsertAccount?: (data: {
    participantId: string
    bankName: string
    accountNumber: string
    accountHolder: string
    isPublic: boolean
  }) => void
}

export function ParticipantManager({ participants, currentParticipantId, isTreasurer = false, accounts = [], onUpsertAccount }: Props) {
  const [selectedParticipantId, setSelectedParticipantId] = useState('')

  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!isTreasurer) {
      setSelectedParticipantId(currentParticipantId || '')
      return
    }
    if (!selectedParticipantId || !participants.some(p => p.id === selectedParticipantId)) {
      setSelectedParticipantId(currentParticipantId || participants[0]?.id || '')
    }
  }, [currentParticipantId, isTreasurer, participants, selectedParticipantId])

  const accountsMap = useMemo(() => {
    const map = new Map<string, ParticipantAccount>()
    accounts.forEach(a => map.set(a.participant_id, a))
    return map
  }, [accounts])

  const selectedParticipant = useMemo(
    () => participants.find(p => p.id === selectedParticipantId),
    [participants, selectedParticipantId]
  )

  const selectedAccount = useMemo(
    () => accounts.find(a => a.participant_id === selectedParticipantId),
    [accounts, selectedParticipantId]
  )

  useEffect(() => {
    if (selectedAccount) {
      setBankName(selectedAccount.bank_name || '')
      setAccountNumber(selectedAccount.account_number || '')
      setAccountHolder(selectedAccount.account_holder || '')
      setIsPublic(!!selectedAccount.is_public)
      return
    }
    setBankName('')
    setAccountNumber('')
    setAccountHolder('')
    setIsPublic(false)
  }, [selectedAccount?.id, selectedParticipantId])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onUpsertAccount) return
    if (!selectedParticipantId) {
      alert('계좌 정보를 등록할 참여자를 선택해주세요.')
      return
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      alert('은행명, 계좌번호, 예금주를 모두 입력해주세요.')
      return
    }
    onUpsertAccount({
      participantId: selectedParticipantId,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
      isPublic
    })
  }

  if (participants.length === 0) {
    return <div className="text-sm text-gray-500">등록된 참여자가 없습니다.</div>
  }

  const editingOther = !!(isTreasurer && currentParticipantId && selectedParticipantId && selectedParticipantId !== currentParticipantId)
  const checkboxId = `account-public-${selectedParticipantId || 'self'}`

  return (
    <div className="space-y-4">
      {currentParticipantId && onUpsertAccount && (
        <Card className="bg-white/90 border-orange-100">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingOther ? `${selectedParticipant?.name || '참여자'} 계좌번호 등록` : '내 계좌번호 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {isTreasurer && (
                <div className="space-y-2 sm:col-span-3">
                  <Label>등록 대상</Label>
                  <Select value={selectedParticipantId} onChange={(e) => setSelectedParticipantId(e.target.value)}>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}{participant.id === currentParticipantId ? ' (나)' : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500">총무는 다른 참여자의 계좌를 대신 등록/수정할 수 있습니다.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>은행명</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행" />
              </div>
              <div className="space-y-2">
                <Label>계좌번호</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="숫자만 입력" />
              </div>
              <div className="space-y-2">
                <Label>예금주</Label>
                <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="예: 홍길동" />
              </div>
              <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                <Checkbox
                  id={checkboxId}
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <Label htmlFor={checkboxId} className="cursor-pointer">일행에게도 계좌 공개</Label>
                <span className="text-xs text-gray-500">체크 해제 시 총무/본인만 볼 수 있어요.</span>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" className="w-full sm:w-auto">
                  {selectedAccount ? '수정 저장' : '등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white">
        <Table>
          <TableHeader className="bg-orange-50">
            <TableRow className="hover:bg-orange-50">
              <TableHead>이름</TableHead>
              <TableHead>계좌</TableHead>
              <TableHead className="w-24 text-center">총무</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => {
              const acc = accountsMap.get(participant.id)
              return (
                <TableRow key={participant.id} className="hover:bg-orange-50">
                  <TableCell>{participant.name}</TableCell>
                  <TableCell>
                    {acc ? (
                      <div className="text-sm text-gray-800 space-y-0.5">
                        <div>{acc.bank_name} {acc.account_number}</div>
                        <div className="text-xs text-gray-500">{acc.account_holder}{acc.is_public ? ' · 공개' : ' · 총무만'}</div>
                      </div>
                    ) : participant.has_account ? (
                      <span className="text-xs text-gray-500">비공개</span>
                    ) : (
                      <span className="text-xs text-gray-400">미등록</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {participant.is_treasurer ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold">
                        총무
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

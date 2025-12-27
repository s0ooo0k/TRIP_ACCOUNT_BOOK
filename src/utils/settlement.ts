export interface Participant {
  id: string
  name: string
  is_treasurer?: boolean
  has_account?: boolean
}

export interface Expense {
  id: string
  payer_id: string
  amount: number
  description: string | null
  participant_ids: string[]
  created_by?: string | null
  images?: ExpenseImage[]
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by?: string | null
  is_settled?: boolean
  settled_at?: string | null
  settled_by?: string | null
}

export interface ExpenseImage {
  id: string
  expense_id: string
  path: string
  url?: string | null
  mime_type?: string | null
  size?: number | null
  width?: number | null
  height?: number | null
  created_at?: string
}

export interface ExpenseImageInput {
  blob: Blob
  originalName: string
  mimeType: string
  size: number
  width: number
  height: number
}

export interface TreasuryTx {
  id: string
  trip_id: string
  treasurer_id: string | null
  direction: 'receive' | 'send'
  counterparty_id: string | null
  amount: number
  memo: string | null
  created_at?: string
  due_id?: string | null
  expense_id?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by?: string | null
}

export interface ParticipantAccount {
  id: string
  participant_id: string
  bank_name: string
  account_number: string
  account_holder: string
  is_public: boolean
  created_at?: string
  updated_at?: string
}

export interface TripTreasuryAccount {
  id: string
  trip_id: string
  treasurer_id?: string | null
  bank_name: string
  account_number: string
  account_holder: string
  memo?: string | null
  created_at?: string
  updated_at?: string
}

export interface DuesGoal {
  id: string
  trip_id: string
  title: string
  due_date: string | null
  target_amount: number
  created_at?: string
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by?: string | null
}

export interface PersonalSettlement {
  personId: string
  personName: string
  settlements: Array<{
    toId: string
    toName: string
    amount: number
  }>
  totalAmount: number
}

/**
 * 개별 정산 계산
 * 각 참여자가 다른 참여자들에게 개별적으로 얼마씩 줘야 하는지 계산
 */
export function calculateSettlements(
  participants: Participant[],
  expenses: Expense[]
): PersonalSettlement[] {
  const participantMap = new Map(participants.map(p => [p.id, p.name]))

  // 각 사람이 다른 사람에게 줘야 할 금액을 저장 (from -> to -> amount)
  const debts = new Map<string, Map<string, number>>()

  // 초기화
  participants.forEach(p => {
    debts.set(p.id, new Map())
  })

  // 각 결제 건마다 개별 정산 계산
  expenses.forEach(expense => {
    const payer = expense.payer_id
    const splitAmount = expense.amount / expense.participant_ids.length

    expense.participant_ids.forEach(participantId => {
      if (participantId !== payer) {
        // participantId가 payer에게 줘야 할 금액
        const currentDebt = debts.get(participantId)?.get(payer) || 0
        debts.get(participantId)?.set(payer, currentDebt + splitAmount)
      }
    })
  })

  // PersonalSettlement 형태로 변환
  const results: PersonalSettlement[] = []

  participants.forEach(person => {
    const personDebts = debts.get(person.id) || new Map()
    const settlements: Array<{ toId: string; toName: string; amount: number }> = []
    let totalAmount = 0

    personDebts.forEach((amount, toId) => {
      if (amount > 0.01) { // 1원 이상만 표시
        const roundedAmount = Math.round(amount)
        settlements.push({
          toId,
          toName: participantMap.get(toId) || toId,
          amount: roundedAmount
        })
        totalAmount += roundedAmount
      }
    })

    // 정산할 금액이 있는 사람만 추가
    if (settlements.length > 0) {
      results.push({
        personId: person.id,
        personName: person.name,
        settlements,
        totalAmount
      })
    }
  })

  return results
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR')
}

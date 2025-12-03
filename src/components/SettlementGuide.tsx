import type { PersonalSettlement } from '../utils/settlement'
import { formatCurrency } from '../utils/settlement'

interface Props {
  settlements: PersonalSettlement[]
}

export function SettlementGuide({ settlements }: Props) {
  if (settlements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">정산 안내</h2>
        <p className="text-gray-500 text-center py-8">정산이 완료되었습니다!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">정산 안내</h2>

      <div className="space-y-6">
        {settlements.map((personalSettlement) => (
          <div key={personalSettlement.personId} className="border-l-4 border-sky-500 pl-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">
                {personalSettlement.personName}
              </h3>
              <span className="text-sm font-medium text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                총 {formatCurrency(personalSettlement.totalAmount)}원
              </span>
            </div>

            <div className="space-y-2">
              {personalSettlement.settlements.map((settlement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-gray-700">{settlement.toName}에게</span>
                  </div>
                  <span className="font-bold text-sky-600">
                    {formatCurrency(settlement.amount)}원
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-sky-100 rounded-lg p-4 text-center mt-6">
        <p className="text-sky-800 font-medium">
          위 금액대로 송금하면 정산 완료!
        </p>
      </div>
    </div>
  )
}

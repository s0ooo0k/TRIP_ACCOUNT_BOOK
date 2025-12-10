import type { Participant } from '../utils/settlement'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  participants: Participant[]
}

export function ParticipantManager({ participants }: Props) {
  if (participants.length === 0) {
    return <div className="text-sm text-gray-500">등록된 참여자가 없습니다.</div>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-orange-100 bg-white">
      <Table>
        <TableHeader className="bg-orange-50">
          <TableRow className="hover:bg-orange-50">
            <TableHead>이름</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id} className="hover:bg-orange-50">
              <TableCell>{participant.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

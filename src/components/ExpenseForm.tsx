import { useEffect, useRef, useState } from 'react'
import type { Participant, ExpenseImageInput } from '../utils/settlement'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  participants: Participant[]
  currentParticipantId?: string
  onAdd: (expense: {
    payerId: string
    amount: number
    description: string
    participantIds: string[]
    images?: ExpenseImageInput[]
  }) => void
}

export function ExpenseForm({ participants, currentParticipantId, onAdd }: Props) {
  const [payerId, setPayerId] = useState(currentParticipantId || '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(currentParticipantId ? [currentParticipantId] : [])
  )
  const [images, setImages] = useState<(ExpenseImageInput & { previewUrl: string })[]>([])
  const [optimizing, setOptimizing] = useState(false)
  const imagesRef = useRef(images)
  const MAX_IMAGES = 5

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  // 기본 결제자: 현재 로그인 사용자
  useEffect(() => {
    if (currentParticipantId) {
      setPayerId(currentParticipantId)
      setSelectedParticipants((prev) => {
        const next = new Set(prev)
        next.add(currentParticipantId)
        return next
      })
    }
  }, [currentParticipantId])

  async function optimizeImage(file: File): Promise<ExpenseImageInput & { previewUrl: string }> {
    const maxDim = 1280
    const quality = 0.7

    let width = 0
    let height = 0
    let source: CanvasImageSource

    try {
      const bitmap = await createImageBitmap(file)
      width = bitmap.width
      height = bitmap.height
      source = bitmap
    } catch {
      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(objectUrl)
          resolve(img)
        }
        img.onerror = (err) => {
          URL.revokeObjectURL(objectUrl)
          reject(err)
        }
        img.src = objectUrl
      })
      width = imgEl.naturalWidth
      height = imgEl.naturalHeight
      source = imgEl
    }

    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas context not available')
    ctx.drawImage(source, 0, 0, targetW, targetH)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      )
    })

    if (source instanceof ImageBitmap) {
      source.close()
    }

    const previewUrl = URL.createObjectURL(blob)

    return {
      blob,
      originalName: file.name,
      mimeType: 'image/jpeg',
      size: blob.size,
      width: targetW,
      height: targetH,
      previewUrl
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      alert(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`)
      e.target.value = ''
      return
    }

    const targetFiles = files.slice(0, remaining)
    if (targetFiles.length < files.length) {
      alert(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`)
    }

    setOptimizing(true)
    try {
      const optimized: (ExpenseImageInput & { previewUrl: string })[] = []
      for (const f of targetFiles) {
        try {
          optimized.push(await optimizeImage(f))
        } catch (err) {
          console.error('이미지 최적화 실패:', err)
          alert('일부 이미지를 처리하지 못했습니다.')
        }
      }
      setImages(prev => [...prev, ...optimized])
    } finally {
      setOptimizing(false)
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!payerId || !amount || selectedParticipants.size === 0) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('올바른 금액을 입력해주세요.')
      return
    }

    onAdd({
      payerId,
      amount: amountNum,
      description: description || '기타',
      participantIds: Array.from(selectedParticipants),
      images: images.map(({ previewUrl, ...rest }) => rest)
    })

    // Reset form
    setAmount('')
    setDescription('')
    images.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setImages([])
  }

  const toggleParticipant = (id: string) => {
    const newSet = new Set(selectedParticipants)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedParticipants(newSet)
  }

  const selectAll = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set())
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.id)))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 추가</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payer">결제자</Label>
            <Select
              id="payer"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              <option value="">선택하세요</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">금액</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pr-10"
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">원</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">항목</Label>
          <Input
            id="desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 점심, 숙소, 택시"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>함께한 사람</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {selectedParticipants.size === participants.length ? '전체 해제' : '전체 선택'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {participants.map((p) => {
              const active = selectedParticipants.has(p.id)
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "justify-start",
                    active
                      ? "bg-amber-400 hover:bg-amber-500 text-orange-950 border-amber-400"
                      : "border-gray-200 text-gray-800 hover:border-orange-200 hover:text-orange-700"
                  )}
                  aria-pressed={active}
                  onClick={() => toggleParticipant(p.id)}
                >
                  {p.name}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-images">증빙 이미지 (최대 {MAX_IMAGES}장)</Label>
          <Input
            id="receipt-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          {optimizing && (
            <div className="text-xs text-gray-500">이미지 최적화 중...</div>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <div key={img.previewUrl} className="relative group">
                  <img
                    src={img.previewUrl}
                    alt={`receipt-${idx}`}
                    className="h-20 w-20 object-cover rounded-md border border-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white text-xs"
                    aria-label="remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500">
            긴 변 1280px 이하로 자동 리사이즈되고 JPEG로 압축됩니다.
          </div>
        </div>

        <Button type="submit" className="w-full">
          추가
        </Button>
      </form>
    </div>
  )
}

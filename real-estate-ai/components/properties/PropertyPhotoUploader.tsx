'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_FILE_SIZE_BYTES,
  MAX_PHOTOS_PER_PROPERTY,
  deletePropertyPhoto,
  getSignedUrls,
  uploadPropertyPhoto,
  validatePhotoFile,
  type PhotoMeta,
  type SignedPhoto,
} from '@/lib/supabase/propertyPhotos'

interface PropertyPhotoUploaderProps {
  propertyId: string
  photoMetas: PhotoMeta[]
  uploadedBy: string
  onUpdate: (newMetas: PhotoMeta[]) => void
}

const S = {
  wrap: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: 16,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 13, fontWeight: 700, color: '#1d1d1f' },
  help: { marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 },
  addBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    border: 'none',
    background: '#0071e3',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
    gap: 10,
    marginTop: 14,
  },
  item: { position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: '#f5f5f7' },
  img: { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' },
  deleteBtn: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    border: 'none',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.92)',
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 7px',
  },
  message: { marginTop: 10, fontSize: 12, color: '#ff3b30' },
  empty: { marginTop: 14, fontSize: 12, color: 'rgba(0,0,0,0.4)' },
} satisfies Record<string, React.CSSProperties>

export default function PropertyPhotoUploader({
  propertyId,
  photoMetas,
  uploadedBy,
  onUpdate,
}: PropertyPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [signedPhotos, setSignedPhotos] = useState<SignedPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refreshSignedUrls = useCallback(async () => {
    if (photoMetas.length === 0) {
      setSignedPhotos([])
      return
    }
    try {
      setSignedPhotos(await getSignedUrls(photoMetas))
    } catch {
      setSignedPhotos([])
    }
  }, [photoMetas])

  useEffect(() => {
    refreshSignedUrls()
  }, [refreshSignedUrls])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setMessage('')
    const selected = Array.from(files)
    if (photoMetas.length + selected.length > MAX_PHOTOS_PER_PROPERTY) {
      setMessage(`매물당 사진은 최대 ${MAX_PHOTOS_PER_PROPERTY}장까지 등록할 수 있습니다.`)
      return
    }

    const invalid = selected.map(validatePhotoFile).find(Boolean)
    if (invalid) {
      setMessage(invalid)
      return
    }

    setBusy(true)
    try {
      const uploaded: PhotoMeta[] = []
      for (const file of selected) {
        uploaded.push(await uploadPropertyPhoto(propertyId, file, uploadedBy))
      }
      onUpdate([...photoMetas, ...uploaded])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '사진 업로드에 실패했습니다.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(path: string) {
    setBusy(true)
    setMessage('')
    try {
      await deletePropertyPhoto(propertyId, path)
      onUpdate(photoMetas.filter((meta) => meta.path !== path))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '사진 삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const limitReached = photoMetas.length >= MAX_PHOTOS_PER_PROPERTY

  return (
    <section style={S.wrap} aria-label="매물 사진">
      <div style={S.header}>
        <div>
          <div style={S.title}>사진 {photoMetas.length}/{MAX_PHOTOS_PER_PROPERTY}</div>
          <div style={S.help}>
            JPG/PNG/WebP, 파일당 {Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB 이하,
            매물당 최대 {MAX_PHOTOS_PER_PROPERTY}장. 업로드 시 WebP로 압축되고 썸네일이 생성됩니다.
          </div>
        </div>
        <button
          type="button"
          style={{ ...S.addBtn, opacity: busy || limitReached ? 0.55 : 1 }}
          disabled={busy || limitReached}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? '처리 중' : '사진 추가'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(event) => handleFiles(event.currentTarget.files)}
      />

      {signedPhotos.length === 0 ? (
        <div style={S.empty}>등록된 사진이 없습니다.</div>
      ) : (
        <div style={S.grid}>
          {signedPhotos.map(({ meta, thumbnailSignedUrl }) => (
            <div key={meta.path} style={S.item}>
              <img src={thumbnailSignedUrl} alt={meta.caption || meta.original_filename} style={S.img} />
              <button
                type="button"
                style={S.deleteBtn}
                disabled={busy}
                onClick={() => handleDelete(meta.path)}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <div style={S.message}>{message}</div>}
    </section>
  )
}

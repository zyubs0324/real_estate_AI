import { processImage } from '@/lib/images/propertyPhotoProcessor'
import { createBrowserSupabaseClient } from './client'

export const PROPERTY_PHOTOS_BUCKET = 'property-photos'
export const MAX_PHOTOS_PER_PROPERTY = 30
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const SIGNED_URL_EXPIRES_IN = 60 * 60
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface PhotoMeta {
  path: string
  thumbnail_path: string
  caption: string
  sort_order: number
  source: string
  original_filename: string
  original_size: number
  compressed_size: number
  width: number
  height: number
  content_type: string
  uploaded_by: string
  uploaded_at: string
}

export interface SignedPhoto {
  meta: PhotoMeta
  signedUrl: string
  thumbnailSignedUrl: string
}

export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'JPG/PNG/WebP 파일만 업로드할 수 있습니다.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return '사진은 파일당 10MB 이하만 업로드할 수 있습니다.'
  }
  return null
}

function createPhotoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function getPropertyPhotoMetas(propertyId: string): Promise<PhotoMeta[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .select('photo_urls')
    .eq('id', propertyId)
    .single()

  if (error) throw error
  return ((data as { photo_urls?: PhotoMeta[] | null } | null)?.photo_urls ?? [])
}

async function savePropertyPhotoMetas(propertyId: string, metas: PhotoMeta[]) {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('properties')
    .update({ photo_urls: metas })
    .eq('id', propertyId)

  if (error) throw error
}

export async function uploadPropertyPhoto(
  propertyId: string,
  file: File,
  uploadedBy: string,
): Promise<PhotoMeta> {
  const validation = validatePhotoFile(file)
  if (validation) throw new Error(validation)

  const existing = await getPropertyPhotoMetas(propertyId)
  if (existing.length >= MAX_PHOTOS_PER_PROPERTY) {
    throw new Error('매물당 사진은 최대 30장까지 업로드할 수 있습니다.')
  }

  const processed = await processImage(file)
  const photoId = createPhotoId()
  const path = `properties/${propertyId}/photo-${photoId}.webp`
  const thumbnailPath = `properties/${propertyId}/thumb-${photoId}.webp`
  const supabase = createBrowserSupabaseClient()

  const mainUpload = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .upload(path, processed.mainBlob, { contentType: 'image/webp' })
  if (mainUpload.error) throw mainUpload.error

  const thumbUpload = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .upload(thumbnailPath, processed.thumbBlob, { contentType: 'image/webp' })
  if (thumbUpload.error) throw thumbUpload.error

  const meta: PhotoMeta = {
    path,
    thumbnail_path: thumbnailPath,
    caption: '',
    sort_order: existing.length,
    source: 'upload',
    original_filename: file.name,
    original_size: file.size,
    compressed_size: processed.mainBlob.size,
    width: processed.width,
    height: processed.height,
    content_type: 'image/webp',
    uploaded_by: uploadedBy,
    uploaded_at: new Date().toISOString(),
  }

  await savePropertyPhotoMetas(propertyId, [...existing, meta])
  return meta
}

export async function deletePropertyPhoto(
  propertyId: string,
  photoPath: string,
): Promise<void> {
  const existing = await getPropertyPhotoMetas(propertyId)
  const target = existing.find((meta) => meta.path === photoPath)
  if (!target) return

  const supabase = createBrowserSupabaseClient()
  const remove = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .remove([target.path, target.thumbnail_path])
  if (remove.error) throw remove.error

  await savePropertyPhotoMetas(propertyId, existing.filter((meta) => meta.path !== photoPath))
}

export async function getSignedUrls(metas: PhotoMeta[]): Promise<SignedPhoto[]> {
  const supabase = createBrowserSupabaseClient()
  const bucket = supabase.storage.from(PROPERTY_PHOTOS_BUCKET)

  return Promise.all(metas.map(async (meta) => {
    const [main, thumb] = await Promise.all([
      bucket.createSignedUrl(meta.path, SIGNED_URL_EXPIRES_IN),
      bucket.createSignedUrl(meta.thumbnail_path, SIGNED_URL_EXPIRES_IN),
    ])
    if (main.error) throw main.error
    if (thumb.error) throw thumb.error
    return {
      meta,
      signedUrl: main.data.signedUrl,
      thumbnailSignedUrl: thumb.data.signedUrl,
    }
  }))
}

export async function updatePropertyPhotoMetadata(
  propertyId: string,
  metas: PhotoMeta[],
): Promise<void> {
  await savePropertyPhotoMetas(propertyId, metas)
}

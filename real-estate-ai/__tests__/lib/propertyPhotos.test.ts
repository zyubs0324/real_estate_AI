import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_PHOTOS_PER_PROPERTY,
  validatePhotoFile,
} from '@/lib/supabase/propertyPhotos'

function makeFile(size: number, type: string, name = 'photo.jpg') {
  return new File([new Uint8Array(size)], name, { type })
}

describe('property photo helpers', () => {
  it('defines upload constraints for the UI', () => {
    expect(MAX_PHOTOS_PER_PROPERTY).toBe(30)
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
    expect(ALLOWED_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('accepts jpg, png, and webp files within 10MB', () => {
    expect(validatePhotoFile(makeFile(1024, 'image/jpeg'))).toBeNull()
    expect(validatePhotoFile(makeFile(1024, 'image/png'))).toBeNull()
    expect(validatePhotoFile(makeFile(1024, 'image/webp'))).toBeNull()
  })

  it('rejects unsupported mime types and oversized files', () => {
    expect(validatePhotoFile(makeFile(1024, 'image/gif'))).toContain('JPG/PNG/WebP')
    expect(validatePhotoFile(makeFile(MAX_FILE_SIZE_BYTES + 1, 'image/jpeg'))).toContain('10MB')
  })
})

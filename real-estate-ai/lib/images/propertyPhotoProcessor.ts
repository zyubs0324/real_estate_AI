export interface ProcessResult {
  mainBlob: Blob
  thumbBlob: Blob
  width: number
  height: number
}

const MAIN_MAX_EDGE = 1600
const THUMB_MAX_EDGE = 360
const MAIN_QUALITY = 0.82
const THUMB_QUALITY = 0.75

function fitSize(width: number, height: number, maxEdge: number) {
  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { width, height }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('이미지를 WebP로 변환하지 못했습니다.'))
    }, 'image/webp', quality)
  })
}

async function renderBitmap(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const size = fitSize(bitmap.width, bitmap.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('이미지 캔버스를 초기화하지 못했습니다.')
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  return {
    blob: await canvasToWebp(canvas, quality),
    width: size.width,
    height: size.height,
  }
}

export async function processImage(file: File): Promise<ProcessResult> {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('사진 압축은 브라우저 환경에서만 사용할 수 있습니다.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const main = await renderBitmap(bitmap, MAIN_MAX_EDGE, MAIN_QUALITY)
    const thumb = await renderBitmap(bitmap, THUMB_MAX_EDGE, THUMB_QUALITY)
    return {
      mainBlob: main.blob,
      thumbBlob: thumb.blob,
      width: main.width,
      height: main.height,
    }
  } finally {
    bitmap.close()
  }
}

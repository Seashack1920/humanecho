// Cloudinary browser upload with automatic chunking for large files.
//
// Cloudinary accepts at most ~100 MB in a single request, so files above that
// must be sent in pieces via the chunked-upload protocol (a shared
// X-Unique-Upload-Id plus a Content-Range header per chunk). Small files take
// the simple single-request path. Returns the secure URL + public_id.
//
// Note: the account's plan still caps the maximum *per-file* size — chunking
// only gets past the single-request limit, not the plan limit.

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const PRESET = 'humanecho_upload'
const SINGLE_MAX = 95 * 1024 * 1024   // stay safely under the ~100 MB single-request cap
const CHUNK_SIZE = 20 * 1024 * 1024   // 20 MB chunks (a multiple of 5 MB, as Cloudinary expects)

export type UploadResult = { url: string; public_id: string }
type ResourceType = 'image' | 'video' | 'auto'

export function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: ResourceType = 'auto',
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`
  return file.size <= SINGLE_MAX
    ? single(endpoint, file, folder, onProgress)
    : chunked(endpoint, file, folder, onProgress)
}

function single(endpoint: string, file: File, folder: string, onProgress?: (p: number) => void) {
  return new Promise<UploadResult>((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText)
        d.error ? reject(new Error(d.error.message)) : resolve({ url: d.secure_url, public_id: d.public_id })
      } catch { reject(new Error('Upload failed — unexpected response')) }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(fd)
  })
}

async function chunked(endpoint: string, file: File, folder: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  const total = file.size
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  let start = 0
  let last: any = null

  while (start < total) {
    const end = Math.min(start + CHUNK_SIZE, total)
    const chunk = file.slice(start, end)
    const chunkStart = start
    last = await new Promise<any>((resolve, reject) => {
      const fd = new FormData()
      fd.append('file', chunk); fd.append('upload_preset', PRESET); fd.append('folder', folder)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoint)
      xhr.setRequestHeader('X-Unique-Upload-Id', uploadId)
      xhr.setRequestHeader('Content-Range', `bytes ${chunkStart}-${end - 1}/${total}`)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && onProgress) onProgress(Math.min(99, Math.round(((chunkStart + e.loaded) / total) * 100)))
      }
      xhr.onload = () => {
        try {
          const d = xhr.responseText ? JSON.parse(xhr.responseText) : {}
          if (d.error) return reject(new Error(d.error.message))
          resolve(d)
        } catch { resolve({}) }
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(fd)
    })
    start = end
  }

  if (!last?.secure_url) throw new Error('Upload finished but no URL was returned')
  onProgress?.(100)
  return { url: last.secure_url, public_id: last.public_id }
}

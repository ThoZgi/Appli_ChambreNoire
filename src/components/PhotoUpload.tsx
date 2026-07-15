import { useRef } from 'react'
import BlobImage from './BlobImage'

interface PhotoUploadProps {
  label: string
  value: Blob | null
  onChange: (blob: Blob) => void
}

export default function PhotoUpload({ label, value, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onChange(file)
  }

  return (
    <div className="photo-upload">
      <label className="field-label">{label}</label>
      {value && (
        <div className="photo-upload-preview">
          <BlobImage blob={value} alt={label} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="photo-upload-input"
      />
    </div>
  )
}

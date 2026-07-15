import { useRef } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface HighlightZoneMarkerProps {
  photoBlob: Blob
  point: { x: number; y: number } | null
  onChange: (point: { x: number; y: number } | null) => void
}

export default function HighlightZoneMarker({ photoBlob, point, onChange }: HighlightZoneMarkerProps) {
  const imageUrl = useObjectUrl(photoBlob)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    onChange({ x, y })
  }

  if (!imageUrl) return null

  return (
    <div className="highlight-zone">
      <div className="highlight-zone-wrap" ref={containerRef} onClick={handleClick}>
        <img src={imageUrl} alt="Tirage" className="highlight-zone-img" draggable={false} />
        {point && (
          <span
            className="highlight-zone-marker"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          />
        )}
      </div>
      {point && (
        <button type="button" className="btn-link" onClick={() => onChange(null)}>
          Supprimer le repère
        </button>
      )}
    </div>
  )
}

import { useObjectUrl } from '../hooks/useObjectUrl'

interface BlobImageProps {
  blob: Blob
  alt: string
  className?: string
}

export default function BlobImage({ blob, alt, className }: BlobImageProps) {
  const url = useObjectUrl(blob)

  if (!url) return null
  return <img src={url} alt={alt} className={className} />
}

import { useState } from 'react'
import PhotoListPage from './pages/PhotoListPage'
import PhotoDetailPage from './pages/PhotoDetailPage'
import TirageDetailPage from './pages/TirageDetailPage'

type View =
  | { name: 'photos' }
  | { name: 'photo'; photoId: string }
  | { name: 'tirage'; tirageId: string }

export default function App() {
  const [view, setView] = useState<View>({ name: 'photos' })

  if (view.name === 'photos') {
    return <PhotoListPage onSelectPhoto={(id) => setView({ name: 'photo', photoId: id })} />
  }

  if (view.name === 'photo') {
    return (
      <PhotoDetailPage
        photoId={view.photoId}
        onBack={() => setView({ name: 'photos' })}
        onSelectTirage={(id) => setView({ name: 'tirage', tirageId: id })}
      />
    )
  }

  return (
    <TirageDetailPage
      tirageId={view.tirageId}
      onBack={(photoId) => setView({ name: 'photo', photoId })}
    />
  )
}

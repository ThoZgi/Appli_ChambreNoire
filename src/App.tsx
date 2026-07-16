import { useState } from 'react'
import PhotoListPage from './pages/PhotoListPage'
import PhotoDetailPage from './pages/PhotoDetailPage'
import TirageDetailPage from './pages/TirageDetailPage'
import DeveloppementListPage from './pages/DeveloppementListPage'
import DeveloppementDetailPage from './pages/DeveloppementDetailPage'
import ChimieStockListPage from './pages/ChimieStockListPage'
import ChimieStockDetailPage from './pages/ChimieStockDetailPage'

type View =
  | { name: 'photos' }
  | { name: 'photo'; photoId: string }
  | { name: 'tirage'; tirageId: string; startUnlocked?: boolean }
  | { name: 'developpements' }
  | { name: 'developpement'; developpementId: string; startUnlocked?: boolean }
  | { name: 'chimieStocks' }
  | { name: 'chimieStock'; chimieStockId: string; startUnlocked?: boolean }

function section(view: View): 'photos' | 'developpements' | 'chimieStocks' {
  if (view.name === 'developpements' || view.name === 'developpement') return 'developpements'
  if (view.name === 'chimieStocks' || view.name === 'chimieStock') return 'chimieStocks'
  return 'photos'
}

export default function App() {
  const [stack, setStack] = useState<View[]>([{ name: 'photos' }])
  const view = stack[stack.length - 1]

  function push(next: View) {
    setStack((s) => [...s, next])
  }

  function pop() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }

  function resetTo(next: View) {
    setStack([next])
  }

  return (
    <>
      <nav className="main-nav">
        <span className="main-nav-title">Labo photo / Carnet de Bord</span>
        <button
          type="button"
          className={section(view) === 'developpements' ? 'main-nav-tab main-nav-tab-active' : 'main-nav-tab'}
          onClick={() => resetTo({ name: 'developpements' })}
        >
          Développements
        </button>
        <button
          type="button"
          className={section(view) === 'photos' ? 'main-nav-tab main-nav-tab-active' : 'main-nav-tab'}
          onClick={() => resetTo({ name: 'photos' })}
        >
          Tirages
        </button>
        <button
          type="button"
          className={section(view) === 'chimieStocks' ? 'main-nav-tab main-nav-tab-active' : 'main-nav-tab'}
          onClick={() => resetTo({ name: 'chimieStocks' })}
        >
          Stock chimie
        </button>
      </nav>

      {view.name === 'photos' && <PhotoListPage onSelectPhoto={(id) => push({ name: 'photo', photoId: id })} />}

      {view.name === 'photo' && (
        <PhotoDetailPage
          photoId={view.photoId}
          onBack={pop}
          onSelectTirage={(id, startUnlocked) => push({ name: 'tirage', tirageId: id, startUnlocked })}
          onSelectDeveloppement={(id) => push({ name: 'developpement', developpementId: id })}
        />
      )}

      {view.name === 'tirage' && (
        <TirageDetailPage tirageId={view.tirageId} startUnlocked={view.startUnlocked} onBack={pop} />
      )}

      {view.name === 'developpements' && (
        <DeveloppementListPage
          onSelectDeveloppement={(id, startUnlocked) => push({ name: 'developpement', developpementId: id, startUnlocked })}
        />
      )}

      {view.name === 'developpement' && (
        <DeveloppementDetailPage
          developpementId={view.developpementId}
          startUnlocked={view.startUnlocked}
          onBack={pop}
        />
      )}

      {view.name === 'chimieStocks' && (
        <ChimieStockListPage
          onSelectChimieStock={(id, startUnlocked) => push({ name: 'chimieStock', chimieStockId: id, startUnlocked })}
        />
      )}

      {view.name === 'chimieStock' && (
        <ChimieStockDetailPage chimieStockId={view.chimieStockId} startUnlocked={view.startUnlocked} onBack={pop} />
      )}
    </>
  )
}

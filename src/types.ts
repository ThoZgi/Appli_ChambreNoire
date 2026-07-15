export interface Photo {
  id: string
  name: string
  createdAt: number
  imageBlob: Blob
  notes: string
}

export interface ChemistryStep {
  nom: string
  dilution: string
  temps: string
  temperature: string
}

export interface Chimie {
  revelateur: ChemistryStep
  bainArret: ChemistryStep
  fixateur: ChemistryStep
  notes: string
}

export interface Exposition {
  tempsBase: string
  ouverture: string
  filtreContraste: string
  notesSelection: string
}

export type DodgeBurnType = 'dodge' | 'burn'

export interface DodgeBurnZone {
  id: string
  type: DodgeBurnType
  stops: number
  path: { x: number; y: number }[]
  brushSize: number
}

export interface Tirage {
  id: string
  photoId: string
  createdAt: number
  label: string
  exposition: Exposition
  chimie: Chimie
  printImageBlob: Blob | null
  dodgeBurnZones: DodgeBurnZone[]
  notes: string
}

export function emptyChemistryStep(): ChemistryStep {
  return { nom: '', dilution: '', temps: '', temperature: '' }
}

export function emptyExposition(): Exposition {
  return { tempsBase: '', ouverture: '', filtreContraste: '', notesSelection: '' }
}

export function emptyChimie(): Chimie {
  return {
    revelateur: emptyChemistryStep(),
    bainArret: emptyChemistryStep(),
    fixateur: emptyChemistryStep(),
    notes: '',
  }
}

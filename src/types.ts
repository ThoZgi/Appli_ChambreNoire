export interface Photo {
  id: string
  name: string
  createdAt: number
  imageBlob: Blob | null
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
  agrandisseur: string
  optique: string
  hauteurColonne: string
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

export interface BandeTestStep {
  id: string
  note: string
  selected: boolean
}

export interface BandeTest {
  tempsDepart: string
  incrementStops: number
  steps: BandeTestStep[]
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
  bandeTest: BandeTest
  notes: string
}

export function emptyChemistryStep(): ChemistryStep {
  return { nom: '', dilution: '', temps: '', temperature: '' }
}

export function emptyExposition(): Exposition {
  return {
    agrandisseur: '',
    optique: '',
    hauteurColonne: '',
    tempsBase: '',
    ouverture: '',
    filtreContraste: '',
    notesSelection: '',
  }
}

export function emptyChimie(): Chimie {
  return {
    revelateur: emptyChemistryStep(),
    bainArret: emptyChemistryStep(),
    fixateur: emptyChemistryStep(),
    notes: '',
  }
}

export function emptyBandeTest(): BandeTest {
  return {
    tempsDepart: '',
    incrementStops: 1 / 3,
    steps: Array.from({ length: 5 }, () => ({ id: crypto.randomUUID(), note: '', selected: false })),
  }
}

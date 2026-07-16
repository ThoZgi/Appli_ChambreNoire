export interface Photo {
  id: string
  name: string
  createdAt: number
  imageBlob: Blob | null
  notes: string
  developpementId: string | null
  negatifReference: string | null
  version: number
}

export interface ChemistryStep {
  nom: string
  dilution: string
  temps: string
  temperature: number
  chimieStockId: string | null
}

export interface Chimie {
  revelateur: ChemistryStep
  bainArret: ChemistryStep
  fixateur: ChemistryStep
  fixateurBain2: ChemistryStep
  rincage: ChemistryStep
  notes: string
}

export interface Exposition {
  agrandisseur: string
  optique: string
  hauteurColonne: string
  typePapier: string
  formatPapier: string
  papierBaryte: boolean
  filtreND: string
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

export interface GradeTestStrip {
  grade: string
  bandeTest: BandeTest
  tempsChoisi: string
}

export interface SplitGrading {
  enabled: boolean
  grade00: GradeTestStrip
  gradeDur: GradeTestStrip
  zoneHautesLumieres: { x: number; y: number } | null
  noteZone: string
}

export interface Agitation {
  premiereAgitation: string
  typeAction: 'secondes' | 'inversions'
  quantite: string
  frequence: string
}

export interface DeveloppementChimie {
  premouillage: ChemistryStep
  revelateur: ChemistryStep
  agitationRevelateur: Agitation
  bainArret: ChemistryStep
  fixateur: ChemistryStep
  rincage: ChemistryStep
}

export interface NegatifRef {
  id: string
  reference: string
  compensation: string
  notes: string
  ouverture: string
  vitesse: string
  datePriseDeVue: string
  lieu: string
}

export type ChimieStockType = 'developpeur' | 'fixateur'
export type ChimieStockStatut = 'actif' | 'epuise'

export interface ChimieStock {
  id: string
  createdAt: number
  nom: string
  type: ChimieStockType
  concentration: string
  dateMiseEnService: string
  statut: ChimieStockStatut
  notes: string
}

export interface Developpement {
  id: string
  createdAt: number
  nom: string
  format: string
  filmStock: string
  sensibilite: string
  appareilPhoto: string
  objectifPriseDeVue: string
  plancheContactBlob: Blob | null
  negatifs: NegatifRef[]
  chimie: DeveloppementChimie
  notes: string
}

export interface Virage {
  enabled: boolean
  produit: string
  dilution: string
  temps: string
  notes: string
}

export type TirageStatut = 'en_cours' | 'termine'

export type MethodeExposition = 'bandeTest' | 'zoneMaster'

export interface ZoneMasterReading {
  lectureHautesLumieres: string
  lectureOmbres: string
  tempsObtenu: string
  gradeObtenu: string
  notes: string
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
  methodeExposition: MethodeExposition
  bandeTest: BandeTest
  zoneMaster: ZoneMasterReading
  splitGrading: SplitGrading
  virage: Virage
  statut: TirageStatut
  notes: string
}

export function emptyChemistryStep(): ChemistryStep {
  return { nom: '', dilution: '', temps: '', temperature: 20, chimieStockId: null }
}

export function emptyChimieStock(): Omit<ChimieStock, 'id' | 'createdAt'> {
  return { nom: '', type: 'developpeur', concentration: '', dateMiseEnService: '', statut: 'actif', notes: '' }
}

export function emptyExposition(): Exposition {
  return {
    agrandisseur: '',
    optique: '',
    hauteurColonne: '',
    typePapier: '',
    formatPapier: '',
    papierBaryte: false,
    filtreND: '',
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
    fixateurBain2: emptyChemistryStep(),
    rincage: emptyChemistryStep(),
    notes: '',
  }
}

export function emptyVirage(): Virage {
  return { enabled: false, produit: '', dilution: '', temps: '', notes: '' }
}

export function emptyBandeTest(): BandeTest {
  return {
    tempsDepart: '',
    incrementStops: 1 / 3,
    steps: Array.from({ length: 7 }, () => ({ id: crypto.randomUUID(), note: '', selected: false })),
  }
}

export function emptyZoneMasterReading(): ZoneMasterReading {
  return { lectureHautesLumieres: '', lectureOmbres: '', tempsObtenu: '', gradeObtenu: '', notes: '' }
}

export function emptyGradeTestStrip(grade: string): GradeTestStrip {
  return { grade, bandeTest: emptyBandeTest(), tempsChoisi: '' }
}

export function emptySplitGrading(): SplitGrading {
  return {
    enabled: false,
    grade00: emptyGradeTestStrip('00'),
    gradeDur: emptyGradeTestStrip('5'),
    zoneHautesLumieres: null,
    noteZone: '',
  }
}

export function emptyAgitation(): Agitation {
  return { premiereAgitation: '30', typeAction: 'inversions', quantite: '', frequence: '30' }
}

export function emptyDeveloppementChimie(): DeveloppementChimie {
  return {
    premouillage: emptyChemistryStep(),
    revelateur: emptyChemistryStep(),
    agitationRevelateur: emptyAgitation(),
    bainArret: emptyChemistryStep(),
    fixateur: emptyChemistryStep(),
    rincage: emptyChemistryStep(),
  }
}

export function emptyDeveloppement(): Omit<Developpement, 'id' | 'createdAt'> {
  return {
    nom: '',
    format: '',
    filmStock: '',
    sensibilite: '',
    appareilPhoto: '',
    objectifPriseDeVue: '',
    plancheContactBlob: null,
    negatifs: [],
    chimie: emptyDeveloppementChimie(),
    notes: '',
  }
}

export function emptyNegatifRef(): NegatifRef {
  return {
    id: crypto.randomUUID(),
    reference: '',
    compensation: '',
    notes: '',
    ouverture: '',
    vitesse: '',
    datePriseDeVue: '',
    lieu: '',
  }
}

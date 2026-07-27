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
  degreVinaigre: string
}

export interface Chimie {
  revelateur: ChemistryStep
  bainArret: ChemistryStep
  fixateur: ChemistryStep
  fixateurBain2: ChemistryStep
  rincage: ChemistryStep
  notes: string
}

export type TypeEclairage = 'condenseur' | 'diffusion' | ''

export interface Exposition {
  agrandisseur: string
  typeEclairage: TypeEclairage
  optique: string
  hauteurColonne: string
  typePapier: string
  formatPapier: string
  finitionPapier: string
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
  grade?: string
  label: string
  outil?: string
  nombrePassages?: number
}

export interface CircuitTrace {
  id: string
  type: DodgeBurnType
  path: { x: number; y: number }[]
  hasArrow: boolean
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

export interface LocalizedBandeTest {
  id: string
  point: { x: number; y: number } | null
  label: string
  bandeTest: BandeTest
  grade: string
  usedAsExposition: boolean
}

export interface GradeTestStrip {
  grade: string
  localizedBandeTests: LocalizedBandeTest[]
  tempsExposition: string
  dodgeBurnZones: DodgeBurnZone[]
  circuits: CircuitTrace[]
}

export interface SplitGrading {
  grade00: GradeTestStrip
  gradeDur: GradeTestStrip
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

export type ChimieStockType = 'developpeur_film' | 'developpeur_papier' | 'fixateur'
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

export type TirageStatut = 'en_cours' | 'termine'

export type MethodeExposition = 'bandeTest' | 'zoneMaster'

export type ModeRetouche = 'basique' | 'splitGrading'

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
  circuits: CircuitTrace[]
  localizedBandeTests: LocalizedBandeTest[]
  methodeExposition: MethodeExposition
  bandeTest: BandeTest
  zoneMaster: ZoneMasterReading
  modeRetouche: ModeRetouche
  splitGrading: SplitGrading
  statut: TirageStatut
  notes: string
}

export const CALIBRATION_GRADES = ['00', '0', '1', '2', '3', '4', '5'] as const
export type CalibrationGrade = (typeof CALIBRATION_GRADES)[number]
export type CalibrationPas = '1/4' | '1/6' | '1/12'

export interface CalibrationGradeEntry {
  pas: CalibrationPas
  ecart: string
  decalage: string
  stepOmbre: string
  stepLumiere: string
}

export type CalibrationSource = 'halogene' | 'led_froide' | 'autre'

export interface CalibrationSession {
  id: string
  createdAt: number
  nom: string
  papier: string
  developpeur: string
  agrandisseur: string
  canalPAP: string
  sourceLumiere: CalibrationSource
  checklist: Record<string, boolean>
  tempsMesureInitial: string
  grades: Record<CalibrationGrade, CalibrationGradeEntry>
  etape1Confirmee: boolean
  etape2Confirmee: boolean
  notes: string
}

export function emptyCalibrationGradeEntry(): CalibrationGradeEntry {
  return { pas: '1/4', ecart: '', decalage: '', stepOmbre: '', stepLumiere: '' }
}

export function emptyCalibrationGrades(): Record<CalibrationGrade, CalibrationGradeEntry> {
  return Object.fromEntries(CALIBRATION_GRADES.map((g) => [g, emptyCalibrationGradeEntry()])) as Record<
    CalibrationGrade,
    CalibrationGradeEntry
  >
}

export function emptyCalibrationSession(): Omit<CalibrationSession, 'id' | 'createdAt'> {
  return {
    nom: '',
    papier: '',
    developpeur: '',
    agrandisseur: '',
    canalPAP: '',
    sourceLumiere: 'halogene',
    checklist: {},
    tempsMesureInitial: '',
    grades: emptyCalibrationGrades(),
    etape1Confirmee: false,
    etape2Confirmee: false,
    notes: '',
  }
}

export function emptyChemistryStep(): ChemistryStep {
  return { nom: '', dilution: '', temps: '', temperature: 20, chimieStockId: null, degreVinaigre: '' }
}

export function emptyChimieStock(): Omit<ChimieStock, 'id' | 'createdAt'> {
  return { nom: '', type: 'developpeur_film', concentration: '', dateMiseEnService: '', statut: 'actif', notes: '' }
}

export function emptyExposition(): Exposition {
  return {
    agrandisseur: '',
    typeEclairage: '',
    optique: '',
    hauteurColonne: '',
    typePapier: '',
    formatPapier: '',
    finitionPapier: '',
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
  return { grade, localizedBandeTests: [], tempsExposition: '', dodgeBurnZones: [], circuits: [] }
}

export function emptyLocalizedBandeTest(tempsDepart: string, grade = ''): LocalizedBandeTest {
  return {
    id: crypto.randomUUID(),
    point: null,
    label: '',
    bandeTest: { ...emptyBandeTest(), tempsDepart },
    grade,
    usedAsExposition: false,
  }
}

export function emptySplitGrading(): SplitGrading {
  return {
    grade00: emptyGradeTestStrip('00'),
    gradeDur: emptyGradeTestStrip('5'),
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

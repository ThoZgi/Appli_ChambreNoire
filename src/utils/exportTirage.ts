import { jsPDF } from 'jspdf'
import type { ChimieStock, DodgeBurnZone, Tirage } from '../types'
import { baseExpositionLabel, zoneActionLabel } from './dodgeBurnRender'
import { renderAnnotatedPrintImage } from './annotatedPrintImage'
import { slugify } from './slug'

const MARGIN = 15
const LINE_HEIGHT = 6
const SECTION_GAP = 4

export async function exportTirageToPdf(tirage: Tirage, chimieStocks: ChimieStock[] = []): Promise<void> {
  const stockName = (id: string | null) => chimieStocks.find((s) => s.id === id)?.nom ?? ''
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  function ensureSpace(next: number) {
    if (y + next > pageHeight - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  function addSection(title: string, rows: [string, string][]) {
    const filtered = rows.filter(([, value]) => !!value)
    if (filtered.length === 0) return
    ensureSpace(LINE_HEIGHT + SECTION_GAP)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(title, MARGIN, y)
    y += LINE_HEIGHT
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const [label, value] of filtered) {
      const lines = doc.splitTextToSize(`${label} : ${value}`, contentWidth) as string[]
      for (const line of lines) {
        ensureSpace(LINE_HEIGHT)
        doc.text(line, MARGIN, y)
        y += LINE_HEIGHT
      }
    }
    y += SECTION_GAP
  }

  function addDodgeBurnSection(title: string, zones: DodgeBurnZone[], zoneTempsBase: string, grade: string | undefined) {
    if (zones.length === 0 && !zoneTempsBase) return
    const dodges = zones.filter((z) => z.type === 'dodge')
    const burns = zones.filter((z) => z.type === 'burn')
    const rows: [string, string][] = [['Exposition de base', baseExpositionLabel(zoneTempsBase, grade)]]
    dodges.forEach((z, i) => rows.push([`Dodge ${i + 1}`, zoneActionLabel(z, zoneTempsBase, i, grade)]))
    burns.forEach((z, i) => rows.push([`Burn ${i + 1}`, zoneActionLabel(z, zoneTempsBase, i, grade)]))
    addSection(title, rows)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(tirage.label || 'Tirage', MARGIN, y)
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const statut = tirage.statut === 'termine' ? 'Terminé' : 'En cours'
  doc.text(`Créé le ${new Date(tirage.createdAt).toLocaleDateString('fr-FR')} — Statut : ${statut}`, MARGIN, y)
  y += LINE_HEIGHT + SECTION_GAP

  const exp = tirage.exposition
  addSection('Matériel & Papier', [
    ['Agrandisseur', exp.agrandisseur],
    ['Optique', exp.optique],
    ['Hauteur de colonne', exp.hauteurColonne],
    ['Type de papier', exp.typePapier],
    ['Format papier', exp.formatPapier],
    ['Papier baryté', exp.papierBaryte ? 'Oui' : ''],
  ])

  const chimieSteps: [string, typeof tirage.chimie.revelateur][] = [
    ['Révélateur', tirage.chimie.revelateur],
    ["Bain d'arrêt", tirage.chimie.bainArret],
    ['Fixateur', tirage.chimie.fixateur],
    ['Fixateur — bain 2', tirage.chimie.fixateurBain2],
    ['Rinçage', tirage.chimie.rincage],
  ]
  const chimieRows: [string, string][] = []
  for (const [label, step] of chimieSteps) {
    if (step.nom) chimieRows.push([`${label} — produit`, step.nom])
    if (step.dilution) chimieRows.push([`${label} — dilution`, step.dilution])
    if (step.temps) chimieRows.push([`${label} — temps`, step.temps])
    chimieRows.push([`${label} — température`, `${step.temperature}°C`])
    if (step.chimieStockId) chimieRows.push([`${label} — bidon`, stockName(step.chimieStockId)])
  }
  if (tirage.chimie.notes) chimieRows.push(['Notes chimie', tirage.chimie.notes])
  addSection('Chimie', chimieRows)

  addSection('Exposition', [
    ['Filtre ND', exp.filtreND],
    ['Temps de base', exp.tempsBase],
    ['Ouverture', exp.ouverture],
    ['Filtre de contraste', exp.filtreContraste],
    ['Notes de sélection', exp.notesSelection],
  ])

  if (tirage.methodeExposition === 'bandeTest') {
    const bt = tirage.bandeTest
    const rows: [string, string][] = [
      ['Temps de départ', bt.tempsDepart],
      ['Incrément (stops)', String(bt.incrementStops)],
    ]
    bt.steps.forEach((step, i) => {
      if (step.note || step.selected) {
        rows.push([`Palier ${i + 1}${step.selected ? ' (choisi)' : ''}`, step.note])
      }
    })
    addSection('Bande test', rows)
  } else {
    const zm = tirage.zoneMaster
    addSection('Sonde ZoneMaster II', [
      ['Lecture hautes lumières', zm.lectureHautesLumieres],
      ['Lecture ombres', zm.lectureOmbres],
      ['Temps obtenu', zm.tempsObtenu],
      ['Grade obtenu', zm.gradeObtenu],
      ['Notes', zm.notes],
    ])
  }

  if (tirage.modeRetouche === 'splitGrading') {
    const sg = tirage.splitGrading
    addSection('Split grading', [
      ['Grade doux', sg.grade00.grade],
      ["Grade doux — temps d'exposition générale", sg.grade00.tempsExposition],
      ['Grade dur', sg.gradeDur.grade],
      ["Grade dur — temps d'exposition générale", sg.gradeDur.tempsExposition],
    ])
    addDodgeBurnSection('Dodge & Burn — grade doux', sg.grade00.dodgeBurnZones, sg.grade00.tempsExposition, sg.grade00.grade)
    addDodgeBurnSection('Dodge & Burn — grade dur', sg.gradeDur.dodgeBurnZones, sg.gradeDur.tempsExposition, sg.gradeDur.grade)
  }

  if (tirage.modeRetouche === 'basique') {
    addDodgeBurnSection('Dodge & Burn', tirage.dodgeBurnZones, exp.tempsBase, exp.filtreContraste || undefined)
  }

  if (tirage.notes) {
    addSection('Notes / résultat', [['Notes', tirage.notes]])
  }

  if (tirage.printImageBlob) {
    const allDodgeBurnZones =
      tirage.modeRetouche === 'splitGrading'
        ? [...tirage.splitGrading.grade00.dodgeBurnZones, ...tirage.splitGrading.gradeDur.dodgeBurnZones]
        : tirage.dodgeBurnZones
    const { dataUrl, width, height } = await renderAnnotatedPrintImage(tirage.printImageBlob, allDodgeBurnZones)
    const displayWidth = contentWidth
    const displayHeight = (height / width) * displayWidth
    ensureSpace(displayHeight + SECTION_GAP)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Photo du tirage (avec zones dodge & burn)', MARGIN, y)
    y += LINE_HEIGHT
    doc.addImage(dataUrl, 'JPEG', MARGIN, y, displayWidth, displayHeight)
    y += displayHeight + SECTION_GAP
  }

  doc.save(`${slugify(tirage.label || 'tirage')}.pdf`)
}

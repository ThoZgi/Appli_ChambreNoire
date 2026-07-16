import { jsPDF } from 'jspdf'
import type { ChimieStock, Tirage } from '../types'
import { zoneLabel } from './dodgeBurnRender'
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

  if (tirage.splitGrading.enabled) {
    const sg = tirage.splitGrading
    addSection('Split grading', [
      [`Grade ${sg.grade00.grade} — temps choisi`, sg.grade00.tempsChoisi],
      [`Grade ${sg.gradeDur.grade} — temps choisi`, sg.gradeDur.tempsChoisi],
      [
        'Zone hautes lumières',
        sg.zoneHautesLumieres
          ? `${Math.round(sg.zoneHautesLumieres.x * 100)}%, ${Math.round(sg.zoneHautesLumieres.y * 100)}%`
          : '',
      ],
      ['Note', sg.noteZone],
    ])
  }

  if (tirage.virage.enabled) {
    addSection('Virage', [
      ['Produit', tirage.virage.produit],
      ['Dilution', tirage.virage.dilution],
      ['Temps', tirage.virage.temps],
      ['Notes', tirage.virage.notes],
    ])
  }

  if (tirage.dodgeBurnZones.length > 0) {
    addSection(
      'Dodge & Burn',
      tirage.dodgeBurnZones.map((zone, i) => [`Zone ${i + 1}`, zoneLabel(zone, exp.tempsBase)] as [string, string]),
    )
  }

  if (tirage.notes) {
    addSection('Notes / résultat', [['Notes', tirage.notes]])
  }

  if (tirage.printImageBlob) {
    const { dataUrl, width, height } = await renderAnnotatedPrintImage(tirage.printImageBlob, tirage.dodgeBurnZones)
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

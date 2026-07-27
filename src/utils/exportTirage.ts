import { jsPDF } from 'jspdf'
import type { ChimieStock, DodgeBurnZone, Tirage, TypeEclairage } from '../types'
import { baseExpositionLabel, zoneActionLabel } from './dodgeBurnRender'
import { renderAnnotatedPrintImage } from './annotatedPrintImage'
import { slugify } from './slug'
import { formatStops } from './stops'

const MARGIN = 15
const FOOTER_ZONE = 12
const LINE_HEIGHT = 6
const SECTION_GAP = 4

const ACCENT: [number, number, number] = [217, 84, 47]
const ACCENT_LIGHT: [number, number, number] = [250, 227, 217]
const DODGE_COLOR: [number, number, number] = [60, 120, 200]
const INK: [number, number, number] = [38, 34, 35]
const MUTED: [number, number, number] = [107, 101, 112]
const RULE: [number, number, number] = [226, 221, 216]
const ZEBRA: [number, number, number] = [247, 244, 241]

const ECLAIRAGE_LABELS: Record<TypeEclairage, string> = {
  condenseur: 'Condenseur',
  diffusion: 'Diffusion',
  '': '',
}

export async function exportTirageToPdf(tirage: Tirage, chimieStocks: ChimieStock[] = []): Promise<void> {
  const stockName = (id: string | null) => chimieStocks.find((s) => s.id === id)?.nom ?? ''
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  function ensureSpace(next: number) {
    if (y + next > pageHeight - MARGIN - FOOTER_ZONE) {
      doc.addPage()
      y = MARGIN
    }
  }

  function drawHeader() {
    doc.setFillColor(...ACCENT)
    doc.rect(0, 0, pageWidth, 4, 'F')
    y = MARGIN + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...INK)
    doc.text(tirage.label || 'Tirage', MARGIN, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    const statut = tirage.statut === 'termine' ? 'Terminé' : 'En cours'
    doc.text(`Créé le ${new Date(tirage.createdAt).toLocaleDateString('fr-FR')} — Statut : ${statut}`, MARGIN, y)
    y += LINE_HEIGHT
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, pageWidth - MARGIN, y)
    y += SECTION_GAP + 2
  }

  function drawSectionTitle(title: string) {
    ensureSpace(LINE_HEIGHT + 4)
    doc.setFillColor(...ACCENT)
    doc.rect(MARGIN, y - 3.2, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(title, MARGIN + 6, y)
    y += 2
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, pageWidth - MARGIN, y)
    y += SECTION_GAP + 1
  }

  function drawKeyValueGrid(rows: [string, string][]) {
    const filtered = rows.filter(([, value]) => !!value)
    if (filtered.length === 0) return
    const colGap = 8
    const colWidth = (contentWidth - colGap) / 2
    for (let i = 0; i < filtered.length; i += 2) {
      const pair = [filtered[i], filtered[i + 1]] as const
      const blocks = pair.map((cell) => {
        if (!cell) return { lines: [] as string[], height: 0 }
        const lines = doc.splitTextToSize(cell[1], colWidth) as string[]
        return { lines, height: 4.2 + lines.length * 4.6 }
      })
      const rowHeight = Math.max(blocks[0].height, blocks[1]?.height ?? 0)
      ensureSpace(rowHeight + 3)
      pair.forEach((cell, colIdx) => {
        if (!cell) return
        const x = MARGIN + colIdx * (colWidth + colGap)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(cell[0].toUpperCase(), x, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...INK)
        blocks[colIdx].lines.forEach((line, li) => doc.text(line, x, y + 4.6 + li * 4.6))
      })
      y += rowHeight + 3
    }
    y += SECTION_GAP - 3
  }

  function drawTable(headers: string[], colWidths: number[], rows: string[][]) {
    if (rows.length === 0) return
    const headerHeight = 7
    ensureSpace(headerHeight)
    doc.setFillColor(...ACCENT_LIGHT)
    doc.rect(MARGIN, y - 5, contentWidth, headerHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    let hx = MARGIN
    headers.forEach((h, i) => {
      doc.text(h, hx + 2, y)
      hx += colWidths[i]
    })
    y += headerHeight
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    rows.forEach((row, rowIdx) => {
      const cellLines = row.map((cell, i) => doc.splitTextToSize(cell, colWidths[i] - 4) as string[])
      const rowHeight = Math.max(...cellLines.map((lines) => lines.length), 1) * 4.6 + 2
      ensureSpace(rowHeight)
      if (rowIdx % 2 === 1) {
        doc.setFillColor(...ZEBRA)
        doc.rect(MARGIN, y - 4.2, contentWidth, rowHeight, 'F')
      }
      doc.setTextColor(...INK)
      let cx = MARGIN
      cellLines.forEach((lines, i) => {
        lines.forEach((line, li) => doc.text(line, cx + 2, y + li * 4.6))
        cx += colWidths[i]
      })
      y += rowHeight
    })
    y += SECTION_GAP
  }

  function drawCallout(text: string) {
    const lines = doc.splitTextToSize(text, contentWidth - 8) as string[]
    const height = lines.length * 5 + 4
    ensureSpace(height + 2)
    doc.setFillColor(...ACCENT_LIGHT)
    doc.rect(MARGIN, y - 4, contentWidth, height, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    lines.forEach((line, i) => doc.text(line, MARGIN + 4, y + i * 5))
    y += height + SECTION_GAP - 2
  }

  function drawZoneSequence(
    label: string,
    color: [number, number, number],
    zones: DodgeBurnZone[],
    tempsBase: string,
    passGrade: string | undefined,
  ) {
    if (zones.length === 0) return
    ensureSpace(LINE_HEIGHT + 2)
    doc.setFillColor(...color)
    doc.rect(MARGIN, y - 3, 2.5, 2.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...color)
    doc.text(label.toUpperCase(), MARGIN + 5, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    zones.forEach((zone, i) => {
      const text = zoneActionLabel(zone, tempsBase, i, passGrade)
      const lines = doc.splitTextToSize(`${i + 1}. ${text}`, contentWidth - 8) as string[]
      const h = lines.length * 4.6
      ensureSpace(h + 1)
      lines.forEach((line, li) => doc.text(line, MARGIN + 4, y + li * 4.6))
      y += h + 1.5
    })
    y += 1.5
  }

  function addDodgeBurnSection(title: string, zones: DodgeBurnZone[], zoneTempsBase: string, grade: string | undefined) {
    if (zones.length === 0 && !zoneTempsBase) return
    drawSectionTitle(title)
    drawCallout(baseExpositionLabel(zoneTempsBase, grade))
    const dodges = zones.filter((z) => z.type === 'dodge')
    const burns = zones.filter((z) => z.type === 'burn')
    drawZoneSequence('Dodge', DODGE_COLOR, dodges, zoneTempsBase, grade)
    drawZoneSequence('Burn', ACCENT, burns, zoneTempsBase, grade)
    y += SECTION_GAP
  }

  drawHeader()

  const exp = tirage.exposition
  drawSectionTitle('Matériel & Papier')
  drawKeyValueGrid([
    ['Agrandisseur', exp.agrandisseur],
    ['Éclairage', ECLAIRAGE_LABELS[exp.typeEclairage]],
    ['Optique', exp.optique],
    ['Hauteur de colonne', exp.hauteurColonne],
    ['Type de papier', exp.typePapier],
    ['Format papier', exp.formatPapier],
    ['Finition', exp.finitionPapier],
    ['Papier baryté', exp.papierBaryte ? 'Oui' : ''],
  ])

  const chimieSteps: [string, typeof tirage.chimie.revelateur][] = [
    ['Révélateur', tirage.chimie.revelateur],
    ["Bain d'arrêt", tirage.chimie.bainArret],
    ['Fixateur', tirage.chimie.fixateur],
    ['Fixateur — bain 2', tirage.chimie.fixateurBain2],
    ['Rinçage', tirage.chimie.rincage],
  ]
  const chimieRows: string[][] = []
  for (const [label, step] of chimieSteps) {
    if (!step.nom && !step.dilution && !step.temps && !step.chimieStockId) continue
    chimieRows.push([label, step.nom, step.dilution, step.temps, `${step.temperature}°C`, stockName(step.chimieStockId)])
  }
  if (chimieRows.length > 0) {
    drawSectionTitle('Chimie')
    drawTable(['Étape', 'Produit', 'Dilution', 'Temps', 'Temp.', 'Bidon'], [30, 42, 30, 20, 18, 40], chimieRows)
    if (tirage.chimie.notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      const lines = doc.splitTextToSize(`Notes : ${tirage.chimie.notes}`, contentWidth) as string[]
      ensureSpace(lines.length * 4.6 + 2)
      lines.forEach((line, i) => doc.text(line, MARGIN, y + i * 4.6))
      y += lines.length * 4.6 + SECTION_GAP
    }
  }

  drawSectionTitle('Exposition')
  drawKeyValueGrid([
    ['Filtre ND', exp.filtreND],
    ['Temps de base', exp.tempsBase],
    ['Ouverture', exp.ouverture],
    ['Filtre de contraste', exp.filtreContraste],
    ['Notes de sélection', exp.notesSelection],
  ])

  if (tirage.methodeExposition === 'bandeTest') {
    const bt = tirage.bandeTest
    drawSectionTitle('Bande test')
    drawKeyValueGrid([
      ['Temps de départ', bt.tempsDepart],
      ['Incrément (stops)', formatStops(bt.incrementStops)],
    ])
    const paliers = bt.steps.map((step, i) => ({ step, i })).filter(({ step }) => step.note || step.selected)
    if (paliers.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...INK)
      paliers.forEach(({ step, i }) => {
        const text = `${i + 1}.${step.selected ? ' (choisi)' : ''} ${step.note}`
        const lines = doc.splitTextToSize(text, contentWidth - 4) as string[]
        ensureSpace(lines.length * 4.6 + 1)
        lines.forEach((line, li) => doc.text(line, MARGIN + 2, y + li * 4.6))
        y += lines.length * 4.6 + 1
      })
      y += SECTION_GAP - 1
    }
  } else {
    const zm = tirage.zoneMaster
    drawSectionTitle('Sonde ZoneMaster II')
    drawKeyValueGrid([
      ['Lecture hautes lumières', zm.lectureHautesLumieres],
      ['Lecture ombres', zm.lectureOmbres],
      ['Temps obtenu', zm.tempsObtenu],
      ['Grade obtenu', zm.gradeObtenu],
      ['Notes', zm.notes],
    ])
  }

  if (tirage.modeRetouche === 'splitGrading') {
    const sg = tirage.splitGrading
    drawSectionTitle('Split grading')
    drawKeyValueGrid([
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
    drawSectionTitle('Notes / résultat')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(tirage.notes, contentWidth) as string[]
    ensureSpace(lines.length * 4.6)
    lines.forEach((line, i) => doc.text(line, MARGIN, y + i * 4.6))
    y += lines.length * 4.6 + SECTION_GAP
  }

  if (tirage.printImageBlob) {
    const allDodgeBurnZones =
      tirage.modeRetouche === 'splitGrading'
        ? [...tirage.splitGrading.grade00.dodgeBurnZones, ...tirage.splitGrading.gradeDur.dodgeBurnZones]
        : tirage.dodgeBurnZones
    const allCircuits =
      tirage.modeRetouche === 'splitGrading'
        ? [...tirage.splitGrading.grade00.circuits, ...tirage.splitGrading.gradeDur.circuits]
        : tirage.circuits
    const { dataUrl, width, height } = await renderAnnotatedPrintImage(
      tirage.printImageBlob,
      allDodgeBurnZones,
      allCircuits,
    )
    const displayWidth = contentWidth
    const displayHeight = (height / width) * displayWidth
    ensureSpace(displayHeight + 14)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.4)
    doc.rect(MARGIN, y, displayWidth, displayHeight, 'S')
    doc.addImage(dataUrl, 'JPEG', MARGIN, y, displayWidth, displayHeight)
    y += displayHeight + 5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text('Photo du tirage (avec zones dodge & burn annotées)', MARGIN, y)
    y += SECTION_GAP
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, pageHeight - 10, pageWidth - MARGIN, pageHeight - 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Labo photo / Carnet de Bord', MARGIN, pageHeight - 6)
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - MARGIN, pageHeight - 6, { align: 'right' })
  }

  doc.save(`${slugify(tirage.label || 'tirage')}.pdf`)
}

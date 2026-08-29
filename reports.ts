// =========================================================
// GIT GROUP — Reports & Export Engine
// Drop into: src/lib/reports.ts
//
// Install first:
//   npm install xlsx docx file-saver
//   npm install -D @types/file-saver
//
// xlsx (SheetJS)  -> handles BOTH Excel (.xlsx) and OpenDocument (.ods)
// docx            -> handles Word (.docx)
// file-saver      -> triggers the browser download
// =========================================================

import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from 'docx'
import { saveAs } from 'file-saver'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------
// 1. DATA: pull an aggregated report for a school + date range
// ---------------------------------------------------------
export interface ScanRow {
  id: string
  created_at: string
  status: 'verified' | 'not_on_file'
  confidence: number | null
  scanned_by: string | null
  matched_guardian_name?: string | null
  matched_child_name?: string | null
}

export interface ReportData {
  schoolName: string
  rangeLabel: string
  totalScans: number
  verifiedCount: number
  notOnFileCount: number
  rows: ScanRow[]
}

export async function buildReport(
  supabase: SupabaseClient,
  schoolId: string,
  schoolName: string,
  fromISO: string,
  toISO: string
): Promise<ReportData> {
  const { data, error } = await supabase
    .from('scan_logs')
    .select(`
      id, created_at, status, confidence, scanned_by,
      guardians:matched_guardian_id ( full_name ),
      children:matched_child_id ( full_name )
    `)
    .eq('school_id', schoolId)
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows: ScanRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    status: r.status,
    confidence: r.confidence,
    scanned_by: r.scanned_by,
    matched_guardian_name: r.guardians?.full_name ?? null,
    matched_child_name: r.children?.full_name ?? null,
  }))

  return {
    schoolName,
    rangeLabel: `${fromISO.slice(0, 10)} to ${toISO.slice(0, 10)}`,
    totalScans: rows.length,
    verifiedCount: rows.filter(r => r.status === 'verified').length,
    notOnFileCount: rows.filter(r => r.status === 'not_on_file').length,
    rows,
  }
}

// ---------------------------------------------------------
// 2. EXCEL (.xlsx)
// ---------------------------------------------------------
export function exportToExcel(report: ReportData, filename = 'gitgroup-report.xlsx') {
  const wb = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['GIT GROUP — Pickup Report'],
    ['School', report.schoolName],
    ['Range', report.rangeLabel],
    [],
    ['Total scans', report.totalScans],
    ['Verified', report.verifiedCount],
    ['Not on file', report.notOnFileCount],
  ])
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  const detailSheet = XLSX.utils.json_to_sheet(
    report.rows.map(r => ({
      Date: new Date(r.created_at).toLocaleString(),
      Status: r.status,
      Guardian: r.matched_guardian_name ?? '—',
      Child: r.matched_child_name ?? '—',
      Confidence: r.confidence ?? '—',
    }))
  )
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Scan Log')

  XLSX.writeFile(wb, filename)
}

// ---------------------------------------------------------
// 3. OPENDOCUMENT (.ods) — same builder, different bookType
// ---------------------------------------------------------
export function exportToODS(report: ReportData, filename = 'gitgroup-report.ods') {
  const wb = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['GIT GROUP — Pickup Report'],
    ['School', report.schoolName],
    ['Range', report.rangeLabel],
    [],
    ['Total scans', report.totalScans],
    ['Verified', report.verifiedCount],
    ['Not on file', report.notOnFileCount],
  ])
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  const detailSheet = XLSX.utils.json_to_sheet(
    report.rows.map(r => ({
      Date: new Date(r.created_at).toLocaleString(),
      Status: r.status,
      Guardian: r.matched_guardian_name ?? '—',
      Child: r.matched_child_name ?? '—',
      Confidence: r.confidence ?? '—',
    }))
  )
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Scan Log')

  // bookType 'ods' produces a genuine OpenDocument Spreadsheet
  const out = XLSX.write(wb, { bookType: 'ods', type: 'array' })
  saveAs(new Blob([out], { type: 'application/vnd.oasis.opendocument.spreadsheet' }), filename)
}

// ---------------------------------------------------------
// 4. WORD (.docx)
// ---------------------------------------------------------
export async function exportToWord(report: ReportData, filename = 'gitgroup-report.docx') {
  const headerRow = new TableRow({
    children: ['Date', 'Status', 'Guardian', 'Child', 'Confidence'].map(
      h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
    ),
  })

  const dataRows = report.rows.map(
    r =>
      new TableRow({
        children: [
          new Paragraph(new Date(r.created_at).toLocaleString()),
          new Paragraph(r.status),
          new Paragraph(r.matched_guardian_name ?? '—'),
          new Paragraph(r.matched_child_name ?? '—'),
          new Paragraph(r.confidence != null ? String(r.confidence) : '—'),
        ].map(p => new TableCell({ children: [p] })),
      })
  )

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'GIT GROUP — Pickup Report', heading: HeadingLevel.HEADING_1 }),
          new Paragraph(`School: ${report.schoolName}`),
          new Paragraph(`Range: ${report.rangeLabel}`),
          new Paragraph(' '),
          new Paragraph(`Total scans: ${report.totalScans}`),
          new Paragraph(`Verified: ${report.verifiedCount}`),
          new Paragraph(`Not on file: ${report.notOnFileCount}`),
          new Paragraph(' '),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph(' '),
          new Paragraph({
            children: [new TextRun({ text: 'Frank Ssemakula is the creator of program.', italics: true, size: 18 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

// ---------------------------------------------------------
// 5. PRINT — opens a clean printable view; user hits Ctrl/Cmd+P
// and can "Save as PDF" from the browser's own print dialog.
// ---------------------------------------------------------
export function printReport(report: ReportData) {
  const win = window.open('', '_blank')
  if (!win) return

  const rowsHtml = report.rows
    .map(
      r => `<tr>
        <td>${new Date(r.created_at).toLocaleString()}</td>
        <td>${r.status}</td>
        <td>${r.matched_guardian_name ?? '—'}</td>
        <td>${r.matched_child_name ?? '—'}</td>
        <td>${r.confidence ?? '—'}</td>
      </tr>`
    )
    .join('')

  win.document.write(`
    <html>
      <head>
        <title>GIT GROUP — Pickup Report</title>
        <style>
          body { font-family: sans-serif; padding: 32px; color: #1a1a2e; }
          h1 { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
          th { background: #f0f0f0; }
          footer { margin-top: 24px; font-size: 12px; font-style: italic; color: #555; }
        </style>
      </head>
      <body>
        <h1>GIT GROUP — Pickup Report</h1>
        <p><strong>School:</strong> ${report.schoolName}<br/>
           <strong>Range:</strong> ${report.rangeLabel}</p>
        <p><strong>Total scans:</strong> ${report.totalScans} &nbsp;|&nbsp;
           <strong>Verified:</strong> ${report.verifiedCount} &nbsp;|&nbsp;
           <strong>Not on file:</strong> ${report.notOnFileCount}</p>
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Guardian</th><th>Child</th><th>Confidence</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <footer>Frank Ssemakula is the creator of program.</footer>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `)
  win.document.close()
}

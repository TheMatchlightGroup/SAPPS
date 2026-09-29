// =========================================================
// Report → Word (.docx). Built in the browser with the `docx` library,
// so examiners get an editable copy for re-tests or agency edits without
// a PDF-to-Word converter. Mirrors the printed report: letterhead,
// CONFIDENTIAL REPORT in red, header block, result, sections with blue
// headings, and the signature block (license / QC lines included).
// =========================================================
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} from 'docx'
import { COMPANY } from './constants'

export const REPORT_RED = 'B3261E'
export const REPORT_BLUE = '1B4A6B' // SAPPS blue — matches --report-blue in reports.css
const FONT = 'Georgia'

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, color: o.color, italics: o.italics })

/** Multi-line text → paragraphs (blank lines become spacing). */
function paras(text, o = {}) {
  const lines = String(text || '').split('\n')
  return lines.map((line) => new Paragraph({
    children: [run(line, o)],
    spacing: { after: line.trim() ? 60 : 0, line: 300 },
  }))
}

async function logoRun() {
  try {
    const res = await fetch('/SAPPS_logo.png')
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new ImageRun({ type: 'png', data: buf, transformation: { width: 72, height: 70 } })
  } catch { return null }
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder }

/**
 * @param {object} r  { fields:[{label,value}], result, sections:[{title,body}], examinerName, licenseNo, qcBy, clientName, examDate }
 */
export async function buildReportDocx(r) {
  const logo = await logoRun()

  // Letterhead: logo | company block
  const letterhead = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({ children: logo ? [logo] : [] })] }),
        new TableCell({
          width: { size: 86, type: WidthType.PERCENTAGE }, borders: noBorders,
          children: [
            new Paragraph({ children: [run(COMPANY.name, { bold: true, size: 24 })] }),
            ...COMPANY.addressLines.map((l) => new Paragraph({ children: [run(l, { size: 18 })] })),
            new Paragraph({ children: [run(COMPANY.phones, { size: 18 })] }),
          ],
        }),
      ],
    })],
  })

  const title = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 280, after: 280 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 12, color: '06141A', space: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: '06141A', space: 6 },
    },
    children: [run('CONFIDENTIAL REPORT', { bold: true, size: 26, color: REPORT_RED })],
  })

  // Header block: two label/value pairs per row
  const cell = (label, value) => [
    new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: paras(label.toUpperCase(), { bold: true, size: 16 }) }),
    new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: paras(value || '', { size: 20 }) }),
  ]
  const rows = []
  for (let i = 0; i < r.fields.length; i += 2) {
    const a = r.fields[i], b = r.fields[i + 1]
    rows.push(new TableRow({ children: [...cell(a.label, a.value), ...(b ? cell(b.label, b.value) : cell('', ''))] }))
  }
  const headerTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })

  const result = new Paragraph({
    spacing: { before: 240, after: 240 },
    children: [run('The result of the examination is: ', { bold: true }), run(r.result || '________________', { bold: true })],
  })

  const sections = r.sections.flatMap((s) => [
    new Paragraph({
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C9D3DA', space: 2 } },
      children: [run(String(s.title || '').toUpperCase(), { bold: true, size: 20, color: REPORT_BLUE })],
    }),
    ...paras(s.body),
  ])

  const sig = [
    new Paragraph({ spacing: { before: 360 }, children: [run('Please advise if we can assist further.')] }),
    new Paragraph({ spacing: { before: 120 }, children: [run('Sincerely,')] }),
    new Paragraph({ spacing: { before: 240 }, children: [run(r.examinerName || '', { bold: true, size: 22 })] }),
    new Paragraph({ children: [run('(Electronic Signature) · Polygraph Examiner', { size: 18 })] }),
    new Paragraph({ spacing: { before: 120 }, children: [run('License No.: ', { size: 18 }), run(r.licenseNo || '____________________', { size: 18 })] }),
    new Paragraph({ children: [run('QC: ', { size: 18 }), run(r.qcBy || '____________________', { size: 18 })] }),
    new Paragraph({
      spacing: { before: 240 },
      children: [run('The signature on this report is electronic. If you are not the intended recipient of this report, please contact: 703-304-8392', { size: 15, italics: true })],
    }),
  ]

  const doc = new Document({
    creator: 'SAPPS',
    title: `Confidential Report — ${r.clientName || ''}`,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
      children: [letterhead, title, headerTable, result, ...sections, ...sig],
    }],
  })
  return Packer.toBlob(doc)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

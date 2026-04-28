import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { RadaiEntry, RciEntry } from './types'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function parseAmt(v: string | number): number {
    if (typeof v === 'number') return v
    return parseFloat(String(v).replace(/,/g, '')) || 0
}

function fmtAmt(v: string | number): string {
    const n = parseAmt(v)
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string): string {
    if (!d) return ''
    try {
        const dt = new Date(d)
        return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`
    } catch { return d }
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function thinBorder(): Partial<ExcelJS.Borders> {
    const s: ExcelJS.BorderStyle = { style: 'thin' }
    return { top: s, bottom: s, left: s, right: s }
}

function medBorder(): Partial<ExcelJS.Borders> {
    const s: ExcelJS.BorderStyle = { style: 'medium' }
    return { top: s, bottom: s, left: s, right: s }
}

function centerAlign(wrap = false): Partial<ExcelJS.Alignment> {
    return { horizontal: 'center', vertical: 'middle', wrapText: wrap }
}

function leftAlign(wrap = false): Partial<ExcelJS.Alignment> {
    return { horizontal: 'left', vertical: 'middle', wrapText: wrap }
}

function rightAlign(): Partial<ExcelJS.Alignment> {
    return { horizontal: 'right', vertical: 'middle' }
}

function boldFont(size = 10, name = 'Times New Roman'): Partial<ExcelJS.Font> {
    return { bold: true, size, name }
}

function normalFont(size = 10, name = 'Times New Roman'): Partial<ExcelJS.Font> {
    return { size, name }
}

function mergeRange(ws: ExcelJS.Worksheet, topLeft: string, bottomRight: string) {
    ws.mergeCells(`${topLeft}:${bottomRight}`)
}

const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' },
}

// ─── Build shared worksheet structure ────────────────────────────────────────

function buildWorksheet(
    ws: ExcelJS.Worksheet,
    opts: {
        topRightLabel: string
        title: string
        subtypeLabel: string
        period: string
        entityName: string
        fundCluster: string
        bankNameAcctNo: string
        reportNo: string
        sheetNo: string
        entries: { date: string; serial_no: string; dv_payroll_no: string; ors_burs_no: string; responsibility_center_code: string; payee: string; uacs_object_code: string; nature_of_payment: string; amount: string | number }[]
        totalLabel: string
        preparedByName: string
        preparedByPosition: string
        certifiedByName: string
        certifiedByPosition: string
        certificationLine2: string
    }
) {
    ws.columns = [
        { width: 13 }, // A
        { width: 19 }, // B
        { width: 18 }, // C
        { width: 28 }, // D
        { width: 20 }, // E
        { width: 22 }, // F
        { width: 16 }, // G
        { width: 38 }, // H
        { width: 16 }, // I
    ]

    // ── Row 1: top-right label ─────────────────────────────────────────────────
    const r1 = ws.addRow(['', '', '', '', '', '', '', '', opts.topRightLabel])
    r1.height = 14
    r1.getCell('I').font = normalFont(9)
    r1.getCell('I').alignment = rightAlign()

    ws.addRow([]).height = 4

    // ── Row 3: Title ──────────────────────────────────────────────────────────
    const r3 = ws.addRow([''])
    r3.height = 20
    mergeRange(ws, 'B3', 'I3')
    r3.getCell('B').value = opts.title
    r3.getCell('B').font = boldFont(13)
    r3.getCell('B').alignment = centerAlign()

    // ── Row 4: Period Covered ─────────────────────────────────────────────────
    const r4 = ws.addRow([''])
    r4.height = 14
    r4.getCell('D').value = 'Period Covered:'
    r4.getCell('D').font = normalFont(10)
    r4.getCell('D').alignment = rightAlign()

    mergeRange(ws, 'E4', 'F4')
    r4.getCell('E').value = opts.period
    r4.getCell('E').font = { ...normalFont(10), underline: true }
    r4.getCell('E').alignment = centerAlign()
    r4.getCell('E').border = { bottom: { style: 'thin' } }

    ws.addRow([]).height = 4
    ws.addRow([]).height = 4

    // ── Entity Name ───────────────────────────────────────────────────────────
    const r6 = ws.addRow(['Entity Name :'])
    r6.height = 14
    r6.getCell('A').font = normalFont(10)
    r6.getCell('A').alignment = leftAlign()
    mergeRange(ws, `C${r6.number}`, `H${r6.number}`)
    r6.getCell('C').value = opts.entityName
    r6.getCell('C').font = normalFont(10)
    r6.getCell('C').alignment = leftAlign()

    // ── Fund Cluster + Report No. ─────────────────────────────────────────────
    const r7 = ws.addRow(['Fund Cluster :'])
    r7.height = 14
    r7.getCell('A').font = normalFont(10)
    mergeRange(ws, `C${r7.number}`, `F${r7.number}`)
    r7.getCell('C').value = opts.fundCluster
    r7.getCell('C').font = normalFont(10)
    mergeRange(ws, `H${r7.number}`, `H${r7.number}`)
    r7.getCell('H').value = 'Report No.:'
    r7.getCell('H').font = normalFont(10)
    r7.getCell('H').alignment = rightAlign()
    r7.getCell('I').value = opts.reportNo
    r7.getCell('I').font = { ...normalFont(10), underline: true }
    r7.getCell('I').border = { bottom: { style: 'thin' } }
    r7.getCell('I').alignment = leftAlign()

    // ── Bank Name + Sheet No. ─────────────────────────────────────────────────
    const r8 = ws.addRow(['Bank Name/ Account No. :'])
    r8.height = 14
    r8.getCell('A').font = normalFont(10)
    mergeRange(ws, `C${r8.number}`, `F${r8.number}`)
    r8.getCell('C').value = opts.bankNameAcctNo
    r8.getCell('C').font = normalFont(10)
    mergeRange(ws, `H${r8.number}`, `H${r8.number}`)
    r8.getCell('H').value = 'Sheet No.:'
    r8.getCell('H').font = normalFont(10)
    r8.getCell('H').alignment = rightAlign()
    r8.getCell('I').value = opts.sheetNo
    r8.getCell('I').font = { ...normalFont(10), underline: true }
    r8.getCell('I').border = { bottom: { style: 'thin' } }
    r8.getCell('I').alignment = leftAlign()

    ws.addRow([]).height = 4
    ws.addRow([]).height = 4

    // ── Rows 10-11: Table header (two-row merged) ─────────────────────────────
    const r10 = ws.addRow([opts.subtypeLabel, '', 'DV/Payroll No.', 'ORS/BURS No.', 'Responsibility\nCenter Code', 'Payee', 'UACS Object\nCode', 'Nature of Payment', 'Amount'])
    r10.height = 30
    const r11 = ws.addRow(['Date', 'Serial No.'])
    r11.height = 18

    mergeRange(ws, `A${r10.number}`, `B${r10.number}`)   // RADAI-MDS label spans A-B row 10
    // Sub-header A11 and B11 for Date / Serial No.
    // Columns C-I merge vertically rows 10-11
    for (const col of ['C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        mergeRange(ws, `${col}${r10.number}`, `${col}${r11.number}`)
    }

    // Style header row 10
    for (const col of ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        const cell = r10.getCell(col)
        cell.font = boldFont(10)
        cell.alignment = centerAlign(true)
        cell.border = thinBorder()
        cell.fill = HEADER_FILL
    }
    // Style sub-header row 11
    for (const col of ['A', 'B']) {
        const cell = r11.getCell(col)
        cell.font = boldFont(10)
        cell.alignment = centerAlign()
        cell.border = thinBorder()
        cell.fill = HEADER_FILL
    }

    // ── Data rows ─────────────────────────────────────────────────────────────
    let totalAmount = 0
    for (const e of opts.entries) {
        const amt = parseAmt(e.amount)
        totalAmount += amt
        const dr = ws.addRow([
            fmtDate(e.date),
            e.serial_no,
            e.dv_payroll_no,
            e.ors_burs_no,
            e.responsibility_center_code,
            e.payee,
            e.uacs_object_code,
            e.nature_of_payment,
            fmtAmt(amt),
        ])
        dr.height = 36
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
        cols.forEach((col, i) => {
            const cell = dr.getCell(col)
            cell.font = normalFont(10)
            cell.border = thinBorder()
            if (i === 7) cell.alignment = leftAlign(true)       // Nature of Payment
            else if (i === 8) cell.alignment = rightAlign()     // Amount
            else cell.alignment = centerAlign(false)
        })
    }

    // ── Total row ─────────────────────────────────────────────────────────────
    const totalRow = ws.addRow(['', '', '', '', '', '', '', opts.totalLabel, fmtAmt(totalAmount)])
    totalRow.height = 16
    for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
        totalRow.getCell(col).border = { top: { style: 'thin' }, bottom: { style: 'thin' } }
    }
    const totLbl = totalRow.getCell('H')
    totLbl.font = boldFont(10)
    totLbl.alignment = rightAlign()
    totLbl.border = thinBorder()

    const totVal = totalRow.getCell('I')
    totVal.font = boldFont(10)
    totVal.alignment = rightAlign()
    totVal.border = medBorder()

    // ── Footer: Prepared by ───────────────────────────────────────────────────
    ws.addRow([]).height = 8
    ws.addRow([]).height = 6

    const prepLbl = ws.addRow(['Prepared by:'])
    prepLbl.getCell('A').font = normalFont(10)
    prepLbl.height = 14

    ws.addRow([]).height = 14
    ws.addRow([]).height = 14

    const prepName = ws.addRow([opts.preparedByName])
    prepName.getCell('A').font = boldFont(10)
    prepName.height = 14

    const prepPos = ws.addRow([opts.preparedByPosition])
    prepPos.getCell('A').font = normalFont(10)
    prepPos.height = 14

    ws.addRow([]).height = 8

    // ── CERTIFICATION ─────────────────────────────────────────────────────────
    const certHdr = ws.addRow([])
    certHdr.height = 18
    mergeRange(ws, `E${certHdr.number}`, `G${certHdr.number}`)
    certHdr.getCell('E').value = 'CERTIFICATION'
    certHdr.getCell('E').font = boldFont(12)
    certHdr.getCell('E').alignment = centerAlign()

    ws.addRow([]).height = 6

    const cert1 = 'I hereby certify on my official oath that the above is a true statement of all ADAs issued by me during'
    const cert1Row = ws.addRow([])
    cert1Row.height = 14
    mergeRange(ws, `B${cert1Row.number}`, `I${cert1Row.number}`)
    cert1Row.getCell('B').value = cert1
    cert1Row.getCell('B').font = normalFont(10)
    cert1Row.getCell('B').alignment = centerAlign(false)

    const cert2Row = ws.addRow([])
    cert2Row.height = 14
    mergeRange(ws, `B${cert2Row.number}`, `I${cert2Row.number}`)
    cert2Row.getCell('B').value = opts.certificationLine2
    cert2Row.getCell('B').font = normalFont(10)
    cert2Row.getCell('B').alignment = centerAlign(false)

    ws.addRow([]).height = 8
    ws.addRow([]).height = 14

    const certName = ws.addRow([])
    certName.height = 16
    mergeRange(ws, `E${certName.number}`, `G${certName.number}`)
    certName.getCell('E').value = opts.certifiedByName
    certName.getCell('E').font = boldFont(11)
    certName.getCell('E').alignment = centerAlign()

    const certLbl = ws.addRow([])
    certLbl.height = 14
    mergeRange(ws, `E${certLbl.number}`, `G${certLbl.number}`)
    certLbl.getCell('E').value = 'Name and Signature of Disbursing Officer/Cashier'
    certLbl.getCell('E').font = normalFont(10)
    certLbl.getCell('E').alignment = centerAlign()

    const certPos = ws.addRow([])
    certPos.height = 14
    mergeRange(ws, `E${certPos.number}`, `G${certPos.number}`)
    certPos.getCell('E').value = opts.certifiedByPosition
    certPos.getCell('E').font = boldFont(11)
    certPos.getCell('E').alignment = centerAlign()
}

// ─── RADAI Report ─────────────────────────────────────────────────────────────

export async function generateRadaiReport(entries: RadaiEntry[], periodLabel: string) {
    const meta = entries[0]
    const period = periodLabel || meta?.period_covered || ''

    const wb = new ExcelJS.Workbook()
    wb.creator = 'eFAS'
    wb.created = new Date()

    const ws = wb.addWorksheet('RADAI', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    })

    buildWorksheet(ws, {
        topRightLabel: 'GAM Appendix 13- RX',
        title: 'REPORT OF ADVICE TO DEBIT ACCOUNT ISSUED',
        subtypeLabel: 'RADAI-MDS REGULAR',
        period,
        entityName: meta?.entity_name || '',
        fundCluster: meta?.fund_cluster || '',
        bankNameAcctNo: meta?.bank_name_account_no || '',
        reportNo: meta?.report_no || '',
        sheetNo: meta?.sheet_no || '',
        entries,
        totalLabel: 'Total',
        preparedByName: meta?.prepared_by_name || '',
        preparedByPosition: meta?.prepared_by_position || '',
        certifiedByName: meta?.certified_by_name || '',
        certifiedByPosition: meta?.certified_by_position || '',
        certificationLine2: `the period stated above for which ADA Nos. ${meta?.ada_nos_from || ''} to ${meta?.ada_nos_to || ''}  inclusive, were actually issued by me in the amounts shown thereon.`,
    })

    const buf = await wb.xlsx.writeBuffer()
    const filename = `RADAI_${period.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

// ─── RCI Report ───────────────────────────────────────────────────────────────

export async function generateRciReport(entries: RciEntry[], periodLabel: string) {
    const meta = entries[0]
    const period = periodLabel || meta?.period_covered || ''

    const wb = new ExcelJS.Workbook()
    wb.creator = 'eFAS'
    wb.created = new Date()

    const ws = wb.addWorksheet('RCI', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    })

    buildWorksheet(ws, {
        topRightLabel: 'External Document',
        title: 'REPORT OF CHECKS ISSUED',
        subtypeLabel: 'RCI-MT CHECKS SPECIAL',
        period,
        entityName: meta?.entity_name || '',
        fundCluster: meta?.fund_cluster || '',
        bankNameAcctNo: meta?.bank_name_account_no || '',
        reportNo: meta?.report_no || '',
        sheetNo: meta?.sheet_no || '',
        entries,
        totalLabel: 'TOTAL',
        preparedByName: meta?.prepared_by_name || '',
        preparedByPosition: meta?.prepared_by_position || '',
        certifiedByName: meta?.certified_by_name || '',
        certifiedByPosition: meta?.certified_by_position || '',
        certificationLine2: `the period stated above for which CHECKS Nos. ${meta?.check_nos_from || ''} to ${meta?.check_nos_to || ''} inclusive, were actually issued by me in the amounts shown thereon.`,
    })

    const buf = await wb.xlsx.writeBuffer()
    const filename = `RCI_${period.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

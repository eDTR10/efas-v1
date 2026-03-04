import { NTCARow, NTCAYear, parseAmount } from './types';

const REQUIRED_PAP_TITLES = [
    'Personal Services',
    'Automatic Appropriations (RLIP)',
    'General Management Activities (MOOE)',
    'PNPKI',
    'Cybersecurity',
    'eGov & eLGU',
    'eGOV DGP',
    'IIDB',
    'NIPPSB',
    'ICT-PCFI',
    'SPARK',
    'DWIA',
    'Tech4Ed/DTC',
    'ILCDB',
    'NBP',
    'MISS',
    'Infostructure',
    'DRRM',
    'Free WiFi',
] as const;

const EMPTY_QUARTERS = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };

const normalizeTitle = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

// ─── Google Sheet config ──────────────────────────────────────────────────────
const SHEET_CONFIG: Record<NTCAYear, { id: string; name: string }> = {
    '2026': {
        id: '1j3_tmDE774xHsLzCYY0nPpckexAbJRVBmSX7x4PNpxY',
        name: '2026 NTCA BALANCE',
    },
    '2025': {
        id: '1oBrHEaM0NdaKMKFkLmsFbLqSDKgjJ5V-zoCfSkdRynU',
        name: 'Revised NTCA BALANCE (MDS Regular)',
    },
};
const API_KEY = import.meta.env.VITE_API_KEY;

// Column indices (0-based) from the sheet:
// A=0  PAP
// B=1  PAP CODE
// C=2  CLASS TYPE
// D=3  SARO NO.
// E=4  SARO AMOUNT
// F=5  NTCA RECEIVED Q1
// G=6  NTCA RECEIVED Q2
// H=7  NTCA RECEIVED Q3
// I=8  NTCA RECEIVED Q4
// J=9  NTCA RECEIVED TOTAL
// K=10 DISBURSEMENTS Q1
// L=11 DISBURSEMENTS Q2
// M=12 DISBURSEMENTS Q3
// N=13 DISBURSEMENTS Q4
// O=14 DISBURSEMENTS TOTAL
// P=15 NTCA BALANCE Q1
// Q=16 NTCA BALANCE Q2
// R=17 NTCA BALANCE Q3
// S=18 NTCA BALANCE Q4
// T=19 NTCA BALANCE TOTAL
// U=20 Not Downloaded

const DATA_START_ROW = 3; // 0-based index: rows 0,1 are headers, row 2 is TOTAL row

/** Convert a raw sheet row array into an NTCARow object */
const parseRow = (raw: string[], index: number): NTCARow => {
    const col = (i: number) => raw[i] ?? '';
    const num = (i: number) => parseAmount(col(i));

    return {
        id: `row-${index}`,
        pap: col(0),
        papCode: col(1),
        classType: col(2),
        saroNo: col(3),
        saroAmount: num(4),
        ntcaReceived: { q1: num(5), q2: num(6), q3: num(7), q4: num(8), total: num(9) },
        disbursements: { q1: num(10), q2: num(11), q3: num(12), q4: num(13), total: num(14) },
        ntcaBalance: { q1: num(15), q2: num(16), q3: num(17), q4: num(18), total: num(19) },
        notDownloaded: num(20),
    };
};

/**
 * Detect if a row is a section header (e.g. "Personnel Services") —
 * it has a PAP name but no PAP CODE / CLASS TYPE.
 */
const isHeaderRow = (raw: string[]): boolean =>
    raw[0]?.trim() !== '' &&
    (raw[1] ?? '').trim() === '' &&
    (raw[2] ?? '').trim() === '';

/**
 * Fetch live NTCA Balance data from Google Sheets.
 * Returns an array of NTCARow objects (including section headers).
 */
export const fetchNTCAData = async (year: NTCAYear = '2026'): Promise<NTCARow[]> => {
    const config = SHEET_CONFIG[year] ?? SHEET_CONFIG['2026'];
    const encodedSheet = encodeURIComponent(`${config.name}!A:U`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.id}/values/${encodedSheet}?key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows: string[][] = json.values ?? [];

    const result: NTCARow[] = [];
    let dataIndex = 0;

    for (let i = DATA_START_ROW; i < rows.length; i++) {
        const raw = rows[i];

        // Skip completely empty rows
        if (!raw || raw.every((c) => c.trim() === '')) continue;

        // Skip note/comment rows
        const firstCell = raw[0]?.trim() ?? '';
        if (firstCell.startsWith('Note:') || firstCell.startsWith('This is')) continue;

        if (isHeaderRow(raw)) {
            // Section header row (e.g. "Personnel Services")
            result.push({
                id: `header-${i}`,
                pap: firstCell,
                papCode: '',
                classType: '',
                saroNo: '',
                saroAmount: 0,
                ntcaReceived: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
                disbursements: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
                ntcaBalance: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
                isHeader: true,
            });
        } else if (firstCell !== '') {
            // Normal data row — must have a PAP name
            result.push(parseRow(raw, dataIndex++));
        }
    }

    const groups = new Map<string, NTCARow[]>();
    const seenHeaderOrder: string[] = [];
    let currentHeaderKey: string | null = null;

    for (const row of result) {
        if (row.isHeader) {
            currentHeaderKey = normalizeTitle(row.pap);
            if (!groups.has(currentHeaderKey)) {
                groups.set(currentHeaderKey, [row]);
                seenHeaderOrder.push(currentHeaderKey);
            } else {
                groups.get(currentHeaderKey)!.push(row);
            }
            continue;
        }

        if (currentHeaderKey && groups.has(currentHeaderKey)) {
            groups.get(currentHeaderKey)!.push(row);
        } else {
            const fallbackKey = `__ungrouped__${row.id}`;
            groups.set(fallbackKey, [row]);
            seenHeaderOrder.push(fallbackKey);
        }
    }

    const ordered: NTCARow[] = [];
    const requiredKeys = REQUIRED_PAP_TITLES.map(normalizeTitle);

    for (let i = 0; i < REQUIRED_PAP_TITLES.length; i++) {
        const title = REQUIRED_PAP_TITLES[i];
        const key = requiredKeys[i];
        const existingGroup = groups.get(key);

        if (existingGroup && existingGroup.length > 0) {
            ordered.push(...existingGroup);
            groups.delete(key);
        } else {
            ordered.push({
                id: `required-header-${i}`,
                pap: title,
                papCode: '',
                classType: '',
                saroNo: '',
                saroAmount: 0,
                ntcaReceived: { ...EMPTY_QUARTERS },
                disbursements: { ...EMPTY_QUARTERS },
                ntcaBalance: { ...EMPTY_QUARTERS },
                isHeader: true,
            });
        }
    }

    for (const key of seenHeaderOrder) {
        if (!requiredKeys.includes(key)) {
            const rowsForKey = groups.get(key);
            if (rowsForKey && rowsForKey.length > 0) {
                ordered.push(...rowsForKey);
            }
        }
    }

    return ordered;
};

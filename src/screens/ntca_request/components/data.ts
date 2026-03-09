import {
    MONTH_KEYS,
    NTCARequestMonthlyValues,
    NTCARequestRow,
    NTCARequestYear,
    createEmptyMonthlyValues,
    parseRequestAmount,
} from './types';

const API_KEY = import.meta.env.VITE_API_KEY;
const SHEET_ID = import.meta.env.VITE_NTCA_REQUEST_SHEET_ID ?? '1j3_tmDE774xHsLzCYY0nPpckexAbJRVBmSX7x4PNpxY';
const SHEET_NAME = import.meta.env.VITE_NTCA_REQUEST_SHEET_NAME ?? 'TEST NTCA Request';
const DATA_START_ROW = 2;
const SHEET_RANGE = `${SHEET_NAME}!A:AE`;

const buildSheetUrl = () => `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`;

const buildMonthlyValues = (raw: string[]): NTCARequestMonthlyValues => {
    const monthly = createEmptyMonthlyValues();
    const monthlyStartIndex = 7;

    MONTH_KEYS.forEach((month, index) => {
        const offset = monthlyStartIndex + index * 2;
        monthly[month] = {
            amountRequested: parseRequestAmount(raw[offset]),
            obligatedWithSupplier: parseRequestAmount(raw[offset + 1]),
        };
    });

    return monthly;
};

const parseSheetRow = (raw: string[], index: number): NTCARequestRow => ({
    id: `sheet-${index}`,
    project: raw[0] ?? '',
    activity: raw[1] ?? '',
    saroNo: raw[2] ?? '',
    saroAmount: parseRequestAmount(raw[3]),
    estimatedAmountWithoutSaro: parseRequestAmount(raw[4]),
    targetDateOfActivity: raw[5] ?? '',
    originalCashFlowProgramLink: raw[6] ?? '',
    monthly: buildMonthlyValues(raw),
    source: 'sheet',
});

const SAMPLE_ROWS: NTCARequestRow[] = [
    {
        id: 'sample-1',
        project: 'NBP',
        activity: 'Fund transfer for the travelling expense for the implementation of National Broadband Program activities for FY 2026',
        saroNo: '2026-02-0220',
        saroAmount: 100000,
        estimatedAmountWithoutSaro: 0,
        targetDateOfActivity: '',
        originalCashFlowProgramLink: '',
        monthly: {
            ...createEmptyMonthlyValues(),
            march: { amountRequested: 10000, obligatedWithSupplier: 0 },
            april: { amountRequested: 30000, obligatedWithSupplier: 0 },
            july: { amountRequested: 30000, obligatedWithSupplier: 0 },
            december: { amountRequested: 30000, obligatedWithSupplier: 0 },
        },
        source: 'sample',
    },
    {
        id: 'sample-2',
        project: 'CYBER/PNPKI',
        activity: 'PNPKI RA Training',
        saroNo: 'Waiting for SARO',
        saroAmount: 270000,
        estimatedAmountWithoutSaro: 270000,
        targetDateOfActivity: 'April',
        originalCashFlowProgramLink: '',
        monthly: {
            ...createEmptyMonthlyValues(),
            april: { amountRequested: 270000, obligatedWithSupplier: 0 },
        },
        source: 'sample',
    },
    {
        id: 'sample-3',
        project: 'eGov',
        activity: 'Conduct of policy consultation workshops for updating of the Government Web Template',
        saroNo: 'No SARO',
        saroAmount: 0,
        estimatedAmountWithoutSaro: 0,
        targetDateOfActivity: 'June',
        originalCashFlowProgramLink: '',
        monthly: {
            ...createEmptyMonthlyValues(),
            june: { amountRequested: 1149110, obligatedWithSupplier: 0 },
            november: { amountRequested: 0, obligatedWithSupplier: 0 },
        },
        source: 'sample',
    },
];

export const fetchNTCARequestData = async (_year: NTCARequestYear = '2026'): Promise<NTCARequestRow[]> => {
    if (!SHEET_ID) {
        return SAMPLE_ROWS;
    }

    const url = `${buildSheetUrl()}?key=${API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 401 || response.status === 403) {
            throw new Error('Google Sheet access requires sign-in. Click Connect Google to load and write NTCA Request data.');
        }

        throw new Error(error?.error?.message ?? `HTTP ${response.status}`);
    }

    const json = await response.json();
    const rows: string[][] = json.values ?? [];

    return rows
        .slice(DATA_START_ROW)
        .filter((raw) => raw.some((cell) => (cell ?? '').toString().trim() !== ''))
        .map((raw, index) => parseSheetRow(raw, index));
};

export const fetchNTCARequestDataWithToken = async (
    accessToken: string,
    _year: NTCARequestYear = '2026'
): Promise<NTCARequestRow[]> => {
    const response = await fetch(buildSheetUrl(), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error?.message ?? `HTTP ${response.status}`);
    }

    const json = await response.json();
    const rows: string[][] = json.values ?? [];

    return rows
        .slice(DATA_START_ROW)
        .filter((raw) => raw.some((cell) => (cell ?? '').toString().trim() !== ''))
        .map((raw, index) => parseSheetRow(raw, index));
};

const serializeRow = (row: NTCARequestRow): Array<string | number> => {
    const monthValues = MONTH_KEYS.flatMap((month) => {
        const value = row.monthly[month];
        return [
            value.amountRequested === 0 ? '' : value.amountRequested,
            value.obligatedWithSupplier === 0 ? '' : value.obligatedWithSupplier,
        ];
    });

    return [
        row.project,
        row.activity,
        row.saroNo,
        row.saroAmount === 0 ? '' : row.saroAmount,
        row.estimatedAmountWithoutSaro === 0 ? '' : row.estimatedAmountWithoutSaro,
        row.targetDateOfActivity,
        row.originalCashFlowProgramLink,
        ...monthValues,
    ];
};

export const appendNTCARequestRow = async (accessToken: string, row: NTCARequestRow): Promise<void> => {
    const response = await fetch(
        `${buildSheetUrl()}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                range: SHEET_RANGE,
                majorDimension: 'ROWS',
                values: [serializeRow(row)],
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error?.message ?? `HTTP ${response.status}`);
    }
};

export const NTCA_REQUEST_SHEET_INFO = {
    id: SHEET_ID,
    name: SHEET_NAME,
};
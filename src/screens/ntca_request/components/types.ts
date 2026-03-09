export const MONTH_KEYS = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
] as const;

export type NTCARequestMonthKey = (typeof MONTH_KEYS)[number];

export interface NTCARequestMonthData {
    amountRequested: number;
    obligatedWithSupplier: number;
}

export type NTCARequestMonthlyValues = Record<NTCARequestMonthKey, NTCARequestMonthData>;

export interface NTCARequestRow {
    id: string;
    project: string;
    activity: string;
    saroNo: string;
    saroAmount: number;
    estimatedAmountWithoutSaro: number;
    targetDateOfActivity: string;
    originalCashFlowProgramLink: string;
    monthly: NTCARequestMonthlyValues;
    source?: 'sheet' | 'manual' | 'sample';
}

export type NTCARequestYear = '2026';

export const MONTH_LABELS: Record<NTCARequestMonthKey, string> = {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
};

export const createEmptyMonthlyValues = (): NTCARequestMonthlyValues => ({
    january: { amountRequested: 0, obligatedWithSupplier: 0 },
    february: { amountRequested: 0, obligatedWithSupplier: 0 },
    march: { amountRequested: 0, obligatedWithSupplier: 0 },
    april: { amountRequested: 0, obligatedWithSupplier: 0 },
    may: { amountRequested: 0, obligatedWithSupplier: 0 },
    june: { amountRequested: 0, obligatedWithSupplier: 0 },
    july: { amountRequested: 0, obligatedWithSupplier: 0 },
    august: { amountRequested: 0, obligatedWithSupplier: 0 },
    september: { amountRequested: 0, obligatedWithSupplier: 0 },
    october: { amountRequested: 0, obligatedWithSupplier: 0 },
    november: { amountRequested: 0, obligatedWithSupplier: 0 },
    december: { amountRequested: 0, obligatedWithSupplier: 0 },
});

export const parseRequestAmount = (value: string | number | undefined | null): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (!value) {
        return 0;
    }

    const normalized = String(value).replace(/,/g, '').trim();
    if (!normalized || normalized === '#N/A' || normalized.toLowerCase() === 'n/a') {
        return 0;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatRequestAmount = (value: number): string =>
    value === 0
        ? '—'
        : value.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

export const getRowRequestedTotal = (row: NTCARequestRow): number =>
    MONTH_KEYS.reduce((total, month) => total + row.monthly[month].amountRequested, 0);

export const getRowObligatedTotal = (row: NTCARequestRow): number =>
    MONTH_KEYS.reduce((total, month) => total + row.monthly[month].obligatedWithSupplier, 0);
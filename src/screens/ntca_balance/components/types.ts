// ─── NTCA Balance Types ───────────────────────────────────────────────────────

export interface QuarterData {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    total: number;
}

export interface NTCARow {
    id: string;
    pap: string;
    papCode: string;
    classType: string;
    saroNo: string;
    saroAmount: number;
    ntcaReceived: QuarterData;
    disbursements: QuarterData;
    ntcaBalance: QuarterData;
    notDownloaded?: number;
    isHeader?: boolean;
}

export type ActiveSection = 'ntcaReceived' | 'disbursements' | 'ntcaBalance';
export type ActiveQuarter = 'q1' | 'q2' | 'q3' | 'q4' | 'all';
export type ActiveBudgetCategory = 'regular' | 'special';

export interface SectionMeta {
    key: ActiveSection;
    label: string;
    bg: string;
    border: string;
    text: string;
    headBg: string;
}

export const SECTION_META: SectionMeta[] = [
    {
        key: 'ntcaReceived',
        label: 'NTCA Received',
        bg: 'bg-sky-900/40',
        border: 'border-sky-700/40',
        text: 'text-sky-300',
        headBg: 'bg-sky-900/60',
    },
    {
        key: 'disbursements',
        label: 'Disbursements',
        bg: 'bg-violet-900/40',
        border: 'border-violet-700/40',
        text: 'text-violet-300',
        headBg: 'bg-violet-900/60',
    },
    {
        key: 'ntcaBalance',
        label: 'NTCA Balance',
        bg: 'bg-emerald-900/40',
        border: 'border-emerald-700/40',
        text: 'text-emerald-300',
        headBg: 'bg-emerald-900/60',
    },
];

export const QUARTER_LABELS: Record<string, string> = {
    q1: '1st Qtr',
    q2: '2nd Qtr',
    q3: '3rd Qtr',
    q4: '4th Qtr',
    total: 'Total',
};

/** Parse a formatted number string like "2,222.00" → 2222 */
export const parseAmount = (val: string | undefined): number => {
    if (!val || val.trim() === '' || val === '#N/A') return 0;
    return parseFloat(val.replace(/,/g, '')) || 0;
};

/** Format a number as Philippine Peso with 2 decimal places */
export const formatAmount = (n: number): string =>
    n === 0
        ? '—'
        : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

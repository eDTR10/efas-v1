import React, { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { MONTH_KEYS, MONTH_LABELS, NTCARequestMonthKey, NTCARequestRow, createEmptyMonthlyValues } from './types';

interface AddNTCARequestRowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (row: NTCARequestRow) => Promise<void> | void;
}

interface FormState {
    project: string;
    activity: string;
    saroNo: string;
    saroAmount: string;
    estimatedAmountWithoutSaro: string;
    targetDateOfActivity: string;
    originalCashFlowProgramLink: string;
    monthly: Record<NTCARequestMonthKey, { amountRequested: string; obligatedWithSupplier: string }>;
}

const createInitialFormState = (): FormState => ({
    project: '',
    activity: '',
    saroNo: '',
    saroAmount: '',
    estimatedAmountWithoutSaro: '',
    targetDateOfActivity: '',
    originalCashFlowProgramLink: '',
    monthly: MONTH_KEYS.reduce((acc, month) => {
        acc[month] = { amountRequested: '', obligatedWithSupplier: '' };
        return acc;
    }, {} as FormState['monthly']),
});

const parseNumber = (value: string): number => {
    if (!value.trim()) {
        return 0;
    }

    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatTargetMonth = (value: string): string => {
    if (!value) {
        return '';
    }

    const [year, month] = value.split('-');
    const monthIndex = Number.parseInt(month ?? '', 10) - 1;

    if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return value;
    }

    const monthName = new Date(Number.parseInt(year, 10), monthIndex, 1).toLocaleString('en-US', {
        month: 'long',
    });

    return `${monthName} ${year}`;
};

const AddNTCARequestRowDialog: React.FC<AddNTCARequestRowDialogProps> = ({
    open,
    onOpenChange,
    onSubmit,
}) => {
    const [form, setForm] = useState<FormState>(createInitialFormState);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<NTCARequestMonthKey>('january');

    const totalRequested = useMemo(
        () => MONTH_KEYS.reduce((sum, month) => sum + parseNumber(form.monthly[month].amountRequested), 0),
        [form.monthly]
    );

    const totalObligated = useMemo(
        () => MONTH_KEYS.reduce((sum, month) => sum + parseNumber(form.monthly[month].obligatedWithSupplier), 0),
        [form.monthly]
    );

    const handleCoreChange = (key: keyof Omit<FormState, 'monthly'>, value: string) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleMonthChange = (month: NTCARequestMonthKey, field: 'amountRequested' | 'obligatedWithSupplier', value: string) => {
        setForm((current) => ({
            ...current,
            monthly: {
                ...current.monthly,
                [month]: {
                    ...current.monthly[month],
                    [field]: value,
                },
            },
        }));
    };

    const reset = () => {
        setForm(createInitialFormState());
        setSubmitError(null);
        setSelectedMonth('january');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);

        const activity = form.activity.trim();
        if (!activity) {
            return;
        }

        const monthly = createEmptyMonthlyValues();
        MONTH_KEYS.forEach((month) => {
            monthly[month] = {
                amountRequested: parseNumber(form.monthly[month].amountRequested),
                obligatedWithSupplier: parseNumber(form.monthly[month].obligatedWithSupplier),
            };
        });

        setSubmitting(true);

        try {
            await onSubmit({
                id: `manual-${Date.now()}`,
                project: form.project.trim(),
                activity,
                saroNo: form.saroNo.trim(),
                saroAmount: parseNumber(form.saroAmount),
                estimatedAmountWithoutSaro: parseNumber(form.estimatedAmountWithoutSaro),
                targetDateOfActivity: formatTargetMonth(form.targetDateOfActivity.trim()),
                originalCashFlowProgramLink: form.originalCashFlowProgramLink.trim(),
                monthly,
                source: 'manual',
            });

            reset();
            onOpenChange(false);
        } catch (error: unknown) {
            setSubmitError(error instanceof Error ? error.message : 'Unable to save row.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen);
                if (!nextOpen) {
                    reset();
                }
            }}
        >
            <DialogContent className="w-[min(96vw,1100px)] max-w-5xl max-h-[90vh] overflow-hidden border border-sky-500/30 bg-neutral-950 p-0 text-neutral-100 shadow-[0_24px_80px_rgba(2,132,199,0.25)]">
                <DialogHeader className="border-b border-sky-500/20 px-5 py-4 sm:px-6">
                    <DialogTitle className="text-white">Add NTCA Request Row</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Fill in the core request details, then plot the monthly request and obligation values.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-88px)] flex-col">
                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">Project</span>
                                <Input value={form.project} onChange={(event) => handleCoreChange('project', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" />
                            </label>
                            <label className="space-y-2 xl:col-span-3">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">Activity</span>
                                <Input value={form.activity} onChange={(event) => handleCoreChange('activity', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" required />
                            </label>
                            {/* <label className="space-y-2">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">SARO No.</span>
                                <Input value={form.saroNo} onChange={(event) => handleCoreChange('saroNo', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">SARO Amount</span>
                                <Input type="number" step="0.01" value={form.saroAmount} onChange={(event) => handleCoreChange('saroAmount', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" />
                            </label> */}
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">Estimated Amount w/o SARO</span>
                                <Input type="number" step="0.01" value={form.estimatedAmountWithoutSaro} onChange={(event) => handleCoreChange('estimatedAmountWithoutSaro', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">Target Month of Activity</span>
                                <Input type="month" value={form.targetDateOfActivity} onChange={(event) => handleCoreChange('targetDateOfActivity', event.target.value)} className="h-9 bg-neutral-900 text-sm text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:[filter:invert(1)]" />
                            </label>
                            <label className="space-y-2 md:col-span-2 xl:col-span-4">
                                <span className="text-xs uppercase tracking-widest text-sky-300/70">Original Cash Flow Program Link</span>
                                <Input value={form.originalCashFlowProgramLink} onChange={(event) => handleCoreChange('originalCashFlowProgramLink', event.target.value)} className="h-9 border-sky-900/60 bg-neutral-900 text-sm text-white" />
                            </label>
                        </div>

                        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-4">
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-white font-semibold">Monthly Distribution</p>
                                    <p className="text-xs text-neutral-400">Choose a month, then enter the requested and obligated values for that schedule slot.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sky-200">
                                        Requested: {totalRequested.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                                        Obligated: {totalObligated.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-3">
                                <label className="space-y-2">
                                    <span className="text-xs uppercase tracking-widest text-sky-300/70">Month to Update</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(event) => setSelectedMonth(event.target.value as NTCARequestMonthKey)}
                                        className="h-9 w-full rounded-md border border-sky-900/60 bg-neutral-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                    >
                                        {MONTH_KEYS.map((month) => (
                                            <option key={month} value={month}>
                                                {MONTH_LABELS[month]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div className="rounded-xl border border-sky-900/50 bg-neutral-900/70 p-3 space-y-2.5">
                                    <p className="text-xs font-semibold tracking-[0.18em] text-sky-200 uppercase">{MONTH_LABELS[selectedMonth]}</p>
                                    <label className="space-y-1 block">
                                        <span className="text-[11px] uppercase tracking-widest text-neutral-500">Amount to be Requested</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={form.monthly[selectedMonth].amountRequested}
                                            onChange={(event) => handleMonthChange(selectedMonth, 'amountRequested', event.target.value)}
                                            className="h-9 border-sky-900/60 bg-black/40 text-sm text-white"
                                        />
                                    </label>
                                    {/* <label className="space-y-1 block">
                                        <span className="text-[11px] uppercase tracking-widest text-neutral-500">Obligated with Supplier</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={form.monthly[selectedMonth].obligatedWithSupplier}
                                            onChange={(event) => handleMonthChange(selectedMonth, 'obligatedWithSupplier', event.target.value)}
                                            className="h-9 border-emerald-900/60 bg-black/40 text-sm text-white"
                                        />
                                    </label> */}
                                </div>
                            </div>
                        </div>

                        {submitError && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                {submitError}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 border-t border-sky-500/20 px-5 py-4 sm:px-6">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                                reset();
                                onOpenChange(false);
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-50"
                        >
                            {submitting ? 'Saving…' : 'Add Row'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddNTCARequestRowDialog;
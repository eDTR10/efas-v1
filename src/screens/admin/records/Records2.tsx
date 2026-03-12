import { getSheetMetadata, readSheetData } from "./../../../plugin/googleSheets";
import SheetSettingsModal, { getSheetSettings } from "./../../../components/SheetSettingsModal";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { useSearchParams, useNavigate } from "react-router-dom";
import logo from '../../../assets/eFAS_Logo.png';

type SelectOption = {
  value: string;
  label: string;
};

type YearSourceRow = {
  year: string;
  raodUrl: string;
  saroUrl: string;
};

type ResolvedSheetSource = {
  spreadsheetId: string;
  range: string;
};

const YEAR_SOURCE_SHEET_ID = "1f-cel_Qx8R5KmrLa7w1itrPUo69DwvtRuC0A1kVoHmg";
const YEAR_SOURCE_RANGE = "A:C";
const DEFAULT_TABLE_RANGE = "A:ZZ";

const DEFAULT_SARO_DATA = [
  [
    "REGION",
    "DATE RECD IN EMAIL",
    "DATE OF SARO",
    "ALLOTMENT NO.",
    "PROGRAM",
    "Notes/Validity",
    "Total Amount",
    "PAP",
    "DESCRIPTION",
    "CLASS TYPE",
    "FUND TYPE",
    "Object Code no.",
    "Object Code Desc",
    "AMOUNT",
    "PURPOSE",
    "REGION X",
    "NCA AMOUNT",
    "DATE",
    "NCA NO.",
    "BALANCE"
  ]
];

const DEFAULT_RAOD_DATA = [
  [
    "PAP",
    "PAP CODE",
    "DATE OF SARO",
    "SARO NO",
    "AMOUNT OF ALLOTMENT",
    "REMARKS\n(PO ONLY, JO ONLY, ETC)",
    "OBJECT TITLE",
    "OBJECT CODE",
    "Date of Obligation",
    "Description - Fund Type",
    "CLASS TYPE\n01-PS\n02-MOOE\n06-CAPITAL OUTLAY",
    "fund source",
    "ORS NO.",
    "NAME OF CLAIMANT",
    "PARTICULARS",
    "OBLIGATED AMOUNT",
    "DATE",
    "ADA/CHECK",
    "CASH",
    "NON TRA",
    "BALANCE"
  ]
];

const parseSpreadsheetId = (urlOrId: string) => {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
};

const parseGidFromUrl = (url: string): number | null => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const gidFromSearch = parsedUrl.searchParams.get("gid");
    if (gidFromSearch && /^\d+$/.test(gidFromSearch)) {
      return Number(gidFromSearch);
    }

    const gidFromHash = parsedUrl.hash.match(/gid=(\d+)/);
    if (gidFromHash) {
      return Number(gidFromHash[1]);
    }
  } catch {
    const gidFromRaw = url.match(/gid=(\d+)/);
    if (gidFromRaw) {
      return Number(gidFromRaw[1]);
    }
  }

  return null;
};

const sanitizeSheetName = (sheetName: string) => {
  // Escape single quotes so the sheet title is valid in A1 notation.
  return `'${sheetName.replace(/'/g, "''")}'`;
};

const resolveSheetSourceFromUrl = async (sheetUrl: string): Promise<ResolvedSheetSource | null> => {
  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return null;

  try {
    const sheets = await getSheetMetadata(spreadsheetId);
    const gid = parseGidFromUrl(sheetUrl);
    const sheetList = Array.isArray(sheets) ? sheets : [];
    const matchedSheet = typeof gid === "number"
      ? sheetList.find((sheet: any) => sheet?.properties?.sheetId === gid)
      : null;
    const fallbackSheet = sheetList[0];
    const sheetTitle: string | undefined = matchedSheet?.properties?.title || fallbackSheet?.properties?.title;
    const range = sheetTitle
      ? `${sanitizeSheetName(sheetTitle)}!${DEFAULT_TABLE_RANGE}`
      : DEFAULT_TABLE_RANGE;

    return {
      spreadsheetId,
      range,
    };
  } catch (error) {
    console.log("Error resolving sheet metadata from URL:", error);
    return {
      spreadsheetId,
      range: DEFAULT_TABLE_RANGE,
    };
  }
};


// Move parseAmount function before component definition
const parseAmount = (value: string) => {
  if (!value) return 0;
  // Remove spaces and handle parentheses
  const cleanValue = value.trim().replace(/[()]/g, "");
  // Convert to negative if was in parentheses
  const multiplier = value.includes("(") ? -1 : 1;
  // Remove commas and convert to number
  const parsed = Number(cleanValue.replace(/,/g, ""));
  // Return 0 if NaN, otherwise return the parsed value
  return isNaN(parsed) ? 0 : parsed * multiplier;
};

const getRaodIndices = (year: string) => {
  const yearNum = parseInt(year, 10);
  if (!isNaN(yearNum) && yearNum >= 2026) {
    return {
      saroNo: 3,
      objectCode: 7,
      dateObligation: 8,
      classType: 10,
      fundSource: 11,
      claimant: 13,
      particulars: 14,
      obligatedAmount: 15,
      date: 16
    };
  }
  return {
    saroNo: 3,
    objectCode: 6,
    dateObligation: 7,
    classType: 9,
    fundSource: 10,
    claimant: 12,
    particulars: 13,
    obligatedAmount: 14,
    date: 15
  };
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#3B82F6' : '#262626',
    boxShadow: state.isFocused ? '0 0 0 2px #3B82F644' : 'none',
    color: '#ffffff',
    minHeight: '44px',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    border: '1px solid #3B82F633',
    zIndex: 10000,
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 10000,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#3B82F6'
      : state.isFocused
        ? '#171717'
        : 'transparent',
    color: state.isSelected ? '#ffffff' : '#e5e5e5',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#ffffff',
  }),
  input: (base: any) => ({
    ...base,
    color: '#ffffff',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#93C5FD',
  }),
  indicatorSeparator: (base: any) => ({
    ...base,
    backgroundColor: '#262626',
  }),
  dropdownIndicator: (base: any, state: any) => ({
    ...base,
    color: state.isFocused ? '#3B82F6' : '#737373',
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: '#737373',
  }),
};

function Records() {
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_sheetSettings, setSheetSettings] = useState(getSheetSettings());

  const [data, setData] = useState(DEFAULT_SARO_DATA);
  const [raod, setRaod] = useState(DEFAULT_RAOD_DATA);
  const [yearSources, setYearSources] = useState<YearSourceRow[]>([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedAllotment, setSelectedAllotment] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();


  const updateFilterParamsInUrl = (updates: Partial<Record<"program" | "allotment", string>>) => {
    const params = new URLSearchParams(window.location.search);

    (Object.keys(updates) as Array<"program" | "allotment">).forEach((key) => {
      const value = updates[key];
      if (typeof value === "string" && value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  };

  // Initialize selected values from URL parameters
  useEffect(() => {
    const yearParam = searchParams.get('year');
    const programParam = searchParams.get('program');
    const allotmentParam = searchParams.get('allotment');

    setSelectedYear(yearParam || "");
    setSelectedProgram(programParam || "");
    setSelectedAllotment(allotmentParam || "");
  }, [searchParams]);

  // Modify the onChange handlers to update URL
  const handleYearChange = (selectedOption: SelectOption | null) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setSelectedYear(newValue);
    setSelectedProgram("");
    setSelectedAllotment("");
    setSelectedRow(null);

    const params = new URLSearchParams(searchParams);
    if (newValue) {
      params.set("year", newValue);
    } else {
      params.delete("year");
    }
    params.delete("program");
    params.delete("allotment");
    setSearchParams(params);
  };

  const handleProgramChange = (selectedOption: SelectOption | null) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setSelectedProgram(newValue);

    if (!newValue) {
      setSelectedAllotment("");
      updateFilterParamsInUrl({ program: "", allotment: "" });
      return;
    }

    updateFilterParamsInUrl({ program: newValue });
  };

  const handleAllotmentChange = (selectedOption: SelectOption | null) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setSelectedAllotment(newValue);
    updateFilterParamsInUrl({ allotment: newValue });
  };

  const getYearSources = async (): Promise<YearSourceRow[]> => {
    try {
      const values = await readSheetData(YEAR_SOURCE_SHEET_ID, YEAR_SOURCE_RANGE);
      if (!values || values.length <= 1) {
        setYearSources([]);
        return [];
      }

      const parsedRows: YearSourceRow[] = values
        .slice(1)
        .map((row: any[]) => ({
          year: String(row[0] || "").trim(),
          raodUrl: String(row[1] || "").trim(),
          saroUrl: String(row[2] || "").trim(),
        }))
        .filter((row: YearSourceRow) => row.year && row.raodUrl && row.saroUrl)
        .sort((a: YearSourceRow, b: YearSourceRow) => {
          const yearA = Number(a.year);
          const yearB = Number(b.year);

          if (!Number.isNaN(yearA) && !Number.isNaN(yearB)) {
            return yearB - yearA;
          }

          return b.year.localeCompare(a.year);
        });

      setYearSources(parsedRows);
      return parsedRows;
    } catch (error) {
      console.log("Error fetching year source sheet:", error);
      setYearSources([]);
      return [];
    }
  };

  useEffect(() => {
    let isActive = true;

    const initializeYearSources = async () => {
      setLoading(true);
      const rows = await getYearSources();
      if (!isActive) return;

      if (rows.length === 0) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const yearFromUrl = params.get("year");
      const isValidUrlYear = !!yearFromUrl && rows.some((row) => row.year === yearFromUrl);
      const initialYear = isValidUrlYear ? yearFromUrl : rows[0].year;

      setSelectedYear(initialYear);

      if (params.get("year") !== initialYear) {
        params.set("year", initialYear);
        setSearchParams(params, { replace: true });
      }
    };

    initializeYearSources();

    return () => {
      isActive = false;
    };
  }, [setSearchParams]);

  useEffect(() => {
    if (!selectedYear || yearSources.length === 0) return;

    const selectedSource = yearSources.find((row) => row.year === selectedYear);
    if (!selectedSource) return;

    let isActive = true;
    setLoading(true);

    const loadYearData = async () => {
      try {
        const [saroSource, raodSource] = await Promise.all([
          resolveSheetSourceFromUrl(selectedSource.saroUrl),
          resolveSheetSourceFromUrl(selectedSource.raodUrl),
        ]);

        const [saroValues, raodValues] = await Promise.all([
          saroSource ? readSheetData(saroSource.spreadsheetId, saroSource.range) : Promise.resolve(DEFAULT_SARO_DATA),
          raodSource ? readSheetData(raodSource.spreadsheetId, raodSource.range) : Promise.resolve(DEFAULT_RAOD_DATA),
        ]);

        if (!isActive) return;

        setData(saroValues && saroValues.length > 0 ? saroValues : DEFAULT_SARO_DATA);
        setRaod(raodValues && raodValues.length > 0 ? raodValues : DEFAULT_RAOD_DATA);
        setSelectedRow(null);
      } catch (error) {
        if (!isActive) return;
        console.log(`Error fetching data for year ${selectedYear}:`, error);
        setData(DEFAULT_SARO_DATA);
        setRaod(DEFAULT_RAOD_DATA);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadYearData();

    return () => {
      isActive = false;
    };
  }, [selectedYear, yearSources]);

  const refreshAllData = async () => {
    setLoading(true);
    const rows = await getYearSources();

    if (rows.length === 0) {
      setData(DEFAULT_SARO_DATA);
      setRaod(DEFAULT_RAOD_DATA);
      setLoading(false);
      return;
    }

    const hasCurrentYear = rows.some((row) => row.year === selectedYear);
    if (!hasCurrentYear) {
      const nextYear = rows[0].year;
      setSelectedYear(nextYear);
      setSelectedProgram("");
      setSelectedAllotment("");

      const params = new URLSearchParams(searchParams);
      params.set("year", nextYear);
      params.delete("program");
      params.delete("allotment");
      setSearchParams(params);
      return;
    }

    setLoading(false);
  };

  const yearOptions: SelectOption[] = yearSources.map((row) => ({
    value: row.year,
    label: row.year,
  }));

  const allotment = [
    ...new Set(
      data
        .slice(1)
        .filter((row) => !selectedProgram || row[8] === selectedProgram)
        .map((row) => row[3])
        .filter(Boolean)
    )
  ];
  const programs = [...new Set(data.slice(1).map((row) => row[8]).filter(Boolean))];

  const programOptions: SelectOption[] = programs.map((program) => ({
    value: program,
    label: program,
  }));
  const allotmentOptions: SelectOption[] = allotment.map((allotment) => ({
    value: allotment,
    label: allotment,
  }));

  // If selected allotment doesn't belong to the chosen program, clear it.
  useEffect(() => {
    // Wait for sheet data to load before validating URL-provided filter values.
    if (loading || data.length <= 1) {
      return;
    }

    if (selectedAllotment && !allotment.includes(selectedAllotment)) {
      setSelectedAllotment("");
      updateFilterParamsInUrl({ allotment: "" });
    }
  }, [loading, data, selectedProgram, selectedAllotment, allotment]);

  // Update the filtering logic
  const filteredData = data.filter((row, index) => {
    if (index === 0) return true; // Always include header row

    if (!selectedProgram && !selectedAllotment) return true; // Show all if nothing selected

    if (selectedProgram && selectedAllotment) {
      return row[8] === selectedProgram && row[3] === selectedAllotment;
    }

    if (selectedProgram) {
      return row[8] === selectedProgram; // Include all rows matching program
    }

    if (selectedAllotment) {
      return row[3] === selectedAllotment;
    }

    return true;
  });

  // Add console logs to debug
  useEffect(() => {
    console.log("Selected Year:", selectedYear);
    console.log("Selected Program:", selectedProgram);
    console.log("Selected Allotment:", selectedAllotment);
    console.log("Filtered Data Length:", filteredData.length);
  }, [selectedYear, selectedProgram, selectedAllotment, filteredData]);

  const totals = filteredData.slice(1).reduce(
    (acc, row: any) => {
      const indices = getRaodIndices(selectedYear);
      const amount = row[13] ? parseAmount(row[13]) : 0;
      const matchingRaods = raod
        .slice(1)
        .filter(
          (raodRow) =>
            raodRow[indices.saroNo] === row[3] &&
            raodRow[indices.objectCode] === row[11]
        );

      console.log("Calculating totals for row:", row);

      console.log("Matching RAODs for totals calculation:", matchingRaods);
      const totalObligation = matchingRaods.reduce((sum, raodRow: any) => {
        const value = raodRow[indices.obligatedAmount] ? parseAmount(raodRow[indices.obligatedAmount]) : 0;
        return sum + value;
      }, 0);
      const unobligated = amount - totalObligation;

      return {
        amount: acc.amount + amount,
        obligation: acc.obligation + totalObligation,
        unobligated: acc.unobligated + unobligated,
      };
    },
    { amount: 0, obligation: 0, unobligated: 0 }
  );

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const recordCount = filteredData.length - 1;

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-green-500/5 blur-3xl pointer-events-none xs:hidden" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-green-400/5 blur-3xl pointer-events-none animate-pulse xs:hidden" />

      <SheetSettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setSheetSettings(getSheetSettings());
          void refreshAllData();
        }}
      />

      {/* Nav Bar */}
      <nav className="relative z-30 w-full flex items-center justify-between px-6 md:px-4 py-3 bg-black/90 backdrop-blur border-b border-green-500/20 shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white hover:text-green-400 font-medium text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-green-500/40 transition-all duration-200 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="xs:hidden">Back</span>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
          <p className="text-green-400/60 text-[9px] tracking-widest uppercase">eFAS System</p>
          <h1 className="text-white font-bold text-sm md:text-xs tracking-tight">RAOD — Financial Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Logo" className="h-9 md:h-7 w-auto object-contain bg-transparent" />
        </div>
      </nav>

      <div className="relative z-10 p-6 md:p-4 sm:p-3 xs:p-2">

        {/* Skeleton Loading */}
        {loading && (
          <div className="animate-pulse">
            {/* Filter skeleton */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-5 mb-5">
              <div className="grid grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-4">
                <div>
                  <div className="h-3 w-20 bg-neutral-800 rounded mb-2" />
                  <div className="h-11 bg-neutral-800 rounded-lg" />
                </div>
                <div>
                  <div className="h-3 w-20 bg-neutral-800 rounded mb-2" />
                  <div className="h-11 bg-neutral-800 rounded-lg" />
                </div>
                <div>
                  <div className="h-3 w-20 bg-neutral-800 rounded mb-2" />
                  <div className="h-11 bg-neutral-800 rounded-lg" />
                </div>
              </div>
            </div>
            {/* Stats cards skeleton */}
            <div className="mb-5">
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-4 mb-3">
                {["yellow", "green", "red"].map((c) => (
                  <div key={c} className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-2.5 w-20 bg-neutral-800 rounded mb-2" />
                      <div className="h-4 w-32 bg-neutral-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 px-4 py-3 flex items-center gap-3">
                <div className="h-2.5 w-20 bg-neutral-800 rounded shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-neutral-800" />
                <div className="h-3 w-10 bg-neutral-800 rounded shrink-0" />
              </div>
            </div>
            {/* Table skeleton */}
            <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/80">
              <div className="px-5 py-3 bg-black/60 border-b border-neutral-800 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-green-900" />
                <div className="h-3 w-24 bg-neutral-800 rounded" />
              </div>
              <table className="min-w-full">
                <thead className="bg-black/80">
                  <tr>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <th key={i} className="px-4 py-3">
                        <div className="h-2.5 bg-neutral-800 rounded" style={{ width: `${50 + (i % 3) * 20}px` }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {Array.from({ length: 7 }).map((_, ri) => (
                    <tr key={ri}>
                      {Array.from({ length: 10 }).map((_, ci) => (
                        <td key={ci} className="px-4 py-3">
                          <div className="h-3 bg-neutral-800 rounded" style={{ width: `${40 + ((ri + ci) % 4) * 20}px` }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className={`rounded-2xl bg-neutral-900/80 backdrop-blur p-5 md:p-4 mb-5 border border-neutral-800 shadow-sm ${loading ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 mb-4">



          </div>
          <div className="grid grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-4 md:gap-3">
            <div>
              <label className="block text-xs font-semibold text-green-400/80 mb-1.5 uppercase tracking-wider">Year</label>
              <Select
                id="year"
                name="year"
                options={yearOptions}
                value={yearOptions.find((option) => option.value === selectedYear) || null}
                onChange={handleYearChange}
                isClearable={false}
                placeholder="Choose year..."
                styles={selectStyles}
                menuPortalTarget={typeof window !== 'undefined' ? window.document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-400/80 mb-1.5 uppercase tracking-wider">Program</label>
              <Select
                id="program"
                name="program"
                options={programOptions}
                value={programOptions.find((option) => option.value === selectedProgram) || null}
                onChange={handleProgramChange}
                isClearable
                placeholder="Choose program..."
                styles={selectStyles}
                menuPortalTarget={typeof window !== 'undefined' ? window.document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-400/80 mb-1.5 uppercase tracking-wider">Allotment</label>
              <Select
                id="allotment"
                name="allotment"
                options={allotmentOptions}
                value={allotmentOptions.find((option) => option.value === selectedAllotment) || null}
                onChange={handleAllotmentChange}
                isClearable
                placeholder="Choose allotment..."
                styles={selectStyles}
                menuPortalTarget={typeof window !== 'undefined' ? window.document.body : null}
              />
            </div>
            {/* <button
              onClick={() => setSettingsOpen(true)}
              className="ml-auto flex items-center gap-1.5 text-green-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 border border-neutral-700 hover:border-green-500/40 transition-all duration-200 text-xs font-medium"
            >
              <Settings size={13} />
              Settings
            </button> */}


          </div>
        </div>

        {/* Stats Cards */}
        {!loading && filteredData.length > 1 && (() => {
          const obligatedPct = totals.amount > 0 ? Math.min(100, (totals.obligation / totals.amount) * 100) : 0;
          const unobligatedPct = 100 - obligatedPct;
          const barColor = obligatedPct >= 100 ? "bg-red-500" : obligatedPct >= 75 ? "bg-amber-400" : "bg-green-500";
          const pctColor = obligatedPct >= 100 ? "text-red-400" : obligatedPct >= 75 ? "text-amber-400" : "text-green-400";
          console.log(unobligatedPct);
          return (
            <div className="mb-5">
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-4 md:gap-3 mb-3">
                {/* Total Amount */}
                <div className="rounded-2xl bg-yellow-950/30 border border-yellow-700/30 p-4 md:p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-900/40 border border-yellow-600/40 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-yellow-500/70 uppercase tracking-wider font-semibold">Total Amount</p>
                    <p className="text-yellow-400 font-bold text-base md:text-sm truncate">{fmt(totals.amount)}</p>
                  </div>
                </div>
                {/* Obligated */}
                <div className="rounded-2xl bg-green-950/40 border border-green-800/40 p-4 md:p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-900/50 border border-green-700/50 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-green-500/70 uppercase tracking-wider font-semibold">Obligated</p>
                    <p className="text-green-400 font-bold text-base md:text-sm truncate">{fmt(totals.obligation)}</p>
                  </div>
                </div>
                {/* Unobligated */}
                <div className="rounded-2xl bg-red-950/30 border border-red-800/30 p-4 md:p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-900/40 border border-red-700/40 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-red-400/60 uppercase tracking-wider font-semibold">Unobligated</p>
                    <p className="text-red-400 font-bold text-base md:text-sm truncate">{fmt(totals.unobligated)}</p>
                  </div>
                </div>
              </div>
              {/* Utilization bar spanning all cards */}
              <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 px-4 py-3 flex items-center gap-3">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-widest shrink-0">Utilization</span>
                <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${obligatedPct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold shrink-0 ${pctColor}`}>{obligatedPct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })()}

        {/* Records Table Section */}
        <div className={`rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/80 shadow-sm ${loading ? 'hidden' : ''}`}>
          {/* Table header row */}
          <div className="px-5 md:px-4 py-3 bg-black/60 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-green-500" />
              <h2 className="text-white font-semibold text-sm">Records</h2>
            </div>
            {filteredData.length > 1 && (
              <span className="text-[10px] text-neutral-500 font-medium">
                {recordCount} row{recordCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-[55vh]">
            {filteredData.length <= 1 ? (
              <div className="flex flex-col items-center justify-center h-56 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-neutral-400 text-sm font-medium">No records found</p>
                  <p className="text-neutral-600 text-xs mt-1">Try changing the selected year, program, or allotment</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-neutral-800/60 text-sm">
                <thead className="bg-black/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    {["Allotment No.", "Date", "Program", "Description", "Obj. Code", "Amount", "Obligated", "Unobligated", "NTCA No.", "Date Recd"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-green-400/80 uppercase tracking-widest whitespace-nowrap border-b border-neutral-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {selectedProgram && selectedAllotment && filteredData[1] && (
                    <tr className="bg-green-900/15 border-l-2 border-l-green-500/50">
                      <td className="px-4 py-3 text-xs font-semibold text-green-300 whitespace-nowrap">{filteredData[1][3]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{filteredData[1][1]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-300 max-w-[160px] truncate">{filteredData[1][8]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-300 max-w-[180px] truncate">{filteredData[1][14]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{filteredData[1][7]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-300 whitespace-nowrap">{filteredData[1][6]}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">—</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">—</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">—</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">—</td>
                    </tr>
                  )}
                  {filteredData.slice(1).map((row: any, rowIndex) => {
                    const indices = getRaodIndices(selectedYear);
                    const matchingRaods: any[] = raod
                      .slice(1)
                      .filter((raodRow) => raodRow[indices.saroNo] === row[3] && raodRow[indices.objectCode] === row[11]);

                    const totalObligation = matchingRaods.reduce((sum, raodRow) => {
                      return sum + (raodRow[indices.obligatedAmount] ? parseAmount(raodRow[indices.obligatedAmount]) : 0);
                    }, 0);

                    const cleanNumber = (value: string) => {
                      const num = Number(value.replace(/,/g, "").trim());
                      return isNaN(num) ? 0 : num;
                    };
                    const amount = row[13] ? cleanNumber(row[13]) : 0;
                    const unobligated = amount - totalObligation;
                    const rowId = `${row[3]}-${row[8]}-${row[11]}`;
                    const isExpanded = selectedRow === rowId;

                    return (
                      <React.Fragment key={rowIndex}>
                        <tr
                          className={`transition-colors cursor-pointer ${isExpanded ? "bg-green-950/30 border-l-2 border-l-green-500" : "hover:bg-neutral-800/40 border-l-2 border-l-transparent"}`}
                          onClick={() => setSelectedRow(isExpanded ? null : rowId)}
                        >
                          <td className="px-4 py-3 text-xs font-medium text-white whitespace-nowrap">
                            {selectedProgram && selectedAllotment ? (
                              <span className="text-neutral-500 italic text-[10px]">—</span>
                            ) : row[3]}
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                            {selectedProgram && selectedAllotment ? "" : row[1]}
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-300 max-w-[160px] truncate">
                            {selectedProgram && selectedAllotment ? "" : row[8]}
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-300 max-w-[180px] truncate">{row[12]}</td>
                          <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{row[11]}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-white whitespace-nowrap">{row[13]}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-green-400 whitespace-nowrap">
                            {totalObligation ? fmt(totalObligation) : <span className="text-neutral-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                            <span className={unobligated < 0 ? "text-red-400" : unobligated === 0 ? "text-neutral-500" : "text-amber-400"}>
                              {unobligated !== 0 ? fmt(unobligated) : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{row[18]}</td>
                          <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">{row[17]}</td>
                        </tr>
                        {isExpanded && matchingRaods.length > 0 && (() => {
                          const initialAmt = parseAmount(row[13]);
                          const totalObligated = matchingRaods.reduce((sum, r) => sum + parseAmount(r[indices.obligatedAmount]), 0);
                          const finalBalance = initialAmt - totalObligated;
                          const utilizationPct = initialAmt > 0 ? Math.min(100, (totalObligated / initialAmt) * 100) : 0;
                          return (
                            <tr>
                              <td colSpan={10} className="px-4 py-4 bg-neutral-950/70">
                                <div className="rounded-2xl border border-neutral-800 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">

                                  {/* Header badingdong*/}
                                  <div className="px-5 py-3.5 bg-black/70 border-b border-neutral-800 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-bold text-white tracking-tight">Obligations Breakdown</span>
                                      <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">{matchingRaods.length} entr{matchingRaods.length !== 1 ? "ies" : "y"}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[11px]">
                                      <div className="text-right">
                                        <p className="text-neutral-600 uppercase tracking-wider text-[9px] font-semibold">Total Obligated</p>
                                        <p className="text-green-400 font-bold">{fmt(totalObligated)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-neutral-600 uppercase tracking-wider text-[9px] font-semibold">Remaining</p>
                                        <p className={`font-bold ${finalBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>{fmt(finalBalance)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Utilization bar */}
                                  <div className="px-5 py-2.5 bg-neutral-900/60 border-b border-neutral-800/60 flex items-center gap-3">
                                    <span className="text-[10px] text-neutral-500 font-medium whitespace-nowrap">Utilization</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${utilizationPct >= 100 ? "bg-red-500" : utilizationPct >= 75 ? "bg-amber-500" : "bg-green-500"}`}
                                        style={{ width: `${utilizationPct}%` }}
                                      />
                                    </div>
                                    <span className={`text-[10px] font-bold whitespace-nowrap ${utilizationPct >= 100 ? "text-red-400" : utilizationPct >= 75 ? "text-amber-400" : "text-green-400"}`}>
                                      {utilizationPct.toFixed(1)}%
                                    </span>
                                  </div>

                                  {/* Table */}
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead>
                                        <tr className="bg-neutral-900/50 border-b border-neutral-800/60">
                                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest w-8">#</th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Claimant</th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Date</th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Class / Fund</th>
                                          <th className="px-4 py-2.5 text-right text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Obligated</th>
                                          <th className="px-4 py-2.5 text-right text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Remaining Balance</th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Particulars</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-800/40">
                                        {/* Initial Amount Row */}
                                        <tr className="bg-neutral-800/30">
                                          <td className="px-4 py-2.5 text-neutral-600 text-[10px]">—</td>
                                          <td colSpan={3} className="px-4 py-2.5">
                                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Initial Allotment</span>
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-[11px] text-neutral-500">—</td>
                                          <td className="px-4 py-2.5 text-right">
                                            <span className="text-[11px] font-bold text-yellow-400">{row[13]}</span>
                                          </td>
                                          <td></td>
                                        </tr>
                                        {matchingRaods.map((raodRow, index) => {
                                          const credit = parseAmount(raodRow[indices.obligatedAmount]);
                                          const previousCredits = matchingRaods
                                            .slice(0, index)
                                            .reduce((sum, r) => sum + parseAmount(r[indices.obligatedAmount]), 0);
                                          const balance = initialAmt - previousCredits - credit;
                                          const isLast = index === matchingRaods.length - 1;
                                          return (
                                            <tr key={index} className={`transition-colors group ${isLast ? "bg-neutral-900/40" : "hover:bg-neutral-800/30"}`}>
                                              <td className="px-4 py-3 text-[10px] font-mono text-neutral-600">{index + 1}</td>
                                              <td className="px-4 py-3">
                                                <span className="text-[11px] font-medium text-neutral-200 block max-w-[160px] truncate">
                                                  {raodRow[indices.claimant]}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-[11px] text-neutral-400 whitespace-nowrap">{raodRow[indices.dateObligation]}</td>
                                              <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                  {raodRow[indices.classType]} / {raodRow[indices.fundSource]}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className="text-[11px] font-semibold text-green-400">
                                                  {credit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className={`text-[11px] font-bold ${balance < 0 ? "text-red-400" : balance === 0 ? "text-neutral-500" : "text-emerald-400"}`}>
                                                  {balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 max-w-[220px]">
                                                <div className="group/p relative">
                                                  <span className="text-[11px] text-neutral-400 block truncate cursor-default">{raodRow[indices.particulars]}</span>
                                                  {raodRow[indices.particulars] && (
                                                    <div className="hidden group-hover/p:block absolute right-0 top-full mt-1.5 z-50 w-80 bg-neutral-800 border border-neutral-700 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3">
                                                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Particulars</p>
                                                      <p className="text-[11px] text-neutral-200 whitespace-normal break-words leading-relaxed">{raodRow[indices.particulars]}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot className="border-t-2 border-neutral-700/80 bg-black/50">
                                        <tr>
                                          <td colSpan={4} className="px-4 py-3">
                                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Final Balance</span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-[11px] font-bold text-green-400">{fmt(totalObligated)}</span>
                                          </td>
                                          <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span className={`text-sm font-bold ${finalBalance < 0 ? "text-red-400" : finalBalance === 0 ? "text-neutral-500" : "text-emerald-400"}`}>
                                              {fmt(finalBalance)}
                                            </span>
                                          </td>
                                          <td />
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-black/90 sticky bottom-0 z-10 border-t-2 border-green-500/30">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-xs font-bold text-green-400 uppercase tracking-wider">Totals</td>
                    <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">{fmt(totals.amount)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-green-400 whitespace-nowrap">{fmt(totals.obligation)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-red-400 whitespace-nowrap">{fmt(totals.unobligated)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Records;
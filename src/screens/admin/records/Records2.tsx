import { readSheetData } from "./../../../plugin/googleSheets";
import SheetSettingsModal, { getSheetSettings } from "./../../../components/SheetSettingsModal";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { useSearchParams }  from "react-router-dom"; // Add this import
import { Settings } from "lucide-react";


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

function Records() {

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_sheetSettings, setSheetSettings] = useState(getSheetSettings());

  const [data, setData] = useState([
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
  ]);

  const [raod, setRaod] = useState([
    [
      "PAP",
      "PAP CODE", 
      "DATE OF SARO",
      "SARO NO",
      "ALLOTMENT AMOUNT",
      "OBJECT TITLE",
      "OBJECT CODE",
      "DATE OF OBLIGATION",
      "Description - Fund Type",
      "CLASS TYPE",
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
  ]);

  const [selectedAllotment, setSelectedAllotment] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();


  // Initialize selected values from URL parameters
  useEffect(() => {
    const programParam = searchParams.get('program');
    const allotmentParam = searchParams.get('allotment');
    
    if (programParam) setSelectedProgram(programParam);
    if (allotmentParam) setSelectedAllotment(allotmentParam);
  }, [searchParams]);

  // Modify the onChange handlers to update URL
  const handleProgramChange = (selectedOption: any) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setSelectedProgram(newValue);
    
    // Update URL parameters
    if (newValue) {
      searchParams.set('program', newValue);
    } else {
      searchParams.delete('program');
    }
    setSearchParams(searchParams);
  };

  const handleAllotmentChange = (selectedOption: any) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setSelectedAllotment(newValue);
    
    // Update URL parameters
    if (newValue) {
      searchParams.set('allotment', newValue);
    } else {
      searchParams.delete('allotment');
    }
    setSearchParams(searchParams);
  };

  function getData() {
    const settings = getSheetSettings();
    readSheetData(settings.mdsRegR10Id, `${settings.mdsRegR10Sheet}`)
      .then((values) => {
        if (values) {
          setData(values);
        }
      })
      .catch((error) => {
        console.log("Error fetching MDS Regular R10 sheet:", error);
      });
  }

  function getDataRAOD() {
    const settings = getSheetSettings();
    readSheetData(settings.raod2024Id, `${settings.raod2024Sheet}`)
      .then((values) => {
        if (values) {
          setRaod(values);
        }
      })
      .catch((error) => {
        console.log("Error fetching 2025 sheet:", error);
      });
  }
  useEffect(() => {
    getData();
    getDataRAOD();
  }, []);

  // Update these lines to get programs and allotments from correct columns
  const allotment = [...new Set(data.slice(1).map((row) => row[3]))]; // ALLOTMENT NO.
  const programs = [...new Set(data.slice(1).map((row) => row[8]))];  // PROGRAM from column 4 (PROGRAM)

  const programOptions = programs.map((program) => ({
    value: program,
    label: program,
  }));
  const allotmentOptions = allotment.map((allotment) => ({
    value: allotment,
    label: allotment,
  }));

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
    console.log("Selected Program:", selectedProgram);
    console.log("Selected Allotment:", selectedAllotment);
    console.log("Filtered Data Length:", filteredData.length);
  }, [selectedProgram, selectedAllotment, filteredData]);

  const totals = filteredData.slice(1).reduce(
    (acc, row: any) => {
      const amount = row[13] ? parseAmount(row[13]) : 0;
      const matchingRaods = raod
        .slice(1)
        .filter(
          (raodRow) =>
            raodRow[3] === row[3] &&
            raodRow[6] === row[11]
        );

        console.log("Calculating totals for row:", row);

        console.log("Matching RAODs for totals calculation:", matchingRaods);
      const totalObligation = matchingRaods.reduce((sum, raodRow: any) => {
        const value = raodRow[14] ? parseAmount(raodRow[14]) : 0;
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

  return (
    <div className="h-full w-full bg-gray-50">
      <SheetSettingsModal 
        isOpen={settingsOpen} 
        onClose={() => {
          setSettingsOpen(false);
          setSheetSettings(getSheetSettings());
          getData();
          getDataRAOD();
        }}
      />

      {/* Header Section */}
      {/* <div className="bg-white border-b border-gray-200 px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Records Management</h1>
        <p className="text-gray-600">Monitor and analyze budget allocations, obligations, and unobligated amounts</p>
      </div> */}

      <div className="p-8">
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Program</label>
              <Select
                id="program"
                name="program"
                options={programOptions}
                value={programOptions.find((option) => option.value === selectedProgram)}
                onChange={handleProgramChange}
                isClearable
                placeholder="Choose program..."
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Allotment</label>
              <Select
                id="allotment"
                name="allotment"
                options={allotmentOptions}
                value={allotmentOptions.find((option) => option.value === selectedAllotment)}
                onChange={handleAllotmentChange}
                isClearable
                placeholder="Choose allotment..."
                className="mt-1"
              />
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
            >
              <Settings size={18} />
              Settings
            </button>
          </div>
        </div>

        {/* Stats Cards */}


        {/* Records Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
   

          <div className="overflow-auto max-h-[70vh]">
            {filteredData.length <= 1 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 text-lg">No records found. Select Program and Allotment to view data.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ALLOTMENT NO.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PROGRAM</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">OBJ. CODE</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">AMOUNT</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TOTAL OBLIGATION</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TOTAL UNOBLIGATED</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NTCA NUMBER</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATE RECEIVED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
              
            {/* {console.log(filteredData[1])} */}
              {selectedProgram && selectedAllotment && filteredData[1] && (
                <tr className="bg-blue-50 hover:bg-blue-100">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{filteredData[1][3]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{filteredData[1][1]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{filteredData[1][8]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{filteredData[1][14]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{filteredData[1][7]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{filteredData[1][6]}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700"></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700"></td>
                  <td className="px-6 py-4 text-sm text-gray-600"></td>
                  <td className="px-6 py-4 text-sm text-gray-600"></td>
                </tr>
              )}
              {filteredData.slice(1).map((row: any, rowIndex) => {
                const matchingRaods: any[] = raod
                  .slice(1)
                  .filter(
                    (raodRow) => {
                      const match = raodRow[3] === row[3] && raodRow[6] === row[11];
                      return match;
                    }
                  );

                const totalObligation = matchingRaods.reduce((sum, raodRow) => {
                  const value = raodRow[14] ? parseAmount(raodRow[14]) : 0;
                  return sum + value;
                }, 0);

                const cleanNumber = (value: string) => {
                  const num = Number(value.replace(/,/g, "").trim());
                  return isNaN(num) ? 0 : num;
                };
                const amount = row[13] ? cleanNumber(row[13]) : 0;
                const unobligated = amount - totalObligation;

                return (
                  <React.Fragment key={rowIndex}>
                    <tr
                      className="hover:bg-gray-50 transition cursor-pointer border-b border-gray-200"
                      onClick={() => {
                        const rowId = `${row[3]}-${row[8]}-${row[11]}`;
                        setSelectedRow(selectedRow === rowId ? null : rowId);
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {selectedProgram && selectedAllotment ? "" : row[3]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {selectedProgram && selectedAllotment ? "" : row[1]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {selectedProgram && selectedAllotment ? "" : row[8]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row[12]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row[11]}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row[13]}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600 hover:underline">
                        {totalObligation
                          ? totalObligation.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-red-600 hover:underline">
                        {unobligated
                          ? unobligated.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row[18]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row[17]}
                      </td>
                    </tr>
                    {selectedRow === `${row[3]}-${row[8]}-${row[11]}` && matchingRaods.length > 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-3">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-300 shadow-sm">
                            <h4 className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wide">📋 Obligations Breakdown</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="bg-blue-200">
                                    <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Name</th>
                                    <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Date</th>
                                    <th className="px-2 py-1.5 text-left font-semibold text-blue-900">OBRs</th>
                                    <th className="px-2 py-1.5 text-right font-semibold text-blue-900">Credit</th>
                                    <th className="px-2 py-1.5 text-right font-semibold text-blue-900">Balance</th>
                                    <th className="px-2 py-1.5 text-left font-semibold text-blue-900">Particulars</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-200">
                                  {/* Initial Amount Row */}
                                  <tr className="bg-blue-100">
                                    <td colSpan={3} className="px-2 py-1 font-semibold text-blue-900">Initial Amount</td>
                                    <td className="px-2 py-1 text-right font-semibold text-blue-900"></td>
                                    <td className="px-2 py-1 text-right font-semibold text-blue-900">{row[13]}</td>
                                    <td></td>
                                  </tr>
                                  {/* Credit Entries */}
                                  {matchingRaods.map((raodRow, index) => {
                                    const initialAmount = parseAmount(row[13]);
                                    const credit = parseAmount(raodRow[14]);
                                    const previousCredits = matchingRaods
                                      .slice(0, index)
                                      .reduce((sum, r) => sum + parseAmount(r[14]), 0);
                                    const balance = initialAmount - previousCredits - credit;

                                    return (
                                      <tr key={index} className="hover:bg-blue-50 transition text-gray-700">
                                        <td className="px-2 py-1 text-xs truncate">{raodRow[12]}</td>
                                        <td className="px-2 py-1 text-xs">{raodRow[7]}</td>
                                        <td className="px-2 py-1 text-xs truncate">{`${raodRow[9]}-${raodRow[10]}`}</td>
                                        <td className="px-2 py-1 text-right font-medium text-green-600">
                                          {credit.toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="px-2 py-1 text-right font-medium text-indigo-600">
                                          {balance.toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="px-2 py-1 text-xs truncate hover:truncate-none hover:whitespace-normal hover:break-words max-w-xs hover:max-w-none hover:bg-white hover:p-2 hover:rounded hover:border hover:border-gray-300 hover:z-20 relative">
                                          {raodRow[13]}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-blue-200">
                                  <tr>
                                    <td colSpan={3} className="px-2 py-1 font-bold text-blue-900">TOTAL</td>
                                    <td className="px-2 py-1 text-right font-bold"></td>
                                    <td className="px-2 py-1 text-right font-bold text-indigo-700">
                                      {(
                                        parseAmount(row[13]) -
                                        matchingRaods.reduce((sum, raodRow) => sum + parseAmount(raodRow[14]), 0)
                                      ).toLocaleString("en-US", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
                <tfoot className="bg-gradient-to-r from-blue-50 to-blue-100 sticky bottom-0 border-t-2 border-blue-300">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {totals.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">
                      {totals.obligation.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-700">
                      {totals.unobligated.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td colSpan={2}></td>
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
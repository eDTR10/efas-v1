import axios from "./../../../plugin/axios2";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { useSearchParams }  from "react-router-dom"; // Add this import


// Move parseAmount function before component definition
const parseAmount = (value: string) => {
  if (!value) return 0;
  // Remove spaces and handle parentheses
  const cleanValue = value.trim().replace(/[()]/g, "");
  // Convert to negative if was in parentheses
  const multiplier = value.includes("(") ? -1 : 1;
  // Remove commas and convert to number
  return Number(cleanValue.replace(/,/g, "")) * multiplier;
};

function Records() {


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
    axios
      .get("11pC_pyDKZa797p_HUwt_PCfb7PLJUAtMDsfZ0MPepB4/values/MDS Regular R10", {
        headers: {
          Authorization:
            "Token 5f4a6fef4cb29b33296c4c9909cc8db05b86043141ba158a40dfbdc4d5a11a9a",
        },
      })
      .then((response) => {
        setData(response.data.values);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function getDataRAOD() {
    axios
      .get("1U4P9Up-0xNUlSsIX2DiIAIUZjnliHK8nAKMhQB7wXik/values/2025", {
        headers: {
          Authorization:
            "Token 5f4a6fef4cb29b33296c4c9909cc8db05b86043141ba158a40dfbdc4d5a11a9a",
        },
      })
      .then((response) => {
        setRaod(response.data.values);
      })
      .catch((error) => {
        console.log(error);
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
      return row[8] === selectedProgram;
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
            raodRow[1] === row[7] &&
            raodRow[3] === row[3] &&
            raodRow[6] === row[11]
        );
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
    <div className="h-full  w-[100%] mt-[10vh]">

      {/* <div className=" flex gap-5">
        <Button variant="outline">2024</Button>
        <Button variant="outline">2025</Button>

      </div> */}
      <div className="w-[100%] px-[2vw] flex items-center gap-5">
        <div className="mb-4  w-full">
          <label
            htmlFor="program"
            className="block text-sm font-medium text-gray-700"
          >
            Select Program
          </label>
          <Select
            id="program"
            name="program"
            options={programOptions}
            value={programOptions.find(
              (option) => option.value === selectedProgram
            )}
            onChange={handleProgramChange}
            isClearable
            placeholder="Search Program"
            className="mt-1"
          />
        </div>
        <div className="mb-4 w-full">
          <label
            htmlFor="allotment"
            className="block text-sm font-medium text-gray-700"
          >
            Select Allotment
          </label>
          <Select
            id="allotment"
            name="allotment"
            options={allotmentOptions}
            value={allotmentOptions.find(
              (option) => option.value === selectedAllotment
            )}
            onChange={handleAllotmentChange}
            isClearable
            placeholder="Search Allotment"
            className="mt-1"
          />
        </div>
      </div>

      <div className="relative overflow-auto h-[70vh]">
        {filteredData.length <= 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">
              No records found! Kindly select a Program and Allotment if it is empty.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-[#e3ffe5] sticky top-0 border border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                  ALLOTMENT NO.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PROGRAM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">
                  DESCRIPTION
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OBJ. CODE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AMOUNT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TOTAL OBLIGATION
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TOTAL UNOBLIGATED
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NTCA NUMBER
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DATE RECEIVED
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              
            {/* {console.log(filteredData[1])} */}
              {selectedProgram && selectedAllotment && filteredData[1] && (

                
                <tr>
                 
                  

                  
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {(filteredData[1][3])}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][1]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][8]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][14]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][7]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][6]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {filteredData[1][6]}
                  </td>
                </tr>
              )}
              {filteredData.slice(1).map((row: any, rowIndex) => {
                console.log("data here");
             
                console.log(row);
                const matchingRaods: any[] = raod
                  .slice(1)
                  .filter(
                    (raodRow) =>
                      raodRow[1] === row[7] && // PAP CODE matches PAP
                      raodRow[3] === row[3] && // SARO NO matches ALLOTMENT NO.
                      raodRow[6] === row[11]   // OBJECT CODE matches Object Code no.
                  );

                console.log(`${row[8]} - ${row[3]} - ${row[11]}`);

                const totalObligation = matchingRaods.reduce((sum, raodRow) => {
                  const value = raodRow[14] ? parseAmount(raodRow[14]) : 0;
                  return sum + value;
                }, 0);

                const cleanNumber = (value: string) =>
                  Number(value.replace(/,/g, "").trim());
                const amount = row[13] ? cleanNumber(row[13]) : 0;
                const unobligated = amount - totalObligation;

                return (
                  <React.Fragment key={rowIndex}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setSelectedRow(selectedRow === rowIndex ? null : rowIndex)
                      }
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {selectedProgram && selectedAllotment ? "" : row[3]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {selectedProgram && selectedAllotment ? "" : row[1]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {selectedProgram && selectedAllotment ? "" : row[8]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row[12]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row[11]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row[13]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-gsemibold hover:underline">
                        {totalObligation
                          ? totalObligation.toLocaleString("en-US", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })
                          : ""}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-gsemibold  hover:underline">
                        {unobligated
                          ? unobligated.toLocaleString("en-US", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })
                          : ""}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row[18]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row[17]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                       
                      </td>
                    </tr>
                    {selectedRow === rowIndex && matchingRaods.length > 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-sm font-bold mb-2">
                              Breakdown of Obligations
                            </h4>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                    Details
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                    Date
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                    Payee
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                    OBRs No.
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                    Debit/Amount
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                    Credit
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                    Balance
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Initial Amount Row */}
                                <tr className="hover:bg-gray-50">
                                  <td
                                    colSpan={4}
                                    className="px-4 py-2 text-sm text-gray-500"
                                  >
                                    Initial Amount
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500 text-right">
                                    {row[13]}
                                  </td>
                                  <td></td>
                                  <td className="px-4 py-2 text-sm text-gray-500 text-right">
                                    {row[13]}
                                  </td>
                                </tr>
                                {/* Credit Entries */}
                                {matchingRaods
  .filter(raodRow => {
    // Skip rows with undefined or incomplete OBR numbers
    if (!raodRow[9] || !raodRow[10] || !raodRow[11] || 
        raodRow[11] === 'undefined' || 
        `${raodRow[9]}-${raodRow[10]}-${raodRow[11]}`.includes('undefined')) {
      return false;
    }
    return true;
  })
  .map((raodRow, index) => {
    const initialAmount = parseAmount(row[13]);
    const credit = parseAmount(raodRow[14]);
    const previousCredits = matchingRaods
      .slice(0, index)
      .filter(r => r[11] && r[11] !== 'undefined') // Only consider valid entries
      .reduce(
        (sum, r) => sum + parseAmount(r[14]),
        0
      );
    const balance = initialAmount - previousCredits - credit;

    return (
      <tr key={index} className="hover:bg-gray-50">
        <td className="px-4 py-2 text-sm text-gray-500">
          {raodRow[12]}
        </td>
        <td className="px-4 py-2 text-sm text-gray-500">
          {raodRow[7]}
        </td>
        <td className="px-4 py-2 text-sm text-gray-500">
          {raodRow[1]}
        </td>
        <td className="px-4 py-2 text-sm text-gray-500">
          {`${raodRow[9]}-${raodRow[10]}-${raodRow[11]}`}
        </td>
        <td className="px-4 py-2 text-sm text-gray-500 text-right"></td>
        <td className="px-4 py-2 text-sm text-gray-500 text-right">
          {credit.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
        <td className="px-4 py-2 text-sm text-gray-500 text-right">
          {balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
      </tr>
    );
  })}
                              </tbody>
                              <tfoot className="bg-gray-100">
                                <tr>
                                  <td colSpan={4} className="px-4 py-2 font-bold">
                                    Total
                                  </td>
                                  <td className="px-4 py-2 text-right font-bold"></td>
                                  <td className="px-4 py-2 text-right font-bold">
                                    {matchingRaods
                                      .reduce(
                                        (sum, raodRow) =>
                                          sum + parseAmount(raodRow[14]),
                                        0
                                      )
                                      .toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                  </td>
                                  <td className="px-4 py-2 text-right font-bold">
                                    {(
                                      parseAmount(row[13]) -
                                      matchingRaods.reduce(
                                        (sum, raodRow) =>
                                          sum + parseAmount(raodRow[14]),
                                        0
                                      )
                                    ).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-[#e3ffe5] sticky bottom-0 border border-border">
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-3 text-sm font-bold text-gray-700"
                >
                  TOTAL
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-700">
                  {totals.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-700">
                  {totals.obligation.toLocaleString("en-US", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-700">
                  {totals.unobligated.toLocaleString("en-US", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

export default Records;
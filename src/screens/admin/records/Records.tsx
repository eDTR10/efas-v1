import axios from './../../../plugin/axios2';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

function Records() {
    const [data, setData] = useState([
        ["ALLOTMENT NO.", "Date", "PROGRAM", "DESCRIPTION", "OBJ. CODE", "AMOUNT", "TOTAL OBLIGATION", "TOTAL UNOBLIGATED", "NTCA NUMBER", "DATE RECEIVED", "TOTAL"],
        ["2024-01-0002", "01/19/2024", "PS", "Traveling Expenses - Local", "5020101000", 479300.00, 293442.07, 185857.93, "NTCA-12346", "01/20/2024", 838655.24]
    ]);

    const [raod, setRaod] = useState([
        ["ALLOTMENT NO.", "Date", "PROGRAM", "DESCRIPTION", "OBJ. CODE", "AMOUNT", "TOTAL OBLIGATION", "TOTAL UNOBLIGATED", "NTCA NUMBER", "DATE RECEIVED", "TOTAL"],
        ["2024-01-0002", "01/19/2024", "PS", "Traveling Expenses - Local", "5020101000", 479300.00, 293442.07, 185857.93, "NTCA-12346", "01/20/2024", 838655.24]
    ]);

    const [selectedAllotment, setSelectedAllotment] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedRow, setSelectedRow] = useState<any>(null);

    function getData() {
        axios.get('1-iMx8U7brob8Gs-HuPhEkF8pIyu1aPOGLSmhwFa9oog/values/MDS REG R10', {
            headers: {
                Authorization: 'Token 5f4a6fef4cb29b33296c4c9909cc8db05b86043141ba158a40dfbdc4d5a11a9a',
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
        axios.get('1bZCLinN4S-F-jU6jsA90uxxXRCT5uUjcI9s6Mt5_QeI/values/year2024', {
            headers: {
                Authorization: 'Token 5f4a6fef4cb29b33296c4c9909cc8db05b86043141ba158a40dfbdc4d5a11a9a',
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

    const allotment = [...new Set(data.slice(1).map(row => row[3]))];
    const programs = [...new Set(data.slice(1).map(row => row[7]))];

    const programOptions = programs.map(program => ({ value: program, label: program }));
    const allotmentOptions = allotment.map(allotment => ({ value: allotment, label: allotment }));

    const filteredData = selectedProgram
        ? data.filter((row, index) => index === 0 || (row[3] === selectedAllotment && row[7] === selectedProgram))
        : data;

    return (
        <div className="h-full w-[100%] mt-[10vh]">
            <div className='w-[100%] flex gap-5'>
                <div className="mb-4 w-full">
                    <label htmlFor="program" className="block text-sm font-medium text-gray-700">
                        Select Program
                    </label>
                    <Select
                        id="program"
                        name="program"
                        options={programOptions}
                        value={programOptions.find(option => option.value === selectedProgram)}
                        onChange={(selectedOption:any) => setSelectedProgram(selectedOption ? selectedOption.value : '')}
                        isClearable
                        placeholder="Search Program"
                        className="mt-1"
                    />
                </div>
                <div className="mb-4 w-full">
                    <label htmlFor="allotment" className="block text-sm font-medium text-gray-700">
                        Select Allotment
                    </label>
                    <Select
                        id="allotment"
                        name="allotment"
                        options={allotmentOptions}
                        value={allotmentOptions.find(option => option.value === selectedAllotment)}
                        onChange={(selectedOption:any) => setSelectedAllotment(selectedOption ? selectedOption.value : '')}
                        isClearable
                        placeholder="Search Allotment"
                        className="mt-1"
                    />
                </div>
            </div>
            
            <div className="relative overflow-auto h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-[#e3ffe5] sticky top-0 border border-border">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">ALLOTMENT NO.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROGRAM</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[300px]">DESCRIPTION</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OBJ. CODE</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AMOUNT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL OBLIGATION</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL UNOBLIGATED</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NTCA NUMBER</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATE RECEIVED</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {selectedProgram && selectedAllotment && filteredData[1] && (
                            <tr>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][3]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][1]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][7]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][13]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][6]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][5]}</td>
                                <td className="px-6 py-4 text-sm text-gray-500"></td>
                                <td className="px-6 py-4 text-sm text-gray-500"></td>
                                <td className="px-6 py-4 text-sm text-gray-500"></td>
                                <td className="px-6 py-4 text-sm text-gray-500"></td>
                                <td className="px-6 py-4 text-sm text-gray-500">{filteredData[1][5]}</td>
                            </tr>
                        )}
                        {filteredData.slice(1).map((row:any, rowIndex) => {
                            const matchingRaods:any[] = raod.slice(1).filter(raodRow => 
                                raodRow[0] === row[7] && 
                                raodRow[3] === row[3] && 
                                raodRow[5] === row[11] && 
                                raodRow.length > 11
                            );

                            console.log(matchingRaods,` ---${row[11]}`)

                            const totalObligation = matchingRaods.reduce((sum, raodRow) => {
                                const value = raodRow[14] ? Number(raodRow[14].replace(/,/g, '').trim()) : 0;
                                return sum + value;
                            }, 0);

                            const cleanNumber = (value: string) => Number(value.replace(/,/g, '').trim());
                            const amount = row[12] ? cleanNumber(row[12]) : 0;
                            const unobligated = amount - totalObligation;

                            return (
                                <React.Fragment key={rowIndex}>
                                    <tr 
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => setSelectedRow(selectedRow === rowIndex ? null : rowIndex)}
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {selectedProgram && selectedAllotment ? "" : row[3]}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {selectedProgram && selectedAllotment ? "" : row[1]}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {selectedProgram && selectedAllotment ? "" : row[7]}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{row[11]}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{row[10]}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{row[12]}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-gsemibold hover:underline">
                                            {totalObligation ? totalObligation.toLocaleString('en-US', {
                                                minimumFractionDigits: 3,
                                                maximumFractionDigits: 3
                                            }) : ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-gsemibold  hover:underline">
                                            {unobligated ? unobligated.toLocaleString('en-US', {
                                                minimumFractionDigits: 3,
                                                maximumFractionDigits: 3
                                            }) : ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500"></td>
                                        <td className="px-6 py-4 text-sm text-gray-500"></td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{}</td>
                                    </tr>
                                    {selectedRow === rowIndex && matchingRaods.length > 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-4">
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-bold mb-2">Breakdown of Obligations</h4>
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">DV Number</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Payee</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">OBRs No. /Serial Number</th>
                                                                
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Net Amount</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {matchingRaods.map((raodRow, index) => (
                                                                <tr key={index} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{raodRow[12]}</td>
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{raodRow[7]}</td>
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{raodRow[1]}</td>
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{`${raodRow[9]}-${raodRow[10]}-${raodRow[11]}`}</td>
                                                                    
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{raodRow[13]}</td>
                                                                    <td className="px-4 py-2 text-sm text-gray-500">{raodRow[17]}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Records;
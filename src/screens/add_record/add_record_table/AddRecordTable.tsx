import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import axios from '../../../plugin/axios';
import Swal from 'sweetalert2';
import UpdateRecordDialog from '../dialogs/UpdateRecordDialog';
import ViewRecordDialog from '../dialogs/ViewRecordDialog';
import { RefreshCcw } from 'lucide-react';
import FormattedMoney from '@/components/formater/Money';

const AddRecordTable = () => {
    const [records, setRecords] = useState([]);
    const [toUpdateRecords, setToUpdateRecords] = useState([]);
    const [regionFilter, setRegionFilter] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [fundTypeFilter, setFundTypeFilter] = useState('');
    const [amountFilter, setAmountFilter] = useState('');
    const [dateReceivedFilter, setDateReceivedFilter] = useState('');
    const [dateOfSAROFilter, setDateOfSAROFilter] = useState('');
    const [allotmentNoFilter, setAllotmentNoFilter] = useState('');
    const [notesValidityFilter, setNotesValidityFilter] = useState('');
    const [papFilter, setPapFilter] = useState('');
    const [descriptionFilter, setDescriptionFilter] = useState('');
    const [classTypeFilter, setClassTypeFilter] = useState('');
    const [objectCodeNoFilter, setObjectCodeNoFilter] = useState('');
    const [objectCodeDescFilter, setObjectCodeDescFilter] = useState('');
    const [purposeFilter, setPurposeFilter] = useState('');

    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    const getRecords = async () => {
        try {
            const response = await axios.get('saro/all/');
            setRecords(response.data);
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    useEffect(() => {
        getRecords();
    }, []);

    const handleRefresh = () => {
        setIsSpinning(true);
        getRecords().finally(() => setIsSpinning(false));
    };

    const filteredAllocations = records.filter((allocation: any) =>
        (regionFilter === '' || allocation.region === regionFilter) &&
        (programFilter === '' || allocation.program === programFilter) &&
        (fundTypeFilter === '' || allocation.fund_type === fundTypeFilter) &&
        (amountFilter === '' || allocation.amount === amountFilter) &&
        (dateReceivedFilter === '' || allocation.date_received_in_email === dateReceivedFilter) &&
        (dateOfSAROFilter === '' || allocation.date_of_saro === dateOfSAROFilter) &&
        (allotmentNoFilter === '' || allocation.allotment_no === allotmentNoFilter) &&
        (notesValidityFilter === '' || allocation.notes_validity === notesValidityFilter) &&
        (papFilter === '' || allocation.pap === papFilter) &&
        (descriptionFilter === '' || allocation.description === descriptionFilter) &&
        (classTypeFilter === '' || allocation.class_type === parseInt(classTypeFilter)) &&
        (objectCodeNoFilter === '' || allocation.object_code_no === objectCodeNoFilter) &&
        (objectCodeDescFilter === '' || allocation.object_code_desc === objectCodeDescFilter) &&
        (purposeFilter === '' || allocation.purpose === purposeFilter)
    );

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAllocations.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredAllocations.length / recordsPerPage);

    const uniqueValues = (key: any) => [...new Set(records.map((allocation: any) => allocation[key]))];

    const handleView = (record: any) => {
        setIsViewDialogOpen(true);
        setToUpdateRecords(record);
    };

    const handleEdit = (record: any) => {
        setIsUpdateDialogOpen(true);
        setToUpdateRecords(record);
    };

    const handleDelete = (id: any) => {
        axios.delete(`saro/${id}/`, {
            headers: {
                Authorization: `Token 6e5ee24e6c25fe08834ab33646721e880887efe4`,
            },
        }).then((_e: any) => {
            Swal.fire({
                icon: "success",
                title: "Deleted Successfully...",
                showConfirmButton: false,
                timer: 2000
            });
            getRecords();
        }).catch((error: any) => {
            console.error("Error updating department:", error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong while Deleting the data!',
            });
        });
    };

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (

        <div className="relative h-[95%] rounded-lg">
            <button
                className={`text-md text-primary flex mb-8}`}
                onClick={handleRefresh}
            >
                <RefreshCcw className={`${isSpinning ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <div className="overflow-x-auto border border-primary mt-4">

                <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {/* <TableHead className="w-[50px]">No.</TableHead> */}
                            <TableHead className="w-[150px]">Actions</TableHead>
                            <TableHead className="w-[150px]">
                                Region
                                <select
                                    value={regionFilter}
                                    onChange={(e) => setRegionFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('region').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Program
                                <select
                                    value={programFilter}
                                    onChange={(e) => setProgramFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('program').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Fund Type
                                <select
                                    value={fundTypeFilter}
                                    onChange={(e) => setFundTypeFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('fund_type').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Date Received
                                <select
                                    value={dateReceivedFilter}
                                    onChange={(e) => setDateReceivedFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('date_received_in_email').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Date of SARO
                                <select
                                    value={dateOfSAROFilter}
                                    onChange={(e) => setDateOfSAROFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('date_of_saro').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Allotment No
                                <select
                                    value={allotmentNoFilter}
                                    onChange={(e) => setAllotmentNoFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('allotment_no').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Notes Validity
                                <select
                                    value={notesValidityFilter}
                                    onChange={(e) => setNotesValidityFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('notes_validity').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                PAP
                                <select
                                    value={papFilter}
                                    onChange={(e) => setPapFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('pap').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Description
                                <select
                                    value={descriptionFilter}
                                    onChange={(e) => setDescriptionFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('description').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Class Type
                                <select
                                    value={classTypeFilter}
                                    onChange={(e) => setClassTypeFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('class_type').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Object Code No
                                <select
                                    value={objectCodeNoFilter}
                                    onChange={(e) => setObjectCodeNoFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('object_code_no').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Object Code Desc
                                <select
                                    value={objectCodeDescFilter}
                                    onChange={(e) => setObjectCodeDescFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('object_code_desc').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px] text-right">
                                Amount
                                <select
                                    value={amountFilter}
                                    onChange={(e) => setAmountFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('amount').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Purpose
                                <select
                                    value={purposeFilter}
                                    onChange={(e) => setPurposeFilter(e.target.value)}
                                    className="ml-2 p-1 border rounded"
                                >
                                    <option value=''>All</option>
                                    {uniqueValues('purpose').map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody >
                        {currentRecords.map((allocation: any, index: any) => (
                            <TableRow key={allocation.saroID} className="text-primary">
                                {/* <TableCell>{index + 1}</TableCell> */}
                                <TableCell className="flex gap-2">
                                    <button
                                        onClick={() => handleView(allocation)}
                                        className="bg-blue-500 text-white px-2 py-1 rounded"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleEdit(allocation)}
                                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(allocation?.saroID)}
                                        className="bg-red-500 text-white px-2 py-1 rounded"
                                    >
                                        Delete
                                    </button>
                                </TableCell>
                                <TableCell className="font-medium">{allocation.region}</TableCell>
                                <TableCell>{allocation.program}</TableCell>
                                <TableCell>{allocation.fund_type}</TableCell>
                                <TableCell>{allocation.date_received_in_email}</TableCell>
                                <TableCell>{allocation.date_of_saro}</TableCell>
                                <TableCell>{allocation.allotment_no}</TableCell>
                                <TableCell>{allocation.notes_validity}</TableCell>
                                <TableCell>{allocation.pap}</TableCell>
                                <TableCell>{allocation.description}</TableCell>
                                <TableCell>{allocation.class_type}</TableCell>
                                <TableCell>{allocation.object_code_no}</TableCell>
                                <TableCell>{allocation.object_code_desc}</TableCell>
                                <TableCell className="text-right">
                                    <FormattedMoney value={allocation?.amount}/>
                                </TableCell>
                                <TableCell>{allocation.purpose}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-between mt-4">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className='text-foreground'>Page {currentPage} of {totalPages}</span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <UpdateRecordDialog
                isOpen={isUpdateDialogOpen}
                onClose={() => setIsUpdateDialogOpen(false)}
                record={toUpdateRecords}
                getRecords={getRecords}
            />
            <ViewRecordDialog
                isOpen={isViewDialogOpen}
                onClose={() => setIsViewDialogOpen(false)}
                record={toUpdateRecords}
                getRecords={getRecords}
            />
        </div>
    );
}

export default AddRecordTable;
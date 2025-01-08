import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Input } from '@/components/ui/input';

const AddRecordDialog = ({ isOpen, onClose, onSave }: any) => {
    const [region, setRegion] = useState('');
    const [program, setProgram] = useState('');
    const [fundType, setFundType] = useState('');
    const [amount, setAmount] = useState('');
    const [dateReceivedInEmail, setDateReceivedInEmail] = useState('');
    const [dateOfSARO, setDateOfSARO] = useState('');
    const [allotmentNo, setAllotmentNo] = useState('');
    const [notesValidity, setNotesValidity] = useState('');
    const [pap, setPap] = useState('');
    const [description, setDescription] = useState('');
    const [classType, setClassType] = useState('');
    const [objectCodeNo, setObjectCodeNo] = useState('');
    const [objectCodeDesc, setObjectCodeDesc] = useState('');
    const [purpose, setPurpose] = useState('');

    const [classTypes, setClassTypes] = useState([]);

    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleSave = async () => {
        const newRecord = {
            region: region,
            program: program,
            fund_type: fundType,
            amount: amount,
            date_received_in_email: dateReceivedInEmail,
            date_of_saro: dateOfSARO,
            allotment_no: allotmentNo,
            notes_validity: notesValidity,
            pap: pap,
            description: description,
            class_type: classType,
            object_code_no: objectCodeNo,
            object_code_desc: objectCodeDesc,
            purpose: purpose,
        };

        try {
            const response = await axios.post('/saro/all/', newRecord, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem("accessToken")}`,
                }
            });

            Swal.fire({
                icon: "success",
                title: "Added Successfully...",
                showConfirmButton: false,
                timer: 2000
            });

            onSave(newRecord);
            onClose();
        } catch (error: any) {
            console.error('Error fetching data:', error.response ? error.response.data : error.message);
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.response?.data?.non_field_errors?.[0] || error.message,
                showConfirmButton: false,
            });
        }
    };

    const getClassType = async () => {
        try {
            const response = await axios.get('class/all/');
            setClassTypes(response.data);
            console.log(response.data);
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    useEffect(() => {
        getClassType();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
            <div ref={dialogRef} className="bg-card text-accent-foreground p-6 rounded-md w-full max-w-4xl h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Add Record</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-gmedium">Region</label>
                        <Input
                            type="text"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Program</label>
                        <Input
                            type="text"
                            value={program}
                            onChange={(e) => setProgram(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Fund Type</label>
                        <Input
                            type="text"
                            value={fundType}
                            onChange={(e) => setFundType(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Amount</label>
                        <Input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Date Received</label>
                        <Input
                            type="date"
                            value={dateReceivedInEmail}
                            onChange={(e) => setDateReceivedInEmail(e.target.value)}
                            className="mt-1 p-2 border text-accent-foreground z rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Date of SARO</label>
                        <Input
                            type="date"
                            value={dateOfSARO}
                            onChange={(e) => setDateOfSARO(e.target.value)}
                            className="mt-1 p-2 border text-accent-foreground rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Allotment No</label>
                        <Input
                            type="text"
                            value={allotmentNo}
                            onChange={(e) => setAllotmentNo(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Notes Validity</label>
                        <Input
                            type="text"
                            value={notesValidity}
                            onChange={(e) => setNotesValidity(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">PAP</label>
                        <Input
                            type="text"
                            value={pap}
                            onChange={(e) => setPap(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Description</label>
                        <Input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Class Type</label>
                        <select
                            value={classType}
                            onChange={(e) => setClassType(e.target.value)}
                            className="mt-1 p-2 pr-10 flex h-10 w-full rounded-md border border-input bg-background  py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        >
                            <option value=''>Select Class Type</option>
                            {classTypes.map((type: any) => (
                                <option className=' text-accent-foreground' key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Object Code No</label>
                        <Input
                            type="text"
                            value={objectCodeNo}
                            onChange={(e) => setObjectCodeNo(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Object Code Desc</label>
                        <Input
                            type="text"
                            value={objectCodeDesc}
                            onChange={(e) => setObjectCodeDesc(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Purpose</label>
                        <Input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white px-4 py-2 rounded-md"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddRecordDialog;
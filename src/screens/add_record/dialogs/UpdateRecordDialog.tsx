import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Input } from '@/components/ui/input';

const UpdateRecordDialog = ({ isOpen, onClose, record, onSave, getRecords }: any) => {
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

    useEffect(() => {
        if (record) {
            setRegion(record.region);
            setProgram(record.program);
            setFundType(record.fund_type);
            setAmount(record.amount);
            setDateReceivedInEmail(record.date_received_in_email);
            setDateOfSARO(record.date_of_saro);
            setAllotmentNo(record.allotment_no);
            setNotesValidity(record.notes_validity);
            setPap(record.pap);
            setDescription(record.description);
            setClassType(record.class_type);
            setObjectCodeNo(record.object_code_no);
            setObjectCodeDesc(record.object_code_desc);
            setPurpose(record.purpose);
        }
    }, [record]);

    const handleUpdate = async () => {
        const updatedRecord = {
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
            await axios.put(`/saro/${record.saroID}/`, updatedRecord, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem("accessToken")}`,
                }
            });

            Swal.fire({
                icon: "success",
                title: "Updated Successfully...",
                showConfirmButton: false,
                timer: 2000
            });

            // onSave(updatedRecord);
            getRecords();
            onClose();
        } catch (error: any) {
            console.error('Error updating record:', error.response ? error.response.data : error.message);
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.response?.data?.non_field_errors?.[0] || error.message,
                showConfirmButton: false,
            });
        }
    };

    if (!isOpen) return null;



    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
            <div ref={dialogRef} className="bg-card text-accent-foreground p-6 rounded-md w-full max-w-4xl h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Edit Record</h2>
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
                            className="mt-1 p-2 border rounded w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-gmedium">Date of SARO</label>
                        <Input
                            type="date"
                            value={dateOfSARO}
                            onChange={(e) => setDateOfSARO(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
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
                        <Input
                            type="text"
                            value={classType}
                            onChange={(e) => setClassType(e.target.value)}
                            className="mt-1 p-2 border rounded w-full"
                        />
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
                        onClick={handleUpdate}
                        className="bg-primary text-white px-4 py-2 rounded-md"
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateRecordDialog;
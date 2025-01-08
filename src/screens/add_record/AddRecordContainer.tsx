import React, { useState } from 'react';
import { ArrowBigLeft, Receipt } from "lucide-react";
import AddRecordTable from "./add_record_table/AddRecordTable";
import AddRecordDialog from './dialogs/AddRecordDialog';
import UpdateRecordDialog from './dialogs/UpdateRecordDialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';


const AddRecordContainer = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);

    const handleSave = (newRecord: any) => {
        // setRecords([...records, newRecord]);
    };

    return (
        <div className="w-[95%] mt-[120px]">

            <div className="flex justify-between">
                <p className="text-primary font-gsemibold text-lg mb-4 flex justify-center items-center">
                    <Button className=" flex gap-2 md:ml-2 z-20 self-start mr-2" onClick={() => {
                        navigate("/admin/menu");
                    }}>
                        <ArrowBigLeft /> Go Back
                    </Button></p>
                <button
                    className="bg-primary text-white px-4 py-2 rounded-md mb-4 flex gap-x-2"
                    onClick={() => setIsDialogOpen(true)}
                >
                    Add Record <Receipt />
                </button>
            </div>
            <AddRecordTable />
            <br />
            <AddRecordDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSave}
            />


        </div>
    );
};

export default AddRecordContainer;
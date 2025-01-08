import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import axios from '../../../../plugin/axios';
import { useState } from "react";
import Swal from "sweetalert2";

function addObject({objectType}:any) {
    const [objectCodes, setObjectCodes] = useState<any>(''); 
    const [objectNames, setObjects] = useState<any>(''); 
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const objectSave = async () => { 
        const newObject = { 
            object_code: objectCodes,
            name: objectNames }; 
        
        try { 
            const response = await axios.post('object/all/', newObject); 
            console.log('Fund saved successfully:', response.data);

          
            setObjectCodes('') 
            setObjects(''); 

            Swal.fire({ 
                icon: "success", 
                title: "Fund saved successfully ...", 
                showConfirmButton: false, timer: 2000 
            });

            setIsDialogOpen(false);
            setObjectCodes('') 
            setObjects(''); 
            objectType();
               
            } catch (error) { 
                console.error('Error saving Fund:', error); 
            } 
        };
  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger> 
        <Button onClick={() => setIsDialogOpen(true)}>Add Object</Button> 
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Add Object</DialogTitle>
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            objectSave()
                          }}> 
                          <div> 
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Object Code</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" 
                                    value={objectCodes}
                                    onChange={(e) => setObjectCodes(e.target.value)}
                                    /> 
                                </div> 
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Object Title</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" 
                                    value={objectNames}
                                    onChange={(e) => setObjects(e.target.value)}
                                    /> 
                                </div> 
                                <Button className="bg-primary w-full">Save</Button> 
                            </div>
                            </form>

                             
                          </DialogDescription>
                        
                       
                    </DialogHeader>
            </DialogContent>
     </Dialog></>
  )
}

export default addObject
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import axios from '../../../../plugin/axios';
import { useState } from "react";
import Swal from "sweetalert2";

function addClaimant({classType}:any) {
    const [claimantName, setclaimantName] = useState<any>('')
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const addClaimantSave = async () => { 
        const newClaimant = { 
            name: claimantName
        }; 
        
        try { 
            const response = await axios.post('claimant/all/', newClaimant); 
            console.log('Claimant Added successfully:', response.data);

           
            setclaimantName('');

            Swal.fire({ 
                icon: "success", 
                title: "Claimant Added successfully ...", 
                showConfirmButton: false, timer: 2000 
            });

         
            setIsDialogOpen(false);
            classType();
            setclaimantName('');
               
            } catch (error) { 
                console.error('Error saving Fund:', error); 
            } 
        };
    
  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger > 
        <Button onClick={() => setIsDialogOpen(true)}>Add Claimant</Button> 
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Add Claimant</DialogTitle>
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            addClaimantSave()
                          }}> 
                          <div> 
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Name</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" 
                                    value={claimantName} onChange={(e:any)=>setclaimantName(e.target.value)}
                                   
                                    
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

export default addClaimant
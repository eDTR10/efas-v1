import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import axios from '../../../../plugin/axios';
import { useState } from "react";
import Swal from "sweetalert2";

function addPaPCode({papCodeList}:any) {
    const [papCode, setPapCode] = useState<any>(''); 
    const [description, setDescription] = useState<any>(''); 
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const addPaPCodeSave = async () => { 
        const newCode = { 
          pap_code: papCode, 
          description: description 
        };
    
        try { const response = await axios.post('pap/all/', newCode); 
          console.log('Team saved successfully:', response.data); 
    
          setPapCode('');
          setDescription('');
        
          Swal.fire({
            icon: "success",
            title: "Pap code Added successfully ...",
            showConfirmButton: false,
            timer: 2000
        });
         
        setIsDialogOpen(false); 
        setPapCode('');
        setDescription('');
        papCodeList();
         
        } catch (error) { 
          console.error('Error saving team:', error); } };

          
  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger> 
        <Button onClick={() => setIsDialogOpen(true)}>Add Pap Code</Button> 
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Add Pap Codes</DialogTitle>
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            addPaPCodeSave();
                          }}> 
                          <div> 
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Pap code</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" 
                                    value={papCode} onChange={(e) => {
                                        setPapCode(e.target.value)
                                        console.log(e)}
                                     }  /> 
                                </div>
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Description</label> 
                                    <Textarea value={description} onChange={(e) => {
                                        setDescription(e.target.value)
                                    console.log(e)
                                }
                                    } /> 
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

export default addPaPCode
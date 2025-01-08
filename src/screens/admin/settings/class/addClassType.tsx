import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react";
import Swal from "sweetalert2";
import axios from '../../../../plugin/axios';

function addClassType({classType}:any) {
    const [typeNumber, setTypeNumber] = useState<any>(0)
    const [title, setTitle] = useState<any>('')
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    const addClassTypeSave = async () => { 
        const newClass = { 
            type_number: typeNumber, 
            name: title
        }; 
        
        try { 
            const response = await axios.post('class/all/', newClass); 
            console.log('Class Type Added successfully:', response.data);

            setTypeNumber(0); 
            setTitle('');

            Swal.fire({ 
                icon: "success", 
                title: "Class Type Added successfully ...", 
                showConfirmButton: false, timer: 2000 
            });

         
            setIsDialogOpen(false);
            classType();
            setTypeNumber(0); 
            setTitle('');
               
            } catch (error) { 
                console.error('Error saving Fund:', error); 
            } 
        };

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger> 
        <Button onClick={() => setIsDialogOpen(true)}>Add Class Type</Button> 
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Add Class Type</DialogTitle>
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            addClassTypeSave()
                          }}> 
                          <div> 
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Class Type Number</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" value={typeNumber} 
                                    onChange={(e) => {
                                        setTypeNumber(e.target.value)
                                        console.log(e)
                                    } 
                                     
                                    } 
                                    /> 
                                </div>
                                <div className="mb-5"> 
                                    <label className="block text-sm font-medium text-start mt-5">Class Type Title</label> 
                                    <Input type="text" className="mt-1 p-2 border rounded w-full" value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value)
                                        console.log(e)
                                    }
                                        
                                    } 
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

export default addClassType
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { useState } from "react";
import axios from '../../../../plugin/axios';
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";

function UpdateTeamDialog({data,teamList}:any) {
  const [name, setName] = useState<any>(data.name); 
  const [teamCode, setTeamCode] = useState<any>(data.team_code); 
  const [totalBudget, setTotalBudget] = useState<number>(data.budget); 
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  


      function Update(id:any){


        Swal.fire({
            title: "Are you sure to update this?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes"
          }).then((result) => {
            


            if (result.isConfirmed) {
                axios.put(`team/${id}/`,{
                  name:name,
                  team_code:teamCode,
                  budget:totalBudget
                },{
                    headers: {
                        Authorization: `Token ${localStorage.getItem("accessToken")}`,
                      },
                }).then((e)=>{
                    console.log(e)
                    Swal.fire({
                        title: "Updated!",
                        text: "Your file has been Updated.",
                        showConfirmButton: false,
                        timer: 2000
                    });
                    setIsDialogOpen(false)
                    teamList()
                })
            }
          });
        
    }

  return (
    <>
     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger> 
      <Edit onClick={() => setIsDialogOpen(true)} className="w-5 h-5 text-primary cursor-pointer font-bold"/>
   
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Update Team</DialogTitle>
                    
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            Update(data.id)
                            
                          }}> 
                            <div className="mb-5"> 
                              <label className="block text-sm font-medium text-start mt-5">Team code</label> 
                              <Input type="text" 
                              value={teamCode} onChange={(e) => setTeamCode(e.target.value)} 
                              className="mt-1 p-2 border rounded w-full" /> 
                              </div> 
                              <div className="mb-5"> 
                                <label className="block text-sm font-medium text-start">Team name</label> 
                                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} 
                                className="mt-1 p-2 border rounded w-full" /> </div> 
                                <div className="mb-5"> 
                                  <label className="block text-sm font-medium text-start">Total budget</label> 
                                  <Input type="number" value={totalBudget} min={totalBudget} onChange={(e) => setTotalBudget(Number(e.target.value))} 
                                  className="mt-1 p-2 border rounded w-full" /> 
                                  </div> 
                                  <Button className="bg-primary w-full" >Save</Button> 
                                  </form>

                             
                          </DialogDescription>
                        
                       
                    </DialogHeader>
            </DialogContent>
        </Dialog>
    </>
  )
}

export default UpdateTeamDialog
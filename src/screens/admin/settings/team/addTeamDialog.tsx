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

function AddTeamDialog({teamList}:any) {
  const [name, setName] = useState<any>(''); 
  const [teamCode, setTeamCode] = useState<any>(''); 
  const [totalBudget, setTotalBudget] = useState<number>(0); 
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  
  const addTeamSave = async () => { 
    const newTeam = { 
      team_code: teamCode, 
      name: name, 
      budget: totalBudget, 
    };

    try { const response = await axios.post('team/all/', newTeam); 
      console.log('Team saved successfully:', response.data); 

      setName('');
      setTeamCode('');
      setTotalBudget(0); 
      Swal.fire({
        icon: "success",
        title: "Team saved successfully ...",
        showConfirmButton: false,
        timer: 2000
    });
     

      setIsDialogOpen(false); 
      teamList();
      setName('');
      setTeamCode('');
      setTotalBudget(0); 
    } catch (error) { 
      console.error('Error saving team:', error); } };


  return (
    <>
     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
      <DialogTrigger> 
        <Button onClick={() => setIsDialogOpen(true)}>Add Team</Button> 
        </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">Add Team</DialogTitle>
                    
                          <DialogDescription >
                          <form onSubmit={(e:any)=>{
                            e.preventDefault()
                            addTeamSave()
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

export default AddTeamDialog
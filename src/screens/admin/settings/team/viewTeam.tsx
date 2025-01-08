import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"

  import {
    Table,
    TableBody,
   
    TableCell,
    
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import {  Edit, Trash2Icon, } from "lucide-react";
import Swal from "sweetalert2";
import FormattedMoney from "@/components/formater/Money";
import { useEffect, useState } from "react";
import axios from '../../../../plugin/axios';
import UpdateTeamDialog from "./update";


function ViewTeam() {
    const [teamAll, setTeamAll] = useState<any>([])

    function teamList() {
        axios.get('team/all/', {
            headers: {
                Authorization: `Token ${localStorage.getItem("accessToken")}`,
              },
        }).then((team:any) => {
            setTeamAll(team.data);
            console.log(team);
        })
        
    }

    useEffect(() => {
        teamList()
        
    }, []);

    function Delete(id:any){

        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
          }).then((result) => {
            


            if (result.isConfirmed) {
                axios.delete(`team/${id}`,{
                    headers: {
                        Authorization: `Token ${localStorage.getItem("accessToken")}`,
                      },
                }).then((e)=>{
                    console.log(e)
                    Swal.fire({
                        title: "Deleted!",
                        text: "Your file has been deleted.",
                        showConfirmButton: false,
                        timer: 2000
                    });
                    teamList()
                })
            }
          });
        
    }

    
    
  return (
    <div className="">
        <Dialog >
                <DialogTrigger>
                    <Button onClick={teamList}>View Team</Button>
                </DialogTrigger>
                <DialogContent className="max-w-[500px] md:w-[95%] min-h-[10vh] rounded-sm ">
                    
                        <DialogTitle className=" text-2xl text-start font-gbold">List of Team</DialogTitle>
                            <div className="overflow-x-auto border border-primary mt-4">
                
                                    <Table  className="w-full"   >
                                        <TableHeader  className="sticky top-0  z-10 bg-primary">
                                            <TableRow>
                                                <TableHead className="text-md  w-[300px]   text-accent font-gbold">Team Code</TableHead>
                                                <TableHead className="text-md  w-[400px]    text-accent  font-gbold">Team Name</TableHead>
                                                <TableHead className="text-md   text-accent  font-gbold">Total Budget</TableHead>
                                                <TableHead className="text-md    text-accent  font-gbold">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody >
                            
                                            {teamAll && teamAll.length > 0 ? (
                                                teamAll.map((team: any, index: any) => (
                                                
                                                        <TableRow key={index} className="border border-border">
                                                            <TableCell>{team?.team_code}</TableCell>
                                                            <TableCell>{team?.name}</TableCell>
                                                            <TableCell> <FormattedMoney value={team?.budget}/></TableCell>
                                                            <TableCell>
                                                                <div className="flex  gap-3">
                                                                    <UpdateTeamDialog teamList={teamList} data={team}/>
                                                                    <Trash2Icon onClick={()=>{
                                                                        Delete(team.id)
                                                                    }} className="w-5 h-5 cursor-pointer text-red-700 font-bold"/>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3}>No Team Found</TableCell>
                                                </TableRow>
                                            )}
                                            
                                        </TableBody>
                                    </Table>
                            </div>
                        
                </DialogContent>
        </Dialog>
    </div>
  )
}

export default ViewTeam
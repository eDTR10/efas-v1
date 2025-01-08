import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
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
  import axios from '../../plugin/axios';
import { useEffect, useState } from "react";
  
  


function ViewTeam() {
    const [teamAll, setTeamAll] = useState<any>([])

    function teamList() {
        axios.get('team/all/', {
            headers: {
                Authorization: `Token 6e5ee24e6c25fe08834ab33646721e880887efe4`,
            },
        }).then((team:any) => {
            setTeamAll(team.data);
            console.log(team);
        })
        
    }

    useEffect(() => {
        teamList()
        
    }, []);
    
  return (
    <div >
    <Dialog>
            <DialogTrigger>
                <Button>View Team</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-start font-gbold">List of Team</DialogTitle>
                        <DialogDescription>
                            <div className="overflow-auto bg-primary-foreground h-56 ">
                                <Table className="">
                                    <TableHeader >
                                        <TableRow>
                                            <TableHead className="text-center sticky">Team Code</TableHead>
                                            <TableHead className="text-center sticky">Team Name</TableHead>
                                            <TableHead className="text-center sticky">Total Budget</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                       
                                        <TableRow >
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                      
                                    </TableBody>
                                </Table>
                            </div>
                       
                        </DialogDescription>
                    </DialogHeader>
            </DialogContent>
        </Dialog>
    </div>
  )
}

export default ViewTeam
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import axios from '../../../../plugin/axios';
import Swal from "sweetalert2"

function viewClassType() {
    const [classAll, setClassAll] = useState<any>([])

    function classType() {
        axios.get('class/all/', {
            headers: {
                Authorization: `Token ${localStorage.getItem("accessToken")}`,
              },
        }).then((number:any) => {
            setClassAll(number.data);
            console.log(number);
        })
    }

    useEffect(() => {
        classType();
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
                axios.delete(`class/${id}`,{
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
                    classType()
                })
            }
          });
        
    }
  return (
    <>
    <div className="">
    <Dialog >
            <DialogTrigger>
                <Button onClick={classType}>View Class Type Number</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] md:w-[95%] min-h-[10vh] rounded-sm ">
                
                    <DialogTitle className=" text-2xl text-start font-gbold">Class Type Number</DialogTitle>
                        <div className="overflow-x-auto border border-primary mt-4">
            
                                <Table  className="w-full"   >
                                    <TableHeader  className="sticky top-0  z-10 bg-primary">
                                        <TableRow>
                                            <TableHead className="text-md  w-[300px]   text-accent font-gbold">Number</TableHead>
                                            <TableHead className="text-md  w-[400px]    text-accent  font-gbold">Title</TableHead>
                                            <TableHead className="text-md  w-[400px]    text-accent  font-gbold">Action</TableHead>
                                          
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody >
                                        {classAll && classAll.length > 0 ? (
                                        classAll.map((number:any, index:any) => (
                                            <TableRow key={index} className="border border-border">
                                                <TableCell>{number?.type_number}</TableCell>
                                                <TableCell>{number?.name}</TableCell>
                                                    <TableCell>
                                                    <div className="flex  gap-3">
                                                                    <Edit className="w-5 h-5 text-primary cursor-pointer font-bold"/>
                                                                    <Trash2Icon onClick={()=>{
                                                                        Delete(number.id)
                                                                    }} className="w-5 h-5 cursor-pointer text-red-700 font-bold"/>
                                                                </div>
                                                    </TableCell>
                                            </TableRow>
                                           ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3}>No Class Type Found</TableCell>
                                            </TableRow>
                                        )} 
                                        
                                    </TableBody>
                                </Table>
                        </div>
                    
            </DialogContent>
        </Dialog>
    </div>
   
    </>
  )
}

export default viewClassType
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardIcon, PlusCircleIcon, SettingsIcon, ViewIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"


function CardMenu() {
    const navigate = useNavigate()

    return (
        <div className="flex items-center justify-center h-screen w-[95%] ">
            <div className=" grid grid-cols-4 md:grid-cols-2 justify-center gap-10 md:gap-5">
                {/* Add Saro */}
                <Card onClick={() => {
                    navigate('/admin/add-record')
                }} className=" bg-card border border-border flex flex-col items-center  cursor-pointer hover:scale-[1.04]  ease-out hover:bg-dark transition duration-300" >
                    <CardHeader>
                        <CardTitle className="flex justify-center">
                            <PlusCircleIcon className="text-primary w-14 h-14 "></PlusCircleIcon>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-primary text-center text-xl font-gsemibold">Add Saro</p>
                    </CardContent>
                </Card>

                {/* View Records */}
                <Card className=" bg-card border border-border flex flex-col items-center  cursor-pointer hover:scale-[1.04]  ease-out hover:bg-dark transition duration-300" onClick={() => {
                    navigate('/admin/records')

                }}>
                    <CardHeader>
                        <CardTitle className="flex justify-center">
                            <ViewIcon className="text-primary w-14 h-14 "></ViewIcon>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-primary text-center text-xl font-gsemibold">View Records</p>
                    </CardContent>
                </Card>

                {/* View Reports*/}
                <Card className=" bg-card border border-border flex flex-col items-center  cursor-pointer hover:scale-[1.04]  ease-out hover:bg-dark transition duration-300">
                    <CardHeader>
                        <CardTitle className="flex justify-center">
                            <ClipboardIcon className="text-primary w-14 h-14 "></ClipboardIcon>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-primary text-center text-xl font-gsemibold">View Reports</p>
                    </CardContent>
                </Card>

                {/* Settings*/}
                <Card className=" bg-card border border-border flex flex-col items-center  cursor-pointer hover:scale-[1.04]  ease-out hover:bg-dark transition duration-300" onClick={() => {
                    navigate('/admin/settings')

                }}>
                    <CardHeader>
                        <CardTitle className="flex justify-center">
                            <SettingsIcon className="text-primary w-14 h-14 "></SettingsIcon>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-primary text-center text-xl font-gsemibold">Settings</p>
                    </CardContent>
                </Card>
            </div>





        </div>
    )
}

export default CardMenu
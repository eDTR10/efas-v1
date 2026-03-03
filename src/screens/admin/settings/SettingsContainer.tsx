import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import AddTeamDialog from "./team/addTeamDialog";
import ViewTeam from "./team/viewTeam";
import { ArrowBigLeft } from "lucide-react";
import AddFundType from "./fund/addFundType";
import ViewFund from "./fund/viewFund";
import ViewPaPCode from "./pap/viewPaPCode";
import AddPapCode from "./pap/addPaPCode";
import ViewClassType from "./class/viewClassType";
import AddClassType from "./class/addClassType";
import AddObject from "./object/addObject";
import ViewObject from "./object/viewObject";
import ViewClaimant from "./claimant/viewClaimant";
import AddClaimant from "./claimant/addClaimant";

function SettingsContainer() {
    const navigate = useNavigate();

    return (
        <div className="relative w-full min-h-screen bg-neutral-950 flex items-center justify-center flex-col overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-green-400/5 blur-3xl pointer-events-none animate-pulse" />

            <Button
                className="absolute top-0 flex gap-2 mt-40 sm:mt-28 ml-10 md:ml-2 z-20 self-start bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700 hover:text-green-300 hover:border-green-500/40"
                onClick={() => { navigate("/admin/menu"); }}
            >
                <ArrowBigLeft /> Go Back
            </Button>

            <div className="w-full sm:mt-40 h-full flex items-center justify-center relative z-10">
                <div className="h-full w-[60%] px-2 sm:w-full gap-5 grid grid-cols-2 justify-center">
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">Team Settings</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddTeamDialog />
                            <ViewTeam />
                        </div>
                    </div>
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">Description Fund Type</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddFundType />
                            <ViewFund />
                        </div>
                    </div >
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">PAP Settings</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddPapCode /> <ViewPaPCode />

                        </div>
                    </div>
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">Class Type</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddClassType /> <ViewClassType />

                        </div>
                    </div>
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">Object Settings</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddObject /><ViewObject />

                        </div>
                    </div>
                    <div className="relative bg-neutral-900/90 backdrop-blur-sm flex flex-col gap-2 border border-green-700/30 px-3 py-2 rounded-md shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]">
                        <p className="text-2xl font-gbold text-green-300 sm:text-sm md:text-base truncate">Claimant</p>
                        <div className="flex items-start justify-start gap-4 sm:flex-col sm:w-full">
                            <AddClaimant /> <ViewClaimant />

                        </div>
                    </div>
                </div></div>
        </div>

    )
}

export default SettingsContainer
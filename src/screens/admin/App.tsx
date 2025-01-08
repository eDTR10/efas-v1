import { ThemeProvider } from "@/components/theme-provider"


import { Link, Outlet } from "react-router-dom";

// import { ModeToggle } from "./components/mode-toggle";
// import Reveal from "./components/animation/reveal";
import Logo  from './../../assets/eDTR-logo.webp'

import { ModeToggle } from "../../components/mode-toggle";
import Nav from "@/components/nav/nav";

function App() {

 
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
     <div className=" bg-background min-h-screen  w-full overflow-hidden flex flex-col  items-center">
      
      <nav className=" animate__animated animate__slideInDown  z-20 bg-none fixed  flex justify-between items-center w-full max-w-[1468px] py-5 border-b-[0px] border-accent \ ">
        <Link className=" ml-5  bg-[#edf7f0]  flex items-center justify-center  rounded-md" to="/admin" >
          <img src={Logo} className="logo  w-32 sm:w-24 object-contain " alt="Vite logo" />
        </Link>
        <nav className=" text-accent-foreground flex gap-10 uppercase items-center">
        

      


        <div className=" p-3 rounded-full hover:cursor-pointer flex gap-2 items-center">
        <Nav/>
        <ModeToggle />
        </div>
        
        </nav>
       
      </nav>
 

      

      <Outlet />
     
    </div>
    </ThemeProvider>
  )
}



export default App

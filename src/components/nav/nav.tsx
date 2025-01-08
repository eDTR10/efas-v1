
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,

  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom";
 

function Nav() {
    const navigate = useNavigate()
  let name =
    JSON.parse(localStorage.getItem("user") || "").first_name +
    " " +
    JSON.parse(localStorage.getItem("user") || "").last_name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {" "}
        <div className=" bg-card flex gap-2 items-center rounded-md px-2 py-1 pr-3 border border-border ">
          <img
            className=" h-10 object-contain"
            src="/480px-DICT-Logo-icon_only.webp"
            alt=""
          />
          <div className=" flex flex-col gap-[-20px]">
            <h1 className=" font-gbold text-accent-foreground capitalize">
              {name}
            </h1>
            <p className=" font-gregular  lowercase text-accent-foreground/60 truncate text-xs">
              {JSON.parse(localStorage.getItem("user") || "").email}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
        
          <DropdownMenuItem onClick={()=>{
            
            navigate("/admin/settings")
        }}>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
       
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className=" cursor-pointer" onClick={()=>{
            
            navigate("/")
            localStorage.clear()
        }}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Nav;

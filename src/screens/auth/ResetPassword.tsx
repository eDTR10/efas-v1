import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import axios from './../../plugin/axios'
import AlertBox from "@/components/alert/alert";
import { useParams,Link }  from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import Logo from './../../assets/eDTR-logo.webp';
import R10bg from './../../assets/r10-bg.jpg';
import Logo2 from './../../assets/DICT-Logo-Final-2-300x153.png';
import { ThemeProvider } from "@/components/theme-provider";
import { Loader2Icon } from "lucide-react";
import './login.css';
const ResetPassword = () => {
  const key = useParams()
    const [warning,setWarning]=useState({
        load:false,
        type:"",
        title:"",
        message:""
      })

      const [userCreate, setUserCreate] = useState({
        ...key,
        new_password: "",
        re_new_password: "",
      });
    
      const [passwordVal,setPasswordVal]=useState(false)
      const [confirmpasswordVal,setConfirmPasswordVal]=useState(false)
        //Password validation family
        const validatePassword = (password: string) => {
          // Password should be at least 5 characters long
          if (password.length < 8) {
            return false;
            
          }
      
          // Password should contain at least one number
          if (!/\d/.test(password)) {
            return false;
          }
      
          return true;
        };
        useEffect(()=>{
          setPasswordVal(validatePassword(userCreate.new_password))
        },[userCreate.new_password])
      
        useEffect(()=>{
          if (userCreate.new_password == userCreate.re_new_password && userCreate.new_password !="" && userCreate.re_new_password!="") {
            setConfirmPasswordVal(true)
          }else{
            setConfirmPasswordVal(false)
          }
        },[userCreate.new_password,userCreate.re_new_password])
       //Password validation family
  
      
       const [show,setShow] = useState(false)
       async function SignUp(){

        if (passwordVal && confirmpasswordVal) {
          setWarning({
            load:true,
            type:"",
            title:"",
            message:""
          })
          try {
            await axios.post("users/reset_password_confirm/", userCreate).then((res:any)=>{
              console.log(res.status)


              setWarning({
                load:true,
                type: "success",
                title: "Congratulations, Password has updated!",
                message: "Hooray! Your account password has been successfully updated."
              })
              setTimeout(() => {
                setWarning({
                  load:false,
                  type:"",
                  title:"",
                  message:""
                })
    
                setUserCreate({
                  ...key,
                  new_password: "",
                  re_new_password: "",
                })

                setShow(true)
              }, 3000);
              
              
    
            })
            
          } catch (error) {
            setWarning({
              load:true,
              type:"error",
              title: "Password Rest Unsuccessful",
              message:"Oops! There might be a problem."
            })
            setTimeout(() => {
              setWarning({
                load:false,
                type:"",
                title:"",
                message:""
              })
            }, 6000);
            
          }
        }
        
      }
       

      const onChangeInputCreate = (e: any) => {
        setUserCreate({
          ...userCreate,
          [e.target.name]: e.target.value,
        });
      };
    
      const handleKeyDown = (event: any) => {
        if (event.key === "Enter") {
          console.log("Enter key pressed");
        }
      };

     
      
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className='bg-background relative w-screen h-screen overflow-hidden flex justify-center'>

            <div className='absolute right-0 p-10 z-30'>
                    <ModeToggle />
                </div>

                <div className="relative w-full h-full flex flex-col gap-4 items-center justify-center">
                    <img src={R10bg} className='pointer-events-none absolute z-0 h-full w-full object-cover opacity-5' alt="" />
                    <div className='flex gap-3 items-center'>
                        <img src={Logo} className='animate__animated animate__slideInLeft h-16 object-contain' alt="" />
                        <a href="https://www.facebook.com/DICTRegion10" target='_blank'><img src={Logo2} className='animate__animated animate__slideInRight h-24 object-contain' alt="" /></a>
                    </div>

               
                 
      
     
      <form onSubmit={(e:any)=>{
        e.preventDefault();
        }} className='animate__animated animate__fadeInUp mb-10 z-10 w-full sm:w-[95%] sm:mx-4 max-w-[450px] flex flex-col items-center min-h-[100px] py-10 px-6 rounded-md bg-card border-2 border-border gap-4'>
              <div className='w-[95%] h-16 flex'>
                            <h1 className='text-foreground text-3xl font-bold'>Change Password</h1>
                        </div>
                                
       <div  className='flex flex-col gap-1 w-full'>
            <Input
            type="password"
            placeholder="New password"
            className=" text-accent-foreground w-full"
            value={userCreate.new_password}
            name="new_password"
            onChange={onChangeInputCreate}
            onKeyDown={handleKeyDown}
          />
          <p className={passwordVal?" text-xs ml-2 mt-1 text-green-500":" text-xs ml-2 mt-1 text-red-500"}>{passwordVal?"Valid password":"It must be at least 8 characters and include numbers."}</p>
          </div>
          
          <div className='flex flex-col gap-1 w-full'>
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={userCreate.re_new_password}
            className=" text-accent-foreground w-full"
            name="re_new_password"
            onChange={onChangeInputCreate}
            onKeyDown={handleKeyDown}
          />
          <p className={confirmpasswordVal?" text-xs ml-2 mt-1 text-green-500":" text-xs ml-2 mt-1 text-red-500"}>{confirmpasswordVal?"Password match":"Password not match"}</p>
          </div>

          <button
                                className="btn-donate w-full"
                                disabled={warning.load}
                                onClick={SignUp}
                            >
                                
                                {warning.load ? <div className='flex gap-2 justify-center items-center'>
                                    Sending
                                    <Loader2Icon className="loader animate-spin"></Loader2Icon>
                                </div>  : 'Reset Password'}
                            </button>
  
        <div className={warning.load?"flex":"hidden"}>
          <AlertBox variant={warning.type}
          title={warning.title}
          description={warning.message}
          />
          </div>

       
      </form>
    
 

    <Button className={show?"flex":"hidden"}>
    <Link id="step1" to="/">
    Sign In
        </Link>
 
    </Button>
                    </div>

                    
     
      
    {/* SignIn */}
   

    
  </div>
  </ThemeProvider>
  )
}

export default ResetPassword
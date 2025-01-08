import R10bg from './../../assets/r10-bg.jpg'
import Logo from './../../assets/eDTR-logo.webp'
import Logo2 from './../../assets/DICT-Logo-Final-2-300x153.png'


import InputText from '@/components/input/InputText'

import './login.css'
import { ModeToggle } from '@/components/mode-toggle'
import { ThemeProvider } from '@/components/theme-provider'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import axios from '../../plugin/axios'
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from 'lucide-react'
function Login() {
    const [showPassword, setShowPassword] = useState(false);


    const navigate = useNavigate()
    const [user, setUser] = useState({
        email: "", password: ""
    })
    useEffect(() => {
        localStorage.getItem("accessToken") ? navigate('/admin') : ""
    }, [])

    useEffect(() => {
        console.log("asdasd", import.meta.env.VITE_URL)
    }, [])





    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className='   bg-background relative w-screen h-screen overflow-hidden flex justify-center'>
                <div className=' absolute right-0 p-10 z-30'>
                    <ModeToggle />
                </div>




                {/* <div className=" relative h-full w-[300px] bg-primary flex items-center justify-center ">
            <img src={Logo} className=' rotate-90 h-full object-contain' alt="" />
            

        </div> */}
                <div className=" relative w-full h-full flex flex-col gap-4 items-center justify-center">
                    <img src={R10bg} className='  pointer-events-none absolute z-0 h-full w-full object-cover opacity-5' alt="" />
                    <div className=' flex gap-3 items-center'>
                        <img src={Logo} className=' animate__animated animate__slideInLeft  h-16 object-contain' alt="" />
                        <a href="https://www.facebook.com/DICTRegion10" target='_blank'><img src={Logo2} className='animate__animated animate__slideInRight h-24 object-contain' alt="" /></a>

                    </div>


                    <form className='animate__animated animate__fadeInUp mb-10 z-10 w-full sm:w-[95%] sm:mx-4 max-w-[450px] flex flex-col items-center  min-h-[100px] py-10 px-6 rounded-md bg-card border-2 border-border' onSubmit={(e: any) => {
                        e.preventDefault()


                        axios.post('token/login/', user).then((e: any) => {

                            if (e.data.auth_token) {
                                localStorage.setItem("accessToken", e.data.auth_token)
                                console.log(e.data.auth_token)
                                axios.get('users/me/', {
                                    headers: {
                                        Authorization: `Token ${e.data.auth_token}`,
                                    },
                                }).then((z: any) => {
                                    console.log(z.data)
                                    console.log(z)
                                    Swal.fire({
                                        icon: "success",
                                        title: "Login Successfully...",
                                        showConfirmButton: false,
                                        timer: 2000
                                    });
                                    localStorage.setItem("user", JSON.stringify(z.data))
                                
                                    if (z.data.acc_lvl === 1) {
                                        navigate('/admin')
                                    }
                                    else {
                                        navigate('/user')
                                    }



                                })
                            }
                        }).catch((error: any) => {

                            console.log(error.response.data.non_field_errors[0])

                            Swal.fire({
                                icon: "error",
                                title: "Oops...",
                                text: error.response.data.non_field_errors[0],
                                showConfirmButton: false,

                            });

                        })






                    }} >
                        <div className=' w-[95%] h-16 flex '>
                            <h1 className=' text-foreground text-3xl font-gbold'>SIGN IN</h1>
                        </div>

                        <div className=' flex flex-col gap-4 w-[85%]'>
                            <InputText
                                label="Email"
                                value={user.email}
                                onChange={(e: any) => {
                                    setUser({ ...user, email: e.target.value })
                                }}
                                type="email"
                            />
                            <div className=' relative flex'>
                                <InputText
                                    label="Password"
                                    value={user.password}
                                    onChange={(e: any) => {
                                        setUser({ ...user, password: e.target.value });
                                    }}
                                    type={showPassword ? "text" : "password"}
                                    style={{ paddingRight: '2.5rem' }} // Add padding to the right to make space for the button
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className=' right-0 flex items-center sm:mt-4 h-full w-10 absolute'
                                    
                                >
                                    {!showPassword ? <EyeOffIcon className=' text-foreground w-5 h-5' /> : <EyeIcon className=' w-5 h-5 text-foreground'  />}
                                </button>
                            </div>
                            <Link to='/forgot-password' className='text-foreground font-semibold text-sm cursor-pointer self-end pt-2 pb-6 hover:underline'>Forgot password?</Link>

                            <button className="btn-donate">Sign In</button>

                        </div>




                    </form>



                </div>
                <p className=' absolute text-foreground bottom-0 z-20 self-center pb-4 hover:underline cursor-pointer text-sm'>Developed by: DICT Region 10</p>


            </div>
        </ThemeProvider>
    )
}

export default Login
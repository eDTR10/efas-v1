import R10bg from './../../assets/r10-bg.jpg'
import Logo from './../../assets/eDTR-logo.webp'
import Logo2 from './../../assets/DICT-Logo-Final-2-300x153.png'



import InputText from '@/components/input/InputText';

import './login.css';
import { ModeToggle } from '@/components/mode-toggle';
import { ThemeProvider } from '@/components/theme-provider';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from '../../plugin/axios';
import { Link, useNavigate } from "react-router-dom";
import { Loader2Icon } from 'lucide-react';

function ForgotPassword() {
    const navigate = useNavigate();
    const [user, setUser] = useState({
        email: "", password: ""
    });
    const [loading, setLoading] = useState(false); // Loading state for button

    useEffect(() => {
        if (localStorage.getItem("accessToken")) {
            navigate('/admin/home');
        }
    }, []);

    const handleResetPassword = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        // Set a timeout to automatically stop loading if request takes too long
        const timeout = setTimeout(() => setLoading(false), 6000);

        try {
            await axios.post('users/reset_password/', user);
            clearTimeout(timeout); // Clear timeout if request completes
            Swal.fire({
                icon: "success",
                title: "We sent something to your email successfully.",
                showConfirmButton: false,
                timer: 2000
            });
            setUser({ email: "", password: "" });
        } catch (error: any) {
            console.log(error.response.data.non_field_errors[0]);
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.response.data.non_field_errors[0],
                showConfirmButton: false,
            });
        } finally {
            setLoading(false); // Stop loading in both success and error cases
        }
    };

    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className='bg-background relative w-screen h-screen overflow-hidden flex justify-center'>
                <div className='absolute right-0 p-10 z-30'>
                    <ModeToggle />
                </div>
                <div className="relative w-full h-full flex flex-col gap-4 items-center justify-center">
                    <img src={R10bg} className='pointer-events-none bg-white absolute z-0 h-full w-full object-cover opacity-5' alt="" />
                    <div className='flex gap-3 items-center'>
                        <img src={Logo} className='animate__animated animate__slideInLeft h-16 object-contain' alt="" />
                        <a href="https://www.facebook.com/DICTRegion10" target='_blank'><img src={Logo2} className='animate__animated animate__slideInRight h-24 object-contain' alt="" /></a>
                    </div>

                    <form className='animate__animated animate__fadeInUp mb-10 z-10 w-full sm:w-[95%] sm:mx-4 max-w-[450px] flex flex-col items-center min-h-[100px] py-10 px-6 rounded-md bg-card border-2 border-border' onSubmit={handleResetPassword}>
                        <div className='w-[95%] h-16 flex'>
                            <h1 className='text-foreground text-3xl font-bold'>Reset Password</h1>
                        </div>

                        <div className='flex flex-col gap-4 w-[85%]'>
                            <InputText
                                label="Email"
                                value={user.email}
                                onChange={(e: any) => setUser({ ...user, email: e.target.value })}
                                type="email"
                            />
                            <Link to="/login" className='text-foreground font-semibold text-sm cursor-pointer self-end pt-2 pb-6 hover:underline'>Already remember it? Back to Login</Link>

                            <button
                                className="btn-donate"
                                type="submit"
                                disabled={loading}
                            >
                                
                                {loading ? <div className='flex gap-2 justify-center items-center'>
                                    Sending
                                    <Loader2Icon className="loader animate-spin"></Loader2Icon>
                                </div>  : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </div>
                <p className='absolute text-foreground bottom-0 z-20 self-center pb-4 hover:underline cursor-pointer text-sm'>Developed by: DICT Region 10</p>
            </div>
        </ThemeProvider>
    );
}

export default ForgotPassword;
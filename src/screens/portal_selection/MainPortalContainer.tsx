import { useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from '@/components/mode-toggle'

// Import new logo (assuming it's saved as logo.png in assets)
import logo from '../../assets/eFAS_Logo.png';

function MainPortalContainer() {
    const navigate = useNavigate();

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-background py-10 xs:py-6">
                {/* Theme toggle */}
                <div className="absolute right-5 top-5 z-40">
                    <ModeToggle />
                </div>

                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:32px_32px]" />

                {/* Floating glowing orbs */}
                <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse xs:hidden" />
                <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse [animation-delay:1s] xs:hidden" />

                {/* Logo */}
                <div className="relative z-20 mb-8 xs:mb-5 flex flex-col items-center">
                    <img src={logo} alt="Logo" className="w-52 md:w-44 xs:w-36 phone:w-28 h-auto max-w-xs object-contain bg-transparent" />
                </div>

                {/* Header */}
                <div className="relative z-10 text-center mb-12 md:mb-8 xs:mb-6 px-4">
                    <h1 className="text-foreground text-4xl md:text-3xl xs:text-2xl phone:text-xl font-bold tracking-tight">
                        Select a Portal
                    </h1>
                    <p className="text-muted-foreground text-base xs:text-sm mt-3">
                        Choose the portal you want to access
                    </p>
                </div>

                {/* Portal Buttons */}
                <div
                    className="relative z-10 grid grid-cols-3 lg:grid-cols-1 gap-6 md:gap-5 px-6 xs:px-4 w-full max-w-5xl md:max-w-3xl sm:max-w-xl justify-center"
                >
                    {/* NTCA Request */}
                    <button
                        id="portal-ntca-request"
                        onClick={() => navigate('/efas-v1/ntca-request')}
                        className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
                        bg-card border border-border
                        shadow-[0_8px_32px_rgba(59,130,246,0.08)]
                        hover:shadow-[0_16px_48px_rgba(59,130,246,0.20)]
                        hover:border-primary/50
                        hover:scale-[1.03] active:scale-[0.98]
                        transition-all duration-300 ease-out
                        cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none z-0" />
                        <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <svg className="w-7 h-7 xs:w-5 xs:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2zm3-5h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-foreground text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-200">
                                NTCA Request
                            </h2>
                            <p className="text-muted-foreground text-sm xs:text-xs mt-1">
                                Review monthly request schedules and add request rows
                            </p>
                        </div>
                        <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/40 group-hover:translate-x-1 transition-all duration-300">
                            <svg className="w-4 h-4 xs:w-3 xs:h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* NTCA Balance */}
                    <button
                        id="portal-ntca-balance"
                        onClick={() => navigate('/efas-v1/ntca-balance')}
                        className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
                        bg-card border border-border
                        shadow-[0_8px_32px_rgba(59,130,246,0.06)]
                        hover:shadow-[0_16px_48px_rgba(59,130,246,0.20)]
                        hover:border-primary/50
                        hover:scale-[1.03] active:scale-[0.98]
                        transition-all duration-300 ease-out
                        cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
                    >
                        {/* Shimmer sweep on hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none z-0" />
                        {/* Icon */}
                        <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <svg className="w-7 h-7 xs:w-5 xs:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-foreground text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-200">
                                NTCA Balance
                            </h2>
                            <p className="text-muted-foreground text-sm xs:text-xs mt-1">
                                View and manage NTCA balance records
                            </p>
                        </div>
                        {/* Arrow indicator */}
                        <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/40 group-hover:translate-x-1 transition-all duration-300">
                            <svg className="w-4 h-4 xs:w-3 xs:h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* RAOD */}
                    <button
                        id="portal-raod"
                        onClick={() => navigate('/efas-v1/records')}
                        className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
                        bg-card border border-border
                        shadow-[0_8px_32px_rgba(59,130,246,0.06)]
                        hover:shadow-[0_16px_48px_rgba(59,130,246,0.20)]
                        hover:border-primary/50
                        hover:scale-[1.03] active:scale-[0.98]
                        transition-all duration-300 ease-out
                        cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
                    >
                        {/* Shimmer sweep on hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none z-0" />
                        {/* Icon */}
                        <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <svg className="w-7 h-7 xs:w-5 xs:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-foreground text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-200">
                                RAOD
                            </h2>
                            <p className="text-muted-foreground text-sm xs:text-xs mt-1">
                                Access RAOD records and reports
                            </p>
                        </div>
                        {/* Arrow indicator */}
                        <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/40 group-hover:translate-x-1 transition-all duration-300">
                            <svg className="w-4 h-4 xs:w-3 xs:h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="relative z-10 mt-16 sm:mt-10 xs:mt-8 text-muted-foreground text-xs tracking-widest uppercase px-4 text-center">
                    eFAS &mdash; Electronic Financial Accountability System
                </div>
            </div>
        </ThemeProvider>
    );
}

// return (
//     <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-neutral-950 py-10 xs:py-6">
//         {/* Subtle background pattern */}
//         <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_25%_25%,theme(colors.green.500)_0%,transparent_50%),radial-gradient(circle_at_75%_75%,theme(colors.green.700)_0%,transparent_50%)]" />

//         {/* Floating glowing orbs */}
//         <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-green-500/5 blur-3xl pointer-events-none animate-pulse xs:hidden" />
//         <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-green-400/5 blur-3xl pointer-events-none animate-pulse [animation-delay:1s] xs:hidden" />

//         {/* Logo */}
//         <div className="relative z-20 mb-8 xs:mb-5 flex flex-col items-center">
//             <img src={logo} alt="Logo" className="w-52 md:w-44 xs:w-36 phone:w-28 h-auto max-w-xs object-contain bg-transparent" />
//         </div>

//         {/* Header */}
//         <div className="relative z-10 text-center mb-12 md:mb-8 xs:mb-6 px-4">

//             <h1 className="text-white text-4xl md:text-3xl xs:text-2xl phone:text-xl font-bold tracking-tight">
//                 Select a Portal
//             </h1>
//             <p className="text-neutral-400 text-base xs:text-sm mt-3">
//                 Choose the portal you want to access
//             </p>
//         </div>

//         {/* Portal Buttons */}
//         <div
//             className="relative z-10 grid grid-cols-3 lg:grid-cols-1 gap-6 md:gap-5 px-6 xs:px-4 w-full max-w-5xl md:max-w-3xl sm:max-w-xl justify-center"
//         >
//             {/* NTCA Request */}
//             <button
//                 id="portal-ntca-request"
//                 onClick={() => navigate('/efas-v1/ntca-request')}
//                 className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
//                         bg-gradient-to-br from-sky-950/85 via-neutral-900 to-emerald-950/90 border border-sky-800/70
//                         shadow-[0_8px_32px_rgba(14,165,233,0.10)]
//                         hover:shadow-[0_16px_48px_rgba(56,189,248,0.22)]
//                         hover:border-sky-400/70
//                         hover:scale-[1.03] active:scale-[0.98]
//                         transition-all duration-300 ease-out
//                         cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
//             >
//                 <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-sky-300/10 to-transparent pointer-events-none z-0" />
//                 <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-sky-800/40 border border-sky-700 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-sky-700 group-hover:border-sky-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
//                     <svg className="w-7 h-7 xs:w-5 xs:h-5 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
//                             d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2zm3-5h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01" />
//                     </svg>
//                 </div>
//                 <div>
//                     <h2 className="text-white text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-sky-200 transition-colors duration-200">
//                         NTCA Request
//                     </h2>
//                     <p className="text-neutral-400 text-sm xs:text-xs mt-1">
//                         Review monthly request schedules and add request rows
//                     </p>
//                 </div>
//                 <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-sky-900/40 border border-sky-700 flex items-center justify-center group-hover:bg-sky-800/70 group-hover:border-sky-400 group-hover:translate-x-1 transition-all duration-300">
//                     <svg className="w-4 h-4 xs:w-3 xs:h-3 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                     </svg>
//                 </div>
//             </button>
//             {/* NTCA Balance */}
//             <button
//                 id="portal-ntca-balance"
//                 onClick={() => navigate('/efas-v1/ntca-balance')}
//                 className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
//                         bg-neutral-900 border border-neutral-800
//                         shadow-[0_8px_32px_rgba(0,0,0,0.4)]
//                         hover:shadow-[0_16px_48px_rgba(74,222,128,0.2)]
//                         hover:border-green-500/50
//                         hover:scale-[1.03] active:scale-[0.98]
//                         transition-all duration-300 ease-out
//                         cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
//             >
//                 {/* Shimmer sweep on hover */}
//                 <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-green-400/10 to-transparent pointer-events-none z-0" />
//                 {/* Icon */}
//                 <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-green-800/40 border border-green-700 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-green-700 group-hover:border-green-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
//                     <svg className="w-7 h-7 xs:w-5 xs:h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
//                             d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                 </div>
//                 <div>
//                     <h2 className="text-white text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-green-300 transition-colors duration-200">
//                         NTCA Balance
//                     </h2>
//                     <p className="text-neutral-400 text-sm xs:text-xs mt-1">
//                         View and manage NTCA balance records
//                     </p>
//                 </div>
//                 {/* Arrow indicator */}
//                 <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:bg-green-900/60 group-hover:border-green-500/50 group-hover:translate-x-1 transition-all duration-300">
//                     <svg className="w-4 h-4 xs:w-3 xs:h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                     </svg>
//                 </div>
//             </button>

//             {/* RAOD */}
//             <button
//                 id="portal-raod"
//                 onClick={() => navigate('/efas-v1/records')}
//                 className="group relative flex-1 min-h-[220px] md:min-h-[190px] xs:min-h-[160px] rounded-3xl xs:rounded-2xl overflow-hidden
//                         bg-gradient-to-br from-green-900/80 to-green-950/90 border border-green-800
//                         shadow-[0_8px_32px_rgba(16,185,129,0.08)]
//                         hover:shadow-[0_16px_48px_rgba(74,222,128,0.25)]
//                         hover:border-green-400
//                         hover:scale-[1.03] active:scale-[0.98]
//                         transition-all duration-300 ease-out
//                         cursor-pointer text-left p-8 md:p-6 xs:p-5 flex flex-col justify-between"
//             >
//                 {/* Shimmer sweep on hover */}
//                 <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-green-300/10 to-transparent pointer-events-none z-0" />
//                 {/* Icon */}
//                 <div className="w-14 h-14 xs:w-10 xs:h-10 rounded-2xl xs:rounded-xl bg-green-800/40 border border-green-700 flex items-center justify-center mb-6 xs:mb-4 group-hover:bg-green-700 group-hover:border-green-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
//                     <svg className="w-7 h-7 xs:w-5 xs:h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
//                             d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                 </div>
//                 <div>
//                     <h2 className="text-white text-2xl md:text-xl xs:text-lg font-bold tracking-tight group-hover:text-green-300 transition-colors duration-200">
//                         RAOD
//                     </h2>
//                     <p className="text-neutral-400 text-sm xs:text-xs mt-1">
//                         Access RAOD records and reports
//                     </p>
//                 </div>
//                 {/* Arrow indicator */}
//                 <div className="absolute bottom-6 right-6 xs:bottom-4 xs:right-4 w-9 h-9 xs:w-7 xs:h-7 rounded-full bg-green-800/40 border border-green-700 flex items-center justify-center group-hover:bg-green-700 group-hover:border-green-400 group-hover:translate-x-1 transition-all duration-300">
//                     <svg className="w-4 h-4 xs:w-3 xs:h-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                     </svg>
//                 </div>
//             </button>
//         </div>

//         {/* Footer */}
//         <div className="relative z-10 mt-16 sm:mt-10 xs:mt-8 text-neutral-600 text-xs tracking-widest uppercase px-4 text-center">
//             eFAS &mdash; Electronic Financial Accounting System
//         </div>
//     </div>
// );


export default MainPortalContainer;

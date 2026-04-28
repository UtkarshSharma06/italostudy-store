import { Suspense, lazy, useState, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    ShoppingBag,
    User,
    Menu,
    X,
    Sun,
    Moon,
    LayoutDashboard
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementBar = lazy(() => import('./AnnouncementBar'));

interface LayoutProps {
    children: ReactNode;
    showFooter?: boolean;
    showHeader?: boolean;
}

export default function Layout({
    children,
    showFooter = true,
    showHeader = true
}: LayoutProps) {
    const { user, signOut, profile, session } = useAuth() as any;
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const displayName = profile?.display_name || profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Guest';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-500">
            {/* Global Announcement System */}
            <Suspense fallback={null}>
                <AnnouncementBar />
            </Suspense>

            {/* Simplified Store Header */}
            {showHeader && (
                <header className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center gap-2">
                                <img 
                                    src={theme === 'dark' ? "/logo-dark-full.webp" : "/logo.webp"} 
                                    alt="ItaloStudy" 
                                    className="h-8 md:h-10 w-auto object-contain"
                                />
                            </Link>
                            
                            <nav className="hidden md:flex items-center gap-6">
                                <Link to="/products" className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">Products</Link>
                                <Link to="/orders" className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">My Orders</Link>
                                {user && (
                                    <button 
                                        onClick={() => window.open('https://app.italostudy.com/dashboard', '_blank', 'noopener,noreferrer')}
                                        className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                                    >
                                        Dashboard
                                    </button>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform w-10 h-10"
                            >
                                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
                            </Button>

                            {user ? (
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex flex-col items-end mr-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">{displayName}</span>
                                        <button onClick={handleSignOut} className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors">Sign Out</button>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                                        <User className="w-5 h-5" />
                                    </div>
                                </div>
                            ) : (
                                <Button 
                                    onClick={() => {
                                        sessionStorage.setItem('post_login_redirect', location.pathname);
                                        navigate('/auth');
                                    }}
                                    className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    Login
                                </Button>
                            )}

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 text-slate-600 dark:text-slate-300"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden fixed inset-x-0 top-20 z-[90] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-2xl shadow-black/10"
                    >
                        {user && (
                            <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    const url = session 
                                        ? `https://app.italostudy.com/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=signup`
                                        : 'https://app.italostudy.com';
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                }} 
                                className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 text-indigo-600"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </button>
                        )}
                        <Link to="/products" onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3">
                            <ShoppingBag className="w-4 h-4 text-indigo-600" />
                            Products
                        </Link>
                        <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3">
                            <User className="w-4 h-4 text-indigo-600" />
                            My Orders
                        </Link>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Store Footer */}
            {showFooter && (
                <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
                    <div className="container mx-auto px-4 text-center">
                        <img 
                            src={theme === 'dark' ? "/logo-dark-full.webp" : "/logo.webp"} 
                            alt="ItaloStudy" 
                            className="h-8 w-auto mx-auto mb-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
                        />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                            &copy; {new Date().getFullYear()} ItaloStudy. All rights reserved.
                        </p>
                        
                        {/* Payment Logos */}
                        <div className="flex flex-wrap justify-center items-center gap-6 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                            {/* Visa */}
                            <svg className="h-4 w-auto" viewBox="0 0 100 32" fill="currentColor">
                                <path d="M40.1 1.1h-6.2L28.1 19.3l-2.6-13.8c-.3-1.4-1.3-2.3-2.6-2.3H11.7l-.2.9c2.3.5 4.8 1.4 6.4 2.3.9.5 1.2.9 1.4 1.8l4.8 18.5h6.3l9.7-25.6zm15.1 17.5c0-2.4 3.3-2.7 3.3-3.9 0-.4-.3-.7-.9-.7-1.4 0-2.6.4-3.7 1.1l-.7-.9c1.1-.9 2.7-1.5 4.4-1.5 2.8 0 4.7 1.4 4.7 3.7 0 4.3-5.9 4.6-5.9 6.5 0 .6.5 1 1.6 1 1.4 0 2.5-.5 3.5-1.1l.6.9c-1 1-2.6 1.7-4.4 1.7-2.9 0-4.6-1.5-4.6-3.8zm23.6-7.5l-2.1 10.4-1.3-6.6c-.3-1.5-1.1-2.4-2.5-2.4h-4.6l-.2.8c1 .2 2 .5 2.7.9.4.2.6.5.5.9L64.8 26.7h6.4l9.7-25.6h-6.1l4 17.5zM100 1.1h-4.9c-1.5 0-2.6 1-2.9 2.4l-7.3 17.5-1.1-5.7c-.3-1.4-1.2-2.3-2.6-2.3h-4.7l-.2.9c1 .2 2 .5 2.7.9.4.2.6.5.5.9l4.5 18.5h6.4L100 1.1z"/>
                            </svg>
                            {/* Mastercard */}
                            <svg className="h-6 w-auto" viewBox="0 0 100 60" fill="currentColor">
                                <circle cx="35" cy="30" r="25" fill="#EB001B" fillOpacity="0.8"/>
                                <circle cx="65" cy="30" r="25" fill="#F79E1B" fillOpacity="0.8"/>
                                <path d="M50 11.5c-4.4 4.5-7.1 10.7-7.1 18.5s2.7 14 7.1 18.5c4.4-4.5 7.1-10.7 7.1-18.5s-2.7-14-7.1-18.5z" fill="#FF5F00"/>
                            </svg>
                            {/* Stripe */}
                            <svg className="h-5 w-auto" viewBox="0 0 100 42" fill="currentColor">
                                <path d="M50.4 14.5c0-1.8 1.4-2.8 3.8-2.8 2 0 4.4.7 6.4 1.8l1.3-4.4c-2-1-4.7-1.7-7.5-1.7-6.2 0-10 3.2-10 8.5 0 8.3 11.4 6.9 11.4 10.5 0 2-1.8 3-4.4 3-2.6 0-5.5-1-7.8-2.4l-1.3 4.5c2.4 1.4 5.7 2.3 8.8 2.3 6.6 0 10.8-3.1 10.8-8.8.1-8.5-11.5-6.9-11.5-10.5zM38.8 18.2V8.1h-5.8v10.1c0 2.2-.4 3.3-2.2 3.3-.6 0-1.2-.1-1.6-.3l-.4 4.6c.7.3 1.7.5 2.8.5 4.3 0 7.2-2.3 7.2-8.1zM11.6 8.1c-3.1 0-5.3 1.2-6.5 2.9V8.1H0v25.2h6V20.5c0-3.6 2.3-5.3 5.3-5.3.6 0 1.2.1 1.7.2l.6-5.5c-.6-.2-1.3-.3-2-.3zM45.5 3.3V0h-6v3.3h6zM26.4 8.1c-3.1 0-5.3 1.2-6.5 2.9V8.1h-5.1v25.2h6V20.5c0-3.6 2.3-5.3 5.3-5.3.6 0 1.2.1 1.7.2l.6-5.5c-.6-.2-1.3-.3-2-.3zM100 18.2c0-6.1-4.2-10.8-10.2-10.8-5.8 0-10 4.7-10 10.8 0 6.6 4.6 11.3 11 11.3 2.7 0 5-.6 6.8-1.7l-1.1-4.2c-1.4.7-2.9 1.1-4.8 1.1-3.2 0-5.6-1.7-6-4.5h14.1c.1-.7.2-1.4.2-2zm-14.1-2.4c.4-2.5 2.4-4.1 4.7-4.1 2.2 0 4.1 1.5 4.4 4.1h-9.1zM79.2 13.9c-1.3-1.6-3.1-2.5-5.5-2.5-4.2 0-7.3 3.6-7.3 8.3 0 5 3.1 8.5 7.4 8.5 2.3 0 4.3-.9 5.4-2.5v2h5.8V0h-5.8v13.9zM73.5 23c-2.4 0-4.1-1.9-4.1-4.4s1.7-4.3 4.1-4.3 4.1 1.8 4.1 4.3c0 2.5-1.7 4.4-4.1 4.4z"/>
                            </svg>
                            {/* Apple Pay */}
                            <svg className="h-5 w-auto" viewBox="0 0 100 42" fill="currentColor">
                                <path d="M85.7 13.1c-1.8 0-3.6 1-4.7 2.6V0h-6.2v32.6h6.2V31c1 1.6 2.9 2.6 4.7 2.6 3.6 0 6.9-2.9 6.9-10.3s-3.3-10.2-6.9-10.2zm-.7 15.5c-2.3 0-4-1.9-4-5.2s1.7-5.2 4-5.2 4 1.9 4 5.2-1.7 5.2-4 5.2zM62.6 13.1c-1.8 0-3.6 1-4.7 2.6v-2.2H51.7V32.6h6.2V21c0-3.6 2.3-5.2 4.6-5.2.6 0 1.2.1 1.7.2l.6-5.6c-.6-.2-1.4-.3-2.2-.3zM41.8 13.1c-5.8 0-10.2 4.7-10.2 10.3s4.4 10.2 10.2 10.2 10.2-4.7 10.2-10.2S47.6 13.1 41.8 13.1zm0 15.4c-2.3 0-4-1.9-4-5.1s1.7-5.2 4-5.2 4 1.9 4 5.2-1.7 5.1-4 5.1zM23.1 27.2l-3-14h-6.2l5.7 19.4h6.8l6-19.4h-6.3l-3 14zM10.1 5.3c1.6 0 2.9-1.3 2.9-2.6S11.7 0 10.1 0 7.2 1.3 7.2 2.6s1.3 2.7 2.9 2.7zM13.2 13.4H7V32.6h6.2V13.4z"/>
                            </svg>
                            {/* Google Pay */}
                            <svg className="h-5 w-auto" viewBox="0 0 100 42" fill="currentColor">
                                <path d="M43.7 21.1c0 3.3-1.1 6.1-3.2 8.1s-4.8 3.1-8.1 3.1h-5.2V10.1h5.2c3.3 0 6 1 8.1 3.1s3.2 4.7 3.2 7.9zm-4.7 0c0-2.3-.7-4.2-2-5.6s-3.2-2.1-5.6-2.1h-.9V28h.9c2.3 0 4.2-.7 5.6-2.1s2-3.3 2-4.8zm23.2-1.3v12.8h-4.3V29.5c0-1.8-.5-3.3-1.4-4.3s-2.1-1.5-3.5-1.5c-1.3 0-2.4.4-3.3 1.2s-1.4 1.8-1.4 3.1v4.6h-4.3V19.8h4.3v1.8c.6-.7 1.3-1.2 2-1.6s1.6-.6 2.6-.6c2.1 0 3.8.7 5 2.1s1.7 3.3 1.7 5.7zm11.5 5.5c0 2.3-1 4.2-3.1 5.6s-4.6 2.1-7.5 2.1c-2.4 0-4.6-.4-6.4-1.3s-3.1-2.1-3.7-3.6l4-1.7c.5.8 1.1 1.5 1.9 2s1.9.8 3.1.8c1.3 0 2.4-.3 3.1-.9s1.1-1.3 1.1-2.2c0-.7-.3-1.3-.9-1.8s-1.8-1-3.7-1.4-3.5-.9-4.8-1.5-2.2-1.4-2.8-2.6-.9-2.6-.9-4.2c0-2.2 1-3.9 2.9-5.1s4.4-1.8 7.3-1.8c2.2 0 4.2.4 5.9 1.1s3 1.8 3.6 3.2l-3.9 1.7c-.4-.7-1-1.2-1.7-1.6s-1.6-.5-2.6-.5c-1.2 0-2.1.2-2.8.7s-1.1 1.1-1.1 1.9c0 .7.3 1.3.8 1.7s1.7.9 3.5 1.3 3.6.9 5 1.5 2.3 1.3 3 2.5c.7 1.2 1 2.6 1 4.2z"/>
                            </svg>
                            {/* UPI */}
                            <svg className="h-5 w-auto" viewBox="0 0 100 42" fill="currentColor">
                                <path d="M12.1 32.6L0 10.1h5.8l8.9 17.2L23.6 10.1h5.8L17.3 32.6h-5.2zm28.4 0V20.4c0-2.5-.7-4.4-2-5.6s-3.2-1.8-5.6-1.8c-2.4 0-4.4.6-6 1.8s-2.6 2.9-2.9 5.1l5.4.6c.2-1 .7-1.8 1.4-2.4s1.6-.9 2.6-.9c1.2 0 2.1.3 2.7 1s.9 1.6.9 2.8V23h-5.2c-2.7 0-4.8.7-6.3 2s-2.3 3.1-2.3 5.4c0 2.2.8 3.9 2.3 5.1s3.6 1.8 6.3 1.8c2.4 0 4.4-.6 6-1.8s2.6-2.9 2.9-5.1v7.2h5.2zm-5.2-6.5c0 1.2-.4 2.1-1.2 2.8s-1.9 1.1-3.3 1.1-2.4-.4-3.2-1.1-.9-1.6-.9-2.8c0-2.1 1.4-3.1 4.1-3.1h4.5v3.1zm22.4 6.5V10.1h5.8v3.4c1.1-2.3 3.1-3.4 6-3.4 2.9 0 5.2 1.1 6.9 3.4s2.6 5.4 2.6 9.3-0.9 7-2.6 9.3-4 3.4-6.9 3.4c-2.9 0-4.9-1.1-6-3.4v10.3h-5.8V32.6zm5.8-9.3c0 2.3.6 4.2 1.8 5.6s2.8 2.1 4.8 2.1 3.6-.7 4.8-2.1 1.8-3.3 1.8-5.6-0.6-4.2-1.8-5.6-2.8-2.1-4.8-2.1-3.6.7-4.8 2.1-1.8 3.3-1.8 5.6zM100 10.1H94v22.5h6V10.1zm-3-10.1c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                            </svg>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
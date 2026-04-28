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
import StoreFooter from './store/StoreFooter';

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
            {showFooter && <StoreFooter />}
        </div>
    );
}
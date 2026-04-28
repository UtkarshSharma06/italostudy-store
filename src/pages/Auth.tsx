import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { 
    Mail, 
    Lock, 
    ArrowRight, 
    ChevronLeft, 
    Loader2,
    Eye,
    EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
    const navigate = useNavigate();
    const { signIn, signUp, signInWithGoogle } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: ''
    });


    // Get the redirect path from session storage or default to /
    const redirectPath = sessionStorage.getItem('post_login_redirect') || '/';

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error: signInError } = await signIn(formData.email, formData.password);
                if (signInError) throw signInError;
                toast.success('Welcome back to Italostudy!');
                navigate(redirectPath);
            } else {
                const { error: signUpError } = await signUp(formData.email, formData.password, formData.displayName);
                if (signUpError) throw signUpError;
                toast.success('Account created! Please check your email to verify.');
                setIsLogin(true);
            }
        } catch (err: any) {
            toast.error(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error: googleError } = await signInWithGoogle(window.location.origin + redirectPath);
            if (googleError) throw googleError;
        } catch (err: any) {
            toast.error(err.message || 'Google login failed');
        }
    };

    return (
        <div className="h-screen w-full flex flex-col lg:flex-row bg-[#0f172a] overflow-hidden font-sans">
            {/* ── Left Side: Visual/Branding (Hidden on mobile) ── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-950 h-full">
                <img 
                    src="/images/auth-bg.png" 
                    alt="Premium Background" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-transparent to-indigo-950/40" />
                
                <div className="relative z-10 p-12 xl:p-16 flex flex-col justify-between h-full w-full">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <img src="/logo.webp" alt="Italostudy" className="h-10 brightness-0 invert" />
                        <div className="w-px h-6 bg-white/20" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Store</span>
                    </motion.div>

                    <div className="max-w-md">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <span className="px-3 py-1 rounded-full bg-amber-400 text-[#0f172a] text-[10px] font-black uppercase tracking-widest mb-6 inline-block">
                                Premium Resources
                            </span>
                            <h1 className="text-5xl xl:text-6xl font-black text-white leading-tight tracking-tighter mb-6">
                                Elevate your <br />
                                <span className="text-amber-400">Preparation.</span>
                            </h1>
                            <p className="text-white/60 text-lg font-medium leading-relaxed mb-8">
                                Get your premium IMAT, CEnT-S, and academic resources at the official ItaloStudy Store.
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-8"
                        >
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-white/80">
                                <p className="text-sm font-black">5,000+ Students</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/40">Already onboard</p>
                            </div>
                        </motion.div>
                    </div>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-white/30 text-[10px] font-bold uppercase tracking-widest"
                    >
                        © {new Date().getFullYear()} Italostudy Education Technologies
                    </motion.p>
                </div>
            </div>

            {/* ── Right Side: Auth Form ── */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative z-20 h-full overflow-y-auto lg:overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden p-6 flex items-center justify-between shrink-0 border-b border-slate-50">
                    <div className="flex items-center gap-2.5">
                        <img src="/logo.webp" alt="Italostudy" className="h-6" />
                        <div className="w-px h-4 bg-slate-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Store</span>
                    </div>
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
                    <div className="w-full max-w-[420px] space-y-6 md:space-y-8">
                        <div className="space-y-2">
                            <motion.div
                                key={isLogin ? 'login-head' : 'signup-head'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {isLogin ? 'Welcome Back' : 'Create Account'}
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    {isLogin 
                                        ? 'Access your orders and premium downloads.' 
                                        : 'Join the premium educational community.'}
                                </p>
                            </motion.div>
                        </div>

                        {/* Social Auth */}
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-3 w-full h-12 rounded-2xl border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm text-slate-700"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    />
                                </svg>
                                <span>Continue with Google</span>
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black"><span className="bg-white dark:bg-slate-950 px-4 text-slate-400">Or continue with</span></div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAuth} className="space-y-4">
                            {!isLogin && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input 
                                            type="text"
                                            required
                                            value={formData.displayName}
                                            onChange={e => setFormData({...formData, displayName: e.target.value})}
                                            placeholder="Your Name"
                                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input 
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        placeholder="email@example.com"
                                        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                                    {isLogin && (
                                        <button type="button" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700">
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        placeholder="••••••••"
                                        className="w-full h-12 pl-12 pr-12 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Login Now' : 'Create Account'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="text-center">
                            <button 
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                                {isLogin ? (
                                    <>Don't have an account? <span className="text-indigo-600">Join now</span></>
                                ) : (
                                    <>Already have an account? <span className="text-indigo-600">Login</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Links */}
                <div className="p-6 flex items-center justify-center gap-6">
                    <button 
                        onClick={() => navigate('/')}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5"
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Back to Store
                    </button>
                    <div className="w-px h-3 bg-slate-200" />
                    <a href="https://italostudy.com/terms" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        Terms
                    </a>
                    <a href="https://italostudy.com/privacy" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                        Privacy
                    </a>
                </div>
            </div>
        </div>
    );
}

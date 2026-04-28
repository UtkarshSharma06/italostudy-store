import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Password updated successfully! Please sign in.');
                navigate('/auth');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-sans">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="w-full max-w-[420px] relative z-10">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-12 border border-white/5 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <Sparkles className="w-6 h-6 text-indigo-500" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Set New Password</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Secure your account with a new mission key</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input 
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border-2 border-transparent focus:border-indigo-600 focus:bg-slate-800 focus:outline-none transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input 
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border-2 border-transparent focus:border-indigo-600 focus:bg-slate-800 focus:outline-none transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] mt-6"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Update Password</span>
                                    <Sparkles className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/auth')}
                            className="w-full text-[10px] font-black text-slate-500 hover:text-indigo-400 transition-all uppercase tracking-[0.2em] pt-6 flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Back to Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

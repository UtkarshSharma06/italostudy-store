import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, ArrowRight, ShieldCheck,
    Loader2, Copy, Check, Lock, Zap,
    Package, Sparkles, GraduationCap, Rocket, BookOpen,
    HelpCircle, Crown, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

type PollStatus = 'waiting' | 'found' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [pollStatus, setPollStatus] = useState<PollStatus>('waiting');
    const [copied, setCopied] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const orderId = searchParams.get('order_id');

    // UI Stages: 0: Received, 1: Verifying, 2: Success/Failed
    const [activeStage, setActiveStage] = useState(0);

    const uiStatus: 'loading' | 'success' | 'error' | 'pending' =
        pollStatus === 'completed' ? 'success' :
        pollStatus === 'failed' || pollStatus === 'cancelled' ? 'error' :
        pollStatus === 'timeout' ? 'pending' :
        'loading';

    useEffect(() => {
        const verify = async () => {
            if (!orderId) {
                setPollStatus('failed');
                setErrorMsg('No order ID found. Contact contact@italostudy.com');
                setActiveStage(2);
                return;
            }

            // Move to "Verifying" stage after a short delay
            setTimeout(() => setActiveStage(1), 1500);

            try {
                let n = 0;
                const MAX = 20;

                const poll = async (): Promise<void> => {
                    n++;
                    const { data: txn, error } = await (supabase as any)
                        .from('transactions')
                        .select('status')
                        .eq('id', orderId)
                        .single();

                    if (error || !txn) {
                        if (n < MAX) {
                            await new Promise(r => setTimeout(r, 3000));
                            return poll();
                        }
                        setPollStatus('timeout');
                        setActiveStage(2);
                        return;
                    }

                    if (txn.status === 'completed') {
                        setPollStatus('completed');
                        setActiveStage(2);
                        triggerSuccessCelebration();
                        return;
                    }

                    if (txn.status === 'failed' || txn.status === 'cancelled') {
                        setPollStatus(txn.status as PollStatus);
                        setErrorMsg(txn.status === 'failed' ? 'Payment declined by bank.' : 'Payment was cancelled.');
                        setActiveStage(2);
                        return;
                    }

                    if (n < MAX) {
                        await new Promise(r => setTimeout(r, 3000));
                        return poll();
                    }

                    setPollStatus('timeout');
                    setActiveStage(2);
                };

                await poll();
            } catch (err: any) {
                setPollStatus('failed');
                setErrorMsg(err.message || 'Verification failed.');
                setActiveStage(2);
            }
        };
        verify();
    }, [orderId]);

    const triggerSuccessCelebration = () => {
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#4F46E5', '#10B981', '#F59E0B']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#4F46E5', '#10B981', '#F59E0B']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    const copyId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Soft Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Premium Header */}
            <header className="shrink-0 flex items-center justify-between px-8 py-6 z-10">
                <img src="/logo.webp" alt="ItaloStudy" className="h-9 w-auto" />
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Secure Checkout</span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[500px]"
                >
                    <div className="bg-white rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative">
                        {/* Progress Indicator */}
                        <div className="flex w-full h-1.5 bg-slate-50">
                            {[0, 1, 2].map((i) => (
                                <div 
                                    key={i}
                                    className={`flex-1 transition-all duration-700 ${
                                        activeStage >= i ? (
                                            uiStatus === 'error' && i === 2 ? 'bg-rose-500' : 'bg-indigo-600'
                                        ) : 'bg-transparent'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="p-10 space-y-10">
                            <AnimatePresence mode="wait">
                                {activeStage === 0 && (
                                    <motion.div 
                                        key="stage-0"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-6"
                                    >
                                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                            <ShoppingBag className="w-10 h-10 text-emerald-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payment Received!</h1>
                                            <p className="text-slate-500 font-medium leading-relaxed px-6">
                                                We've received your payment notification. Just a moment while we link it to your account...
                                            </p>
                                        </div>
                                        <div className="flex justify-center gap-2">
                                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Processing...</span>
                                        </div>
                                    </motion.div>
                                )}

                                {activeStage === 1 && (
                                    <motion.div 
                                        key="stage-1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-6"
                                    >
                                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                                            <motion.div 
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 border-t-2 border-indigo-500 rounded-full"
                                            />
                                            <ShieldCheck className="w-10 h-10 text-indigo-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verifying Order</h1>
                                            <p className="text-slate-500 font-medium leading-relaxed px-6">
                                                Connecting with the payment provider to finalize your secure access.
                                            </p>
                                        </div>
                                        <div className="px-8 space-y-3">
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 15, ease: "linear" }}
                                                    className="h-full bg-indigo-600"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Security Check in progress</span>
                                        </div>
                                    </motion.div>
                                )}

                                {activeStage === 2 && (
                                    <motion.div 
                                        key="stage-2"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center space-y-8"
                                    >
                                        {uiStatus === 'success' ? (
                                            <>
                                                <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200 relative group">
                                                    <Crown className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-500" />
                                                    <motion.div 
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="absolute inset-0 bg-indigo-600 rounded-[2rem] -z-10"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome Aboard!</h1>
                                                    <p className="text-base text-slate-500 font-medium leading-relaxed">
                                                        Your payment has been successfully verified. You're now ready to crush your exams!
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/orders')}
                                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                                                >
                                                    <Package className="w-5 h-5" />
                                                    Go to My Orders
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                                                    <XCircle className="w-12 h-12 text-rose-500" />
                                                </div>
                                                <div className="space-y-3">
                                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verification Problem</h1>
                                                    <p className="text-base text-slate-500 font-medium px-4">
                                                        {errorMsg || "We're having trouble confirming your payment right now."}
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-left flex gap-3">
                                                    <HelpCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                                    <p className="text-[11px] text-rose-800 font-bold leading-relaxed">
                                                        If you were charged, please email <strong>contact@italostudy.com</strong> with your order ID. We'll fix it immediately!
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/')}
                                                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                                                >
                                                    Back to Store
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer Details */}
                            <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
                                {orderId && (
                                    <button 
                                        onClick={copyId}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-50 transition-colors group"
                                    >
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Ref: {orderId.slice(0, 12)}...</span>
                                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="shrink-0 p-8 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Your study journey starts here
                </p>
            </footer>
        </div>
    );
}

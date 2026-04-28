import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, ArrowRight, ShieldCheck,
    Loader2, Copy, Check, Lock, Zap,
    Package, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type PollStatus = 'waiting' | 'found' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [pollStatus, setPollStatus] = useState<PollStatus>('waiting');
    const [copied, setCopied] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const orderId = searchParams.get('order_id');

    const uiStatus: 'loading' | 'success' | 'error' | 'pending' =
        pollStatus === 'completed' ? 'success' :
        pollStatus === 'failed' || pollStatus === 'cancelled' ? 'error' :
        pollStatus === 'timeout' ? 'pending' :
        'loading';

    const stepDone = [
        pollStatus !== 'waiting',
        pollStatus === 'completed' || pollStatus === 'failed' || pollStatus === 'cancelled',
        pollStatus === 'completed',
    ];

    useEffect(() => {
        const verify = async () => {
            if (!orderId) {
                setPollStatus('failed');
                setErrorMsg('No order ID found. Contact contact@italostudy.com');
                return;
            }
            try {
                let n = 0;
                const MAX = 20;

                const poll = async (): Promise<void> => {
                    n++;
                    setAttempts(n);

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
                        return;
                    }

                    if (pollStatus === 'waiting') setPollStatus('found');

                    if (txn.status === 'completed') {
                        setPollStatus('completed');
                        toast.success('Payment verified!');
                        return;
                    }

                    if (txn.status === 'failed') {
                        setPollStatus('failed');
                        setErrorMsg('Your payment was declined. Please try a different method.');
                        return;
                    }

                    if (txn.status === 'cancelled') {
                        setPollStatus('cancelled');
                        setErrorMsg('Payment was cancelled. You have not been charged.');
                        return;
                    }

                    if (n < MAX) {
                        setPollStatus('found');
                        await new Promise(r => setTimeout(r, 3000));
                        return poll();
                    }

                    setPollStatus('timeout');
                };

                await new Promise(r => setTimeout(r, 1500));
                await poll();
            } catch (err: any) {
                setPollStatus('failed');
                setErrorMsg(err.message || 'Verification failed. Please contact support.');
            }
        };
        verify();
    }, [orderId]);

    const copyId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const STEPS = ['Payment Received', 'Verifying with Provider', 'Order Confirmed'];

    return (
        <div className="h-screen overflow-hidden bg-[#0f172a] flex flex-col relative text-white">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm z-10">
                <img src="/logo.webp" alt="ItaloStudy" className="h-8 w-auto brightness-0 invert" />
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] font-semibold">Secure Checkout</span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-slate-900 rounded-[1.75rem] border border-white/5 shadow-2xl overflow-hidden">
                        <div className={`h-1 w-full transition-colors duration-700 ${
                            uiStatus === 'success' ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            : uiStatus === 'error'  ? 'bg-gradient-to-r from-rose-400 to-red-400'
                            : uiStatus === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                            : 'bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400'
                        }`} />

                        <div className="p-6 space-y-5">
                            <div className="text-center space-y-3">
                                <AnimatePresence mode="wait">
                                    {uiStatus === 'loading' && (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                                            <div className="relative w-16 h-16">
                                                <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
                                                <div className="absolute inset-1 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-300 border-b-transparent border-l-transparent animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Zap className="w-5 h-5 text-indigo-500" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'success' && (
                                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'error' && (
                                        <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                                <XCircle className="w-8 h-8 text-rose-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-1">
                                    <h1 className="text-xl font-black tracking-tight">
                                        {uiStatus === 'loading'  && 'Verifying Order…'}
                                        {uiStatus === 'success'  && 'Order Confirmed!'}
                                        {uiStatus === 'error'    && 'Verification Failed'}
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        {uiStatus === 'loading'  && 'Confirming with payment processor. Please wait…'}
                                        {uiStatus === 'success'  && 'Your downloads are now ready in My Orders.'}
                                        {uiStatus === 'error'    && (errorMsg || 'Something went wrong. Please try again.')}
                                    </p>
                                </div>
                            </div>

                            {(uiStatus === 'loading') && (
                                <div className="space-y-2 bg-white/5 p-4 rounded-2xl">
                                    {STEPS.map((step, i) => (
                                        <div key={step} className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black transition-all duration-500 ${
                                                stepDone[i] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'
                                            }`}>
                                                {stepDone[i] ? <Check className="w-3 h-3" /> : i + 1}
                                            </div>
                                            <span className={`text-xs font-bold ${stepDone[i] ? 'text-emerald-500' : 'text-slate-500'}`}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {orderId && (
                                <div className="bg-white/5 rounded-xl border border-white/5 px-3.5 py-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Order ID</span>
                                        <button onClick={copyId} className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-indigo-400 transition-colors font-semibold">
                                            {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 break-all">{orderId}</p>
                                </div>
                            )}

                            {uiStatus !== 'loading' && (
                                <button
                                    onClick={() => navigate(uiStatus === 'success' ? '/orders' : '/')}
                                    className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 group transition-all active:scale-[0.98] ${
                                        uiStatus === 'success' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 hover:bg-slate-600'
                                    }`}
                                >
                                    {uiStatus === 'success' ? <><Package className="w-4 h-4" />View My Orders</> : 'Back to Store'}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

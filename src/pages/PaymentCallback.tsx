import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XCircle, ArrowRight, ShieldCheck,
    Loader2, Copy, Check,
    Package, BookOpen,
    HelpCircle, Crown, ShoppingBag, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

type Stage = 'received' | 'verifying' | 'success' | 'failed';

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [stage, setStage] = useState<Stage>('received');
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const orderId    = searchParams.get('order_id');
    const paymentId  = searchParams.get('payment_id');
    const dodoStatus = searchParams.get('status');

    useEffect(() => {
        const run = async () => {
            if (dodoStatus && dodoStatus !== 'succeeded') {
                setErrorMsg(
                    dodoStatus === 'cancelled'
                        ? 'You cancelled the payment. No amount was charged.'
                        : 'Payment was declined by your bank or card issuer.'
                );
                setStage('failed');
                return;
            }

            await new Promise(r => setTimeout(r, 1500));
            setStage('verifying');

            try {
                if (!orderId) throw new Error('Order ID missing. Please contact support.');

                const { data, error } = await supabase.functions.invoke('verify-dodo-payment', {
                    body: { transaction_id: orderId, payment_id: paymentId, dodo_status: dodoStatus }
                });

                if (error) throw new Error(error.message || 'Verification service unavailable.');
                if (!data) throw new Error('Empty response from verification service.');
                if (data.error) throw new Error(data.error);

                if (data.success) {
                    // Try to finalize store order if we have a pending id
                    const pendingStoreOrderId = sessionStorage.getItem('dodo_pending_store_order_id');
                    if (pendingStoreOrderId) {
                        try {
                            const { error: finalizeErr } = await supabase.functions.invoke('finalize-store-order', {
                                body: { 
                                    store_order_id: pendingStoreOrderId, 
                                    payment_id: paymentId || orderId,
                                    gateway: 'dodo'
                                }
                            });
                            if (finalizeErr) console.error('finalize-store-order edge error:', finalizeErr);
                        } catch (finalizeException) {
                            console.error('finalize-store-order invoke error:', finalizeException);
                        }
                        sessionStorage.removeItem('dodo_pending_store_order_id');
                    }

                    setStage('success');
                    triggerConfetti();
                    // Clear the cart — for redirect-based gateways (Dodo/Cashfree)
                    // the CartOverlay's proceedToConfirm() never runs, so we clear here
                    try {
                        localStorage.setItem('italostudy_cart', '[]');
                        window.dispatchEvent(new Event('cart-updated'));
                    } catch { /* silent */ }
                } else {
                    throw new Error(data.message || 'Payment could not be confirmed.');
                }
            } catch (err: any) {
                setErrorMsg(err.message || 'We could not verify your payment automatically.');
                setStage('failed');
            }
        };
        run();
    }, [orderId, paymentId, dodoStatus]);

    const triggerConfetti = () => {
        const end = Date.now() + 2500;
        const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#4F46E5', '#10B981', '#F59E0B'] });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#4F46E5', '#10B981', '#F59E0B'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    };

    const copyOrderId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // progress: received=0, verifying=1, done=2
    const progressIndex = stage === 'failed' ? 2 : stage === 'success' ? 2 : stage === 'verifying' ? 1 : 0;

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden font-sans relative">
            {/* Ambient */}
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-3 z-10">
                <img src="/logo.webp" alt="ItaloStudy" className="h-7 w-auto" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Checkout</span>
                </div>
            </header>

            {/* Card */}
            <main className="flex-1 flex items-center justify-center px-4 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-white rounded-[2rem] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">

                        {/* 3-step progress bar */}
                        <div className="flex h-1 w-full bg-slate-100">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`flex-1 transition-all duration-700 ${
                                    i <= progressIndex
                                        ? stage === 'failed' && i === 2 ? 'bg-rose-500' : 'bg-indigo-600'
                                        : ''
                                }`} />
                            ))}
                        </div>

                        <div className="p-6">
                            <AnimatePresence mode="wait">

                                {/* Stage 1 — Received */}
                                {stage === 'received' && (
                                    <motion.div key="received"
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-4"
                                    >
                                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                            <ShoppingBag className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Payment Received!</h1>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed px-4">
                                                We've got your payment. Linking it to your account now...
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-indigo-600">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Processing</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stage 2 — Verifying */}
                                {stage === 'verifying' && (
                                    <motion.div key="verifying"
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-4"
                                    >
                                        <div className="relative w-16 h-16 mx-auto">
                                            <div className="absolute inset-0 rounded-full bg-indigo-50" />
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                className="absolute inset-0 rounded-full border-t-2 border-indigo-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <ShieldCheck className="w-8 h-8 text-indigo-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Verifying Payment</h1>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed px-4">
                                                Confirming with the payment provider. This takes just a moment.
                                            </p>
                                        </div>
                                        <div className="px-4 space-y-1">
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: '90%' }}
                                                    transition={{ duration: 8, ease: 'easeOut' }}
                                                    className="h-full bg-indigo-600 rounded-full"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security check in progress</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stage 3a — Success */}
                                {stage === 'success' && (
                                    <motion.div key="success"
                                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                                        className="text-center space-y-5"
                                    >
                                        <div className="relative w-16 h-16 mx-auto">
                                            <div className="w-16 h-16 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                                                <Crown className="w-8 h-8 text-white" />
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.6, 0.4] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute inset-0 bg-indigo-500 rounded-[1.25rem] -z-10"
                                            />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">You're all set! 🎉</h1>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                Payment confirmed. Head to your orders page to access your materials.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/orders')}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 group"
                                        >
                                            <Package className="w-4 h-4" />
                                            Go to My Orders
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </motion.div>
                                )}

                                {/* Stage 3b — Failed */}
                                {stage === 'failed' && (
                                    <motion.div key="failed"
                                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4"
                                    >
                                        <div className="text-center space-y-3">
                                            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                                                <XCircle className="w-7 h-7 text-rose-500" />
                                            </div>
                                            <div>
                                                <h1 className="text-xl font-black text-slate-900 tracking-tight">Payment Failed</h1>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed px-4">
                                                    {errorMsg || 'Your payment could not be processed.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Refund policy */}
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-wide mb-0.5">Refund Policy</p>
                                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                                    If any amount was deducted from your account, it will be <strong>automatically refunded within 3 business days</strong>. No action needed from your side.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Support */}
                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex gap-3">
                                            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                                Still have questions? Email us at{' '}
                                                <a href="mailto:contact@italostudy.com" className="font-black text-indigo-600 underline underline-offset-2">
                                                    contact@italostudy.com
                                                </a>{' '}
                                                with your Order ID and we'll resolve it immediately.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => navigate('/')}
                                                className="h-10 border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                                                Back to Store
                                            </button>
                                            <button onClick={() => window.history.back()}
                                                className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                                                Try Again
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Order ID */}
                            {orderId && (
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-center">
                                    <button onClick={copyOrderId}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors group">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Order: {orderId.slice(0, 13)}...
                                        </span>
                                        {copied
                                            ? <Check className="w-3 h-3 text-emerald-500" />
                                            : <Copy className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="shrink-0 py-3 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> ItaloStudy — Your Study Journey
                </p>
            </footer>
        </div>
    );
}

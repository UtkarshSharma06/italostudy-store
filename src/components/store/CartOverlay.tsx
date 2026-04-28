import { useState, useEffect } from 'react';
import {
    X, ShoppingBag, Trash2, Plus, Minus, ArrowRight,
    Monitor, CreditCard, Loader2, Check,
    MapPin, User, Smartphone, Home, Globe, ChevronRight, Tag, Zap, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrencyContext';


interface CartItem {
    id: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
    type: 'digital' | 'physical';
}

type Step = 'cart' | 'details' | 'confirm';

function getCart(): CartItem[] {
    try { return JSON.parse(localStorage.getItem('italostudy_cart') || '[]'); } catch { return []; }
}
function clearCart() {
    localStorage.setItem('italostudy_cart', '[]');
    window.dispatchEvent(new Event('cart-updated'));
}

export default function CartOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const { user, syncCart } = useAuth() as any;
    const { currency, formatPrice, getPaymentDetails } = useCurrency();

    const [cart,       setCart]       = useState<CartItem[]>([]);
    const [step,       setStep]       = useState<Step>('cart');
    const [isPlacing,  setIsPlacing]  = useState(false);
    const [orderId,    setOrderId]    = useState<string | null>(null);

    // Coupon state
    const [couponCode,    setCouponCode]    = useState('');
    const [isValidating,  setIsValidating]  = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

    // Shipping form
    const [name,    setName]    = useState('');
    const [phone,   setPhone]   = useState('');
    const [address, setAddress] = useState('');
    const [city,    setCity]    = useState('');
    const [pincode, setPincode] = useState('');
    const [country, setCountry] = useState('Italy');
    const [isAutoDetected, setIsAutoDetected] = useState(false);

    // Payment State — reads from store-admin's own config (system_settings → store_config)
    const [storeMode, setStoreMode] = useState<'beta' | 'live'>('beta');
    const [gateways, setGateways] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'razorpay' | 'paypal' | 'cashfree' | 'dodo' | 'beta'>('beta');
    // const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStorePaymentConfig();
        }
    }, [isOpen]);

    // Auto-detect country from currency hook
    useEffect(() => {
        if (currency.code === 'INR') {
            setCountry('India');
        } else if (currency.code === 'EUR' && (country === 'India' || !isAutoDetected)) {
            setCountry('Italy');
        }
        setIsAutoDetected(true);
    }, [currency.code]);

    const loadStorePaymentConfig = async () => {
        try {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'store_config')
                .maybeSingle();

            const storeConfig = data?.value as any;
            const mode = storeConfig?.mode || 'beta';
            setStoreMode(mode);

            if (mode === 'live') {
                // Fetch gateway details from the global payment config RPC
                const { data: gwData } = await (supabase as any).rpc('get_payment_config');
                if (gwData) {
                    // Filter: only show gateways enabled in BOTH global config AND store-admin config
                    const storeGateways = storeConfig?.gateways || {};
                    const filtered: any = {};
                    for (const key of ['stripe', 'razorpay', 'paypal', 'cashfree', 'dodo']) {
                        if (gwData[key]?.enabled && storeGateways[key]) {
                            filtered[key] = gwData[key];
                        }
                    }
                    setGateways(filtered);
                    loadPaymentScripts(filtered);

                    // Initial default based on Country
                    if (country === 'India') {
                        if (filtered.razorpay) setPaymentMethod('razorpay');
                        else if (filtered.cashfree) setPaymentMethod('cashfree');
                    } else {
                        if (filtered.dodo) setPaymentMethod('dodo');
                        else if (filtered.paypal) setPaymentMethod('paypal');
                        else if (filtered.stripe) setPaymentMethod('stripe');
                    }
                }
            } else {
                setGateways(null);
                setPaymentMethod('beta');
            }
        } catch (e) {
            console.error('Failed to load store payment config:', e);
            setPaymentMethod('beta');
        }
    };

    const loadPaymentScripts = (cfg?: any) => {
        const c = cfg || gateways;
        if (!c) return;

        if (c.razorpay?.enabled && !document.querySelector('script[src*="razorpay"]')) {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.async = true;
            document.body.appendChild(s);
        }
        if (c.stripe?.enabled && !document.querySelector('script[src*="stripe"]')) {
            const s = document.createElement('script');
            s.src = 'https://js.stripe.com/v3/';
            s.async = true;
            document.body.appendChild(s);
        }
        if (c.paypal?.enabled && !document.querySelector('script[src*="paypal.com/sdk/js"]')) {
            const s = document.createElement('script');
            s.src = `https://www.paypal.com/sdk/js?client-id=${c.paypal.client_id}&currency=EUR`;
            s.async = true;
            document.body.appendChild(s);
        }
        if (c.cashfree?.enabled && !document.querySelector('script[src*="cashfree.com/js/v3/cashfree.js"]')) {
            const s = document.createElement('script');
            s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            s.async = true;
            document.body.appendChild(s);
        }
    };

    useEffect(() => {
        const load = () => {
            const c = getCart();
            setCart(c);
        };
        load();
        window.addEventListener('cart-updated', load);
        return () => window.removeEventListener('cart-updated', load);
    }, []);

    // Reset step when closed
    useEffect(() => {
        if (!isOpen) setTimeout(() => { 
            setStep('cart'); 
            setOrderId(null); 
            setAppliedCoupon(null);
            setCouponCode('');
        }, 400);
    }, [isOpen]);

    const updateQuantity = (id: string, delta: number) => {
        const updated = cart.map(item =>
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        );
        setCart(updated);
        localStorage.setItem('italostudy_cart', JSON.stringify(updated));
        
        if (user) {
            syncCart(updated);
        } else {
            window.dispatchEvent(new Event('cart-updated'));
        }
    };

    const removeItem = (id: string) => {
        const updated = cart.filter(item => item.id !== id);
        setCart(updated);
        localStorage.setItem('italostudy_cart', JSON.stringify(updated));

        if (user) {
            syncCart(updated);
        } else {
            window.dispatchEvent(new Event('cart-updated'));
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Convert subtotal to regional details
    // const regionalSubtotal = getPaymentDetails(subtotal);
    
    const taxRate = 0.18; 
    const taxAmount = subtotal * taxRate;
    // const regionalTax = getPaymentDetails(taxAmount);

    const discountAmount = appliedCoupon 
        ? (appliedCoupon.discount_type === 'percent' 
            ? (subtotal * (appliedCoupon.discount_value / 100)) 
            : appliedCoupon.discount_value)
        : 0;
    // const regionalDiscount = getPaymentDetails(discountAmount);

    const total = subtotal + taxAmount - discountAmount;
    const regionalTotal = getPaymentDetails(total);
    const hasPhysical = cart.some(i => i.type === 'physical');

    // ── Coupon Validation ──────────────────────────────────
    const validateCoupon = async () => {
        if (!couponCode) return;
        setIsValidating(true);
        try {
            const { data, error } = await (supabase
                .from('store_coupons' as any) as any)
                .select('*')
                .eq('code', couponCode.toUpperCase().trim())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                toast.error('Invalid or expired coupon code.');
                setAppliedCoupon(null);
            } else if (data.min_order_amount > subtotal) {
                toast.error(`Min order of ${formatPrice(data.min_order_amount)} required for this coupon.`);
                setAppliedCoupon(null);
            } else {
                setAppliedCoupon(data);
                toast.success('Coupon applied! 🎉');
            }
        } catch (err) {
            toast.error('Validation failed.');
        } finally {
            setIsValidating(false);
        }
    };

    // ── Place Order ──────────────────────────────────────
    const placeOrder = async () => {
        if (!user) { onClose(); navigate('/auth'); return; }
        setIsPlacing(true);

        const shippingAddress = hasPhysical
            ? { name, phone, address, city, pincode, country }
            : {};

        // 1. Create Order
        const { data: orderData, error: orderErr } = await (supabase
            .from('store_orders' as any) as any)
            .insert({
                user_id: user.id,
                subtotal: subtotal,
                tax_amount: taxAmount,
                discount_amount: discountAmount,
                total_amount: total,
                regional_amount: regionalTotal.amount,
                regional_currency: regionalTotal.currency,
                coupon_id: appliedCoupon?.id || null,
                currency: 'EUR',
                status: storeMode === 'beta' ? 'paid' : 'pending',
                payment_method: paymentMethod.toUpperCase(),
                shipping_address: shippingAddress,
            })
            .select()
            .single();

        if (orderErr) {
            console.error('Order Error:', orderErr);
            toast.error('Failed to place order: ' + orderErr.message);
            setIsPlacing(false);
            return;
        }

        // 2. Insert Order Items
        const items = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            unit_tax_amount: item.price * taxRate,
            total_tax_amount: (item.price * item.quantity) * taxRate,
        }));

        const { error: itemsErr } = await (supabase
            .from('store_order_items' as any) as any)
            .insert(items);

        if (itemsErr) {
            toast.error('Order created but items failed. Contact support.');
            setIsPlacing(false);
            return;
        }

        // 3. Handle Live Payment
        if (storeMode === 'live') {
            if (paymentMethod === 'razorpay') {
                const inrDetails = getPaymentDetails(total, 'INR');
                await handleRazorpay(orderData.id, inrDetails.amount, inrDetails.currency);
            } else if (paymentMethod === 'paypal') {
                toast.error('PayPal checkout requires a configured payment link. Please use Razorpay, Dodo, or Cashfree.');
                setIsPlacing(false);
                return;
            } else if (paymentMethod === 'cashfree') {
                const inrDetails = getPaymentDetails(total, 'INR');
                handleCashfree(orderData.id, inrDetails.amount, inrDetails.currency);
            } else if (paymentMethod === 'dodo') {
                handleDodoPayment(orderData.id, regionalTotal.amount, regionalTotal.currency);
            } else {
                await handleStripe(orderData.id, regionalTotal.amount, regionalTotal.currency);
            }
            return;
        }

        // 4. Success (Beta)
        proceedToConfirm(orderData.id);
    };

    const handleRazorpay = async (orderId: string, amount: number, currencyCode: string) => {
        try {
            const { data: configData } = await (supabase as any).rpc('get_payment_config');
            if (!configData?.razorpay?.key_id) throw new Error('Razorpay not configured');

            const options = {
                key: configData.razorpay.key_id,
                amount: Math.round(amount * 100),
                currency: currencyCode,
                name: 'Italostudy Store',
                description: `Order #${orderId.substring(0, 8)}`,
                handler: async (response: any) => {
                    await finalizeOrder(orderId, response.razorpay_payment_id);
                },
                modal: { ondismiss: () => setIsPlacing(false) },
                theme: { color: '#4F46E5' }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (e: any) {
            toast.error(e.message || 'Razorpay initialization failed');
            setIsPlacing(false);
        }
    };

    const handleStripe = async (_orderId: string, _amount: number, _currencyCode: string) => {
        try {
            if (!gateways?.stripe?.public_key) throw new Error('Stripe is not configured');

            // Stripe requires server-side session creation (Secret Key).
            // The public_key alone cannot process a payment.
            // Disable Stripe in the Store Admin Panel until server-side is set up.
            throw new Error(
                'Stripe checkout requires server-side setup. Please use another payment method or contact support.'
            );
        } catch (e: any) {
            toast.error(e.message || 'Stripe failed');
            setIsPlacing(false);
        }
    };

    const handleCashfree = async (orderId: string, amount: number, currencyCode: string) => {
        setIsPlacing(true);
        try {
            // 1. Create a "shadow" transaction in the transactions table
            const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_cashfree_order', {
                p_amount: amount,
                p_currency: currencyCode,
                p_plan_id: 'STORE_ORDER',
                p_duration_value: 1,
                p_duration_unit: 'months'
            });

            if (rpcError) throw rpcError;
            if (rpcData.error) throw new Error(rpcData.error);
            
            const transactionId = rpcData.transaction_id;

            // 2. Invoke Edge Function — pass storeOrderId so it gets saved to transactions.metadata
            const { data: edgeData, error: edgeError } = await (supabase as any).functions.invoke('create-cashfree-order', {
                body: {
                    transactionId: transactionId,
                    amount: amount,
                    currency: currencyCode,
                    customerPhone: phone,
                    storeOrderId: orderId  // ← critical: links the store_order to this transaction
                }
            });

            if (edgeError) throw edgeError;
            if (edgeData.error) throw new Error(edgeData.error);
            if (!edgeData.checkout_url) throw new Error('Invalid Cashfree session');

            window.location.href = edgeData.checkout_url;
        } catch (err: any) {
            console.error('Cashfree error:', err);
            toast.error(err?.message || 'Failed to initialize Cashfree Payments');
            setIsPlacing(false);
        }
    };

    const handleDodoPayment = async (orderId: string, amount: number, currencyCode: string) => {
        setIsPlacing(true);
        try {
            // 1. Create a "shadow" transaction in the transactions table (required by Dodo Edge Function)
            const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_dodo_order', {
                p_amount: amount,
                p_currency: currencyCode,
                p_plan_id: 'STORE_ORDER',
                p_duration_value: 1,
                p_duration_unit: 'months'
            });

            if (rpcError) throw rpcError;
            if (rpcData.error) throw new Error(rpcData.error);
            
            const transactionId = rpcData.transaction_id;

            // 2. Invoke Edge Function with the EXACT body expected (same as CheckoutModal)
            const { data: edgeData, error: edgeError } = await (supabase as any).functions.invoke('create-dodo-order', {
                body: {
                    transactionId: transactionId,
                    amount: amount,
                    currency: currencyCode,
                    storeOrderId: orderId
                }
            });

            if (edgeError) throw edgeError;
            if (edgeData.error) throw new Error(edgeData.error);
            if (!edgeData.checkout_url) throw new Error('Invalid Dodo session');

            window.location.href = edgeData.checkout_url;
        } catch (err: any) {
            console.error('Dodo error:', err);
            // Log full error object to help debug 400
            if (err.context && err.context.json) {
                try {
                    const ctx = await err.context.json();
                    console.error('Dodo Error Context:', ctx);
                    toast.error(`Dodo Error: ${ctx.error || 'Check Console'}`);
                } catch (e) {
                    toast.error(err?.message || 'Failed to initialize Dodo Payments');
                }
            } else {
                toast.error(err?.message || 'Failed to initialize Dodo Payments');
            }
            setIsPlacing(false);
        }
    };

    const finalizeOrder = async (orderId: string, txnId: string, gateway = 'razorpay') => {
        // Use the finalize-store-order edge function (service role) to bypass RLS
        // Direct DB update from the browser is blocked because store_orders has no UPDATE policy for users
        const { data, error } = await supabase.functions.invoke('finalize-store-order', {
            body: { store_order_id: orderId, payment_id: txnId, gateway }
        });

        if (error) {
            console.error('finalize-store-order edge error:', error);
            toast.error('Order payment recorded but status update failed. Contact support with Order ID: ' + orderId.substring(0, 8));
        } else if (data?.error) {
            console.error('finalize-store-order returned error:', data.error);
            toast.error('Order update failed: ' + data.error);
        }

        // Always proceed to confirm — the webhook will also update eventually
        proceedToConfirm(orderId);
    };

    const proceedToConfirm = (id: string) => {
        setOrderId(id);
        clearCart();
        setCart([]);
        setStep('confirm');
        setIsPlacing(false);
        toast.success('Order placed successfully! 🚀');
    };

    const canProceed = !hasPhysical || (name.trim() && address.trim() && city.trim() && pincode.trim());

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="w-5 h-5 text-[#0f172a]" />
                                <h2 className="text-base font-black text-[#0f172a] tracking-tight">
                                    {step === 'cart' && 'Your Bag'}
                                    {step === 'details' && 'Secure Checkout'}
                                    {step === 'confirm' && 'Order Placed!'}
                                </h2>
                                {step === 'cart' && cart.length > 0 && (
                                    <span className="bg-[#0f172a] text-[10px] font-black px-2 py-0.5 rounded-full text-white">{cart.length}</span>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Step indicator */}
                        {step !== 'confirm' && cart.length > 0 && (
                            <div className="px-6 py-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-b border-slate-50 shrink-0">
                                <span className={cn(step === 'cart' ? 'text-indigo-600' : 'text-slate-400')}>1. Bag</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <span className={cn(step === 'details' ? 'text-indigo-600' : 'text-slate-400')}>2. Checkout Details</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <span className="text-slate-400">3. Done</span>
                            </div>
                        )}

                        {/* ── STEP: CART ─────────────────────────────── */}
                        {step === 'cart' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                                            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center">
                                                <ShoppingBag className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-slate-400 font-bold">Your bag is empty.</p>
                                            <button onClick={onClose} className="h-10 px-6 rounded-xl bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest">
                                                Browse Products
                                            </button>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.id} className="flex gap-4 group bg-slate-50/50 hover:bg-white border hover:border-indigo-100 transition-all rounded-2xl p-3">
                                                <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-100">
                                                    <img src={item.image || `https://placehold.co/80x80/f1f5f9/0f172a?text=P`} alt={item.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-xs font-black text-[#0f172a] leading-tight line-clamp-2">{item.title}</h4>
                                                        <button onClick={() => removeItem(item.id)} className="shrink-0 p-1 text-slate-400 hover:text-rose-500 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="flex items-center bg-white rounded-lg border border-slate-100 p-0.5">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-50 rounded-md transition-colors"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-7 text-center text-xs font-black">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-50 rounded-md transition-colors"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <span className="text-sm font-black text-[#0f172a]">{formatPrice(item.price * item.quantity)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {cart.length > 0 && (
                                    <div className="p-6 border-t border-slate-100 space-y-4 shrink-0 bg-white">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total</span>
                                            <span className="text-2xl font-black text-[#0f172a]">{formatPrice(subtotal)}</span>
                                        </div>
                                        <button
                                            onClick={() => setStep('details')}
                                            className="w-full h-14 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                                        >
                                            Checkout Now
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── STEP: DETAILS ──────────────────────────── */}
                        {step === 'details' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Detailed Breakdown */}
                                    <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Final Breakdown</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-semibold text-slate-400">
                                                <span>Subtotal</span>
                                                <span className="text-white">{formatPrice(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-400">
                                                <span>Tax (GST 18%)</span>
                                                <span className="text-white">{formatPrice(taxAmount)}</span>
                                            </div>
                                            {appliedCoupon && (
                                                <div className="flex justify-between text-xs font-bold text-emerald-400">
                                                    <span>Coupon Discount ({appliedCoupon.code})</span>
                                                    <span>- {formatPrice(discountAmount)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center">
                                                <span className="font-black uppercase tracking-widest text-[11px]">Grand Total</span>
                                                <span className="text-2xl font-black text-white">{formatPrice(total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coupon Input */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Have a Coupon?</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                <input
                                                    placeholder="Enter code..."
                                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-100 font-black uppercase focus:ring-2 focus:ring-indigo-600 transition-all"
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                    disabled={!!appliedCoupon}
                                                />
                                            </div>
                                            <button
                                                onClick={appliedCoupon ? () => setAppliedCoupon(null) : validateCoupon}
                                                disabled={isValidating || (!couponCode && !appliedCoupon)}
                                                className={cn(
                                                    "h-12 px-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
                                                    appliedCoupon 
                                                        ? "bg-rose-50 text-rose-500 hover:bg-rose-100" 
                                                        : "bg-[#0f172a] text-white hover:bg-slate-800"
                                                )}
                                            >
                                                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : (appliedCoupon ? 'Remove' : 'Apply')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Safety & Delivery Notice (Digital only) */}
                                    {cart.some(i => i.type === 'digital') && (
                                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Secure Digital Delivery</p>
                                            </div>
                                            <p className="text-[11px] text-amber-700 leading-relaxed font-bold">
                                                To prevent piracy, download links are valid for 1 hour. You can generate a new link anytime from your orders dashboard. Note: Digital products are non-refundable once accessed.
                                            </p>
                                        </div>
                                    )}

                                    {/* Shipping form (only if physical items) */}
                                    {hasPhysical ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                        <MapPin className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Delivery Information</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">Where should we ship your order?</p>
                                                    </div>
                                                </div>
                                                <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Shipping</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Contact Group */}
                                                <div className="space-y-2.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Primary Contact</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="relative group">
                                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input 
                                                                value={name} 
                                                                onChange={e => setName(e.target.value)} 
                                                                placeholder="Full Name *" 
                                                                className="w-full h-11 md:h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                            />
                                                        </div>
                                                        <div className="relative group">
                                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input 
                                                                value={phone} 
                                                                onChange={e => setPhone(e.target.value)} 
                                                                type="tel" 
                                                                placeholder="Phone Number *" 
                                                                className="w-full h-11 md:h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Address Group */}
                                                <div className="space-y-2.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Shipping Address</label>
                                                    <div className="space-y-3">
                                                        <div className="relative group">
                                                            <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input 
                                                                value={address} 
                                                                onChange={e => setAddress(e.target.value)} 
                                                                placeholder="Street Address *" 
                                                                className="w-full h-11 md:h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            <input 
                                                                value={city} 
                                                                onChange={e => setCity(e.target.value)} 
                                                                placeholder="City *" 
                                                                className="w-full h-11 md:h-12 px-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                            />
                                                            <input 
                                                                value={pincode} 
                                                                onChange={e => setPincode(e.target.value)} 
                                                                placeholder="Pincode *" 
                                                                className="w-full h-11 md:h-12 px-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none" 
                                                            />
                                                            <div className="relative group col-span-2 md:col-span-1">
                                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                                <select 
                                                                    value={country} 
                                                                    onChange={e => {
                                                                        const c = e.target.value;
                                                                        setCountry(c);
                                                                        // Auto-switch payment method when country changes
                                                                        if (c === 'India') {
                                                                            if (gateways?.razorpay) setPaymentMethod('razorpay');
                                                                            else if (gateways?.cashfree) setPaymentMethod('cashfree');
                                                                        } else {
                                                                            if (gateways?.dodo) setPaymentMethod('dodo');
                                                                            else if (gateways?.paypal) setPaymentMethod('paypal');
                                                                            else if (gateways?.stripe) setPaymentMethod('stripe');
                                                                        }
                                                                    }} 
                                                                    className="w-full h-11 md:h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-transparent text-xs font-bold focus:bg-white focus:border-indigo-100 transition-all outline-none appearance-none"
                                                                >
                                                                    <option>Italy</option>
                                                                    <option>India</option>
                                                                    <option>United Kingdom</option>
                                                                    <option>Germany</option>
                                                                    <option>France</option>
                                                                    <option>Other</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-amber-200/50 flex items-center justify-center shrink-0 mt-0.5">
                                                        <span className="text-[10px] font-black text-amber-700">!</span>
                                                    </div>
                                                    <p className="text-[10px] text-amber-800 leading-relaxed font-bold">
                                                        Please ensure your address details are correct. <strong>Physical orders</strong> are typically processed within 24-48 hours.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0">
                                                <Monitor className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-indigo-900">Instant Digital Access</p>
                                                <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed font-medium">Your resources will be available for instant download in the "My Orders" tab immediately after purchase.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Method (Conditional) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Payment Method</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                    {storeMode === 'beta' ? 'Beta mode: All orders are currently free' : 
                                                     (paymentMethod === 'razorpay' || paymentMethod === 'cashfree') ? `Processing in INR (${formatPrice(total, 'EUR', 'INR')}) for UPI support` : 
                                                     'Secure and encrypted transaction'}
                                                </p>
                                            </div>
                                        </div>

                                        {storeMode === 'live' && gateways ? (
                                            <div className="space-y-6">
                                                {/* Global Payment Methods */}
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Global Payment Methods</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {gateways.dodo?.enabled && (
                                                            <button
                                                                onClick={() => setPaymentMethod('dodo')}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-center justify-center gap-3",
                                                                    paymentMethod === 'dodo' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <img src="/payments/dodopayments.webp" alt="Dodo Payments" className="h-6 w-auto object-contain" />
                                                                <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-60">
                                                                    <img src="/payments/stripe.webp" alt="Stripe" className="h-3 w-auto" />
                                                                    <img src="/payments/googlepay.webp" alt="GPay" className="h-3 w-auto" />
                                                                    <img src="/payments/applepay.webp" alt="Apple Pay" className="h-3 w-auto" />
                                                                    <img src="/payments/cashapp.webp" alt="CashApp" className="h-3 w-auto" />
                                                                    <img src="/payments/ideal.webp" alt="iDEAL" className="h-3 w-auto" />
                                                                    <img src="/payments/pix.webp" alt="Pix" className="h-3 w-auto" />
                                                                </div>
                                                            </button>
                                                        )}
                                                        {gateways.paypal?.enabled && (
                                                            <button
                                                                onClick={() => setPaymentMethod('paypal')}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-center",
                                                                    paymentMethod === 'paypal' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <img src="/payments/paypal.webp" alt="PayPal" className="h-6 w-auto object-contain" />
                                                            </button>
                                                        )}
                                                        {gateways.stripe?.enabled && (
                                                            <button
                                                                onClick={() => setPaymentMethod('stripe')}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all text-left",
                                                                    paymentMethod === 'stripe' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
                                                                    <CreditCard className="w-4 h-4 text-indigo-600" />
                                                                </div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Stripe</p>
                                                                <p className="text-[9px] text-slate-400 font-bold">Cards / Global</p>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* India Payment Methods */}
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">India Payment Methods</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {gateways.razorpay?.enabled && (
                                                            <button
                                                                onClick={() => setPaymentMethod('razorpay')}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-center justify-center gap-3",
                                                                    paymentMethod === 'razorpay' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <img src="/payments/razorpay.webp" alt="Razorpay" className="h-6 w-auto object-contain" />
                                                                <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto opacity-70" />
                                                            </button>
                                                        )}
                                                        {gateways.cashfree?.enabled && (
                                                            <button
                                                                onClick={() => setPaymentMethod('cashfree')}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-center justify-center gap-3",
                                                                    paymentMethod === 'cashfree' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <img src="/payments/cashfree.webp" alt="Cashfree" className="h-6 w-auto object-contain" />
                                                                <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto opacity-70" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : storeMode === 'live' ? (
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <p className="text-[10px] text-emerald-800 font-black uppercase tracking-widest">
                                                    Beta Active: No Payment Required
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>


                                <div className="p-6 border-t border-slate-100 space-y-3 shrink-0 bg-white">
                                    <button
                                        onClick={placeOrder}
                                        disabled={isPlacing || !canProceed}
                                        className={cn(
                                            "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl",
                                            isPlacing || !canProceed
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                                : "bg-[#0f172a] hover:bg-slate-800 text-white shadow-indigo-100"
                                        )}
                                    >
                                        {isPlacing ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
                                        ) : (
                                            <>Place Order · {formatPrice(total)}</>
                                        )}
                                    </button>
                                    <button onClick={() => setStep('cart')} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#0f172a] hover:underline transition-all">
                                        ← Return to Cart
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── STEP: CONFIRMED ──────────────────────────── */}
                        {step === 'confirm' && (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-8">
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
                                    className="w-24 h-24 rounded-[2.5rem] bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center shadow-2xl shadow-emerald-200"
                                >
                                    <Check className="w-12 h-12 text-emerald-500" strokeWidth={3} />
                                </motion.div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-[#0f172a] tracking-tight">Order Successful!</h3>
                                    {orderId && (
                                        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">
                                                ID: #{orderId.split('-')[0].toUpperCase()}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] mx-auto">
                                        {hasPhysical
                                            ? 'Thank you! We are processing your order. You can track your shipment details in My Orders.'
                                            : 'Done! Your digital assets are now ready for download in your dashboard.'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                    <button
                                        onClick={() => { onClose(); navigate('/store/orders'); }}
                                        className="w-full h-14 rounded-2xl bg-[#0f172a] text-white font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                                    >
                                        View My Orders
                                    </button>
                                    <button
                                        onClick={() => { onClose(); navigate('/store'); }}
                                        className="w-full h-12 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-colors"
                                    >
                                        Marketplace
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

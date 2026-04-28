import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
    ShoppingBag, Check, ShieldCheck,
    Truck, Globe, ChevronRight,
    LogIn, Package, Zap, BadgeCheck, ClipboardList,
    Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import CartOverlay from '@/components/store/CartOverlay';
import { StoreDetailSkeleton } from '@/components/SkeletonLoader';
import { useCurrency } from '@/hooks/useCurrencyContext';

interface Product {
    id: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    discount_price: number | null;
    type: 'digital' | 'physical';
    images: string[];
    category_id: string | null;
    is_bundle?: boolean;
    bundle_items?: string[];
}

function getCart() {
    try { return JSON.parse(localStorage.getItem('italostudy_cart') || '[]'); } catch { return []; }
}

export default function ProductDetail({ isMobileView: _isMobileView = false }: { isMobileView?: boolean }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, session, syncCart } = useAuth() as any;
    const { formatPrice } = useCurrency();

    const [product,      setProduct]      = useState<Product | null>(null);
    const [isLoading,    setIsLoading]    = useState(true);
    const [isCartOpen,   setIsCartOpen]   = useState(false);
    const [activeImage,  setActiveImage]  = useState(0);
    const [addedToCart,  setAddedToCart]  = useState(false);
    const [cartCount,    setCartCount]    = useState(0);

    const refreshCartCount = useCallback(() => {
        setCartCount(getCart().reduce((s: number, i: any) => s + i.quantity, 0));
    }, []);
    useEffect(() => {
        refreshCartCount();
        window.addEventListener('cart-updated', refreshCartCount);
        return () => window.removeEventListener('cart-updated', refreshCartCount);
    }, [refreshCartCount]);

    useEffect(() => { fetchProduct(); }, [slug]);

    const fetchProduct = async () => {
        setIsLoading(true);
        const { data, error } = await (supabase
            .from('store_products' as any) as any)
            .select('*')
            .eq('slug', slug)
            .single();
        if (error) navigate('/');
        else setProduct(data as any);
        setIsLoading(false);
    };

    const handleAddToCart = () => {
        if (!product) return;
        const cart = getCart();
        const existing = cart.find((i: any) => i.id === product.id);
        const updated = [...cart];
        
        if (existing) {
            const idx = updated.findIndex((i: any) => i.id === product.id);
            updated[idx].quantity += 1;
        } else {
            updated.push({ 
                id: product.id, 
                title: product.title, 
                price: product.price, 
                image: product.images?.[0] || '', 
                quantity: 1, 
                type: product.type 
            });
        }

        if (user) {
            syncCart(updated);
        } else {
            localStorage.setItem('italostudy_cart', JSON.stringify(updated));
            window.dispatchEvent(new Event('cart-updated'));
        }

        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const discountPct = product?.discount_price && product.price < product.discount_price
        ? Math.round((1 - product.price / product.discount_price) * 100) : null;

    // ── Loading skeleton ──────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen bg-[#f7f8fa] flex flex-col">
            <StoreHeader user={user} session={session} cartCount={cartCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} navigate={navigate} />
            <StoreDetailSkeleton />
            <StoreFooter />
        </div>
    );

    if (!product) return null;

    return (
        <div className="min-h-screen bg-[#f7f8fa] flex flex-col font-sans">
            <StoreHeader user={user} session={session} cartCount={cartCount} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} navigate={navigate} />

            {/* Breadcrumb */}
            <div className="bg-white border-b border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 h-9 text-[11px] font-semibold text-slate-400">
                        <Link to="/" className="hover:text-[#0f172a] transition-colors">Store</Link>
                        <ChevronRight className="w-3 h-3" />
                        <Link to="/products" className="hover:text-[#0f172a] transition-colors">All Products</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[#0f172a] font-black truncate max-w-[200px]">{product.title}</span>
                    </div>
                </div>

            {/* ── Main product layout ──────────────────────────── */}
            <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

                    {/* ── Left: Image Gallery ──────────────────────── */}
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm aspect-[4/3] md:aspect-square lg:aspect-[4/3]"
                        >
                            <img
                                src={product.images?.[activeImage] || `https://placehold.co/800x600/f1f5f9/0f172a?text=${encodeURIComponent(product.title.slice(0, 12))}`}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                            {/* Type badge */}
                            <div className={cn(
                                "absolute top-3 left-3 md:top-4 md:left-4 flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border",
                                product.type === 'digital'
                                    ? "bg-[#0f172a] text-white border-transparent"
                                    : "bg-white text-slate-700 border-slate-200"
                            )}>
                                {product.type === 'digital'
                                    ? <><Monitor className="w-3 h-3" /> Digital</>
                                    : <><Package className="w-3 h-3" /> Physical</>
                                }
                            </div>
                            {/* Discount badge */}
                            {discountPct && (
                                <div className="absolute top-3 right-3 md:top-4 md:right-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 flex items-center justify-center">
                                    <span className="text-white text-[9px] md:text-[10px] font-black leading-tight text-center">-{discountPct}%</span>
                                </div>
                            )}
                        </motion.div>

                        {/* Thumbnail strip */}
                        {product.images?.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto scrollbar-none">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(idx)}
                                        className={cn(
                                            "w-20 h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all",
                                            activeImage === idx ? "border-[#0f172a] shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Trust badges */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: ShieldCheck, label: 'Official Resource', detail: 'Verified by Italostudy' },
                                { icon: product.type === 'digital' ? Zap : Truck, label: product.type === 'digital' ? 'Instant Access' : 'Ships Worldwide', detail: product.type === 'digital' ? 'Immediate unlock' : 'Express delivery' },
                                { icon: Globe, label: 'IT / EN Support', detail: 'Bilingual team' },
                                { icon: BadgeCheck, label: '5,000+ Students', detail: 'Trust Italostudy' },
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[#0f172a] shrink-0">
                                        <f.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">{f.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{f.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Right: Product Info ──────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="flex flex-col gap-7"
                    >
                        {/* Title & price */}
                        <div className="space-y-3 md:space-y-4">
                            <h1 className="text-xl md:text-3xl font-black text-[#0f172a] leading-tight md:leading-snug tracking-tight">
                                {product.title}
                            </h1>

                            <div className="flex items-center gap-2.5 md:gap-3 flex-wrap">
                                <span className="text-2xl md:text-3xl font-black text-[#0f172a]">{formatPrice(product.price)}</span>
                                {product.discount_price && (
                                    <span className="text-base md:text-lg text-slate-400 line-through font-medium">{formatPrice(product.discount_price)}</span>
                                )}
                                {discountPct && (
                                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                                        Save {discountPct}%
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                                    ✓ In Stock
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100" />

                        {/* Description */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About this product</p>
                            <p className="text-slate-600 leading-relaxed font-medium text-sm">
                                {product.description || 'Premium Italostudy resource. Meticulously crafted to give you the best preparation material for your exam.'}
                            </p>
                        </div>

                        {/* What's included */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What's included</p>
                            <div className="space-y-2.5">
                                {[
                                    product.type === 'digital' ? 'Instant PDF / digital access after checkout' : 'Shipped in protective packaging worldwide',
                                    'Detailed explanations for every topic',
                                    'Practice questions with worked solutions',
                                    'Aligned to the latest official syllabus',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <span className="text-sm text-slate-600 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bundle Items (if applicable) */}
                        {product.is_bundle && product.bundle_items && product.bundle_items.length > 0 && (
                            <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-600" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">This bundle includes</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <p className="text-sm text-slate-700 font-bold">
                                        {product.bundle_items.length} premium resources included
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        You will receive instant access to all items in this pack after checkout.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Digital Delivery & Refund Policy */}
                        {product.type === 'digital' && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#0f172a]" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Secure Digital Access</p>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    <strong className="text-slate-700">1-Hour Download Window:</strong> To prevent piracy, download links are valid for 1 hour after generation. You can always generate a new link from your dashboard.
                                </p>
                                <div className="h-px bg-slate-200/50" />
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                                    Digital products are non-refundable once accessed.
                                </p>
                            </div>
                        )}

                        {/* CTA buttons */}
                        <div className="space-y-2.5 md:space-y-3 pt-1">
                            <button
                                onClick={handleAddToCart}
                                className={cn(
                                    "w-full h-12 md:h-14 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
                                    addedToCart
                                        ? "bg-emerald-500 text-white"
                                        : "bg-[#0f172a] hover:bg-slate-800 text-white shadow-lg"
                                )}
                            >
                                {addedToCart ? (
                                    <><Check className="w-5 h-5" /> Added!</>
                                ) : (
                                    <><ShoppingBag className="w-5 h-5" /> Add to Cart — {formatPrice(product.price)}</>
                                )}
                            </button>

                            <button
                                onClick={() => { handleAddToCart(); setIsCartOpen(true); }}
                                className="w-full h-11 md:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs border-2 border-[#0f172a] text-[#0f172a] hover:bg-[#0f172a] hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                Buy Now →
                            </button>

                            <p className="text-center text-[9px] md:text-[10px] text-slate-400 font-medium">
                                🔒 Secure checkout · SSL encrypted · Stripe payments
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* ── Social proof / bottom strip ─────────────────── */}
                <div className="mt-16 bg-[#0f172a] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Italostudy Promise</p>
                        <h3 className="text-white text-xl md:text-2xl font-black leading-snug">
                            Join 5,000+ students who<br className="hidden md:block" /> trust our resources.
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">
                            92% of students who used our exam kits improved their scores by at least 15 points.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <button
                            onClick={handleAddToCart}
                            className="h-12 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            <ShoppingBag className="w-4 h-4" /> Get This Resource
                        </button>
                        <Link to="/products"
                            className="h-12 px-6 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2">
                            Browse More →
                        </Link>
                    </div>
                </div>
            </div>

            <StoreFooter />
            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}

// ── Shared Store Header (matches Store.tsx) ───────────────
function StoreHeader({ user, session, cartCount, isCartOpen: _isCartOpen, setIsCartOpen, navigate }: {
    user: any; session: any; cartCount: number; isCartOpen: boolean;
    setIsCartOpen: (v: boolean) => void; navigate: ReturnType<typeof useNavigate>;
}) {
    return (
        <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm shrink-0">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <img src="/logo.webp" alt="Italostudy" className="h-8 md:h-9 w-auto object-contain" loading="eager" />
                    <div className="hidden sm:flex items-center gap-1.5">
                        <div className="w-px h-5 bg-slate-200" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Store</span>
                    </div>
                </Link>

                <div className="flex-1" />

                <div className="flex items-center gap-3 shrink-0">
                    <Link to="/store/products"
                        className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors">
                        <Package className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">All Products</span>
                    </Link>

                    {user && (
                        <button onClick={() => navigate('/orders')}
                            className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors">
                            <ClipboardList className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">My Orders</span>
                        </button>
                    )}

                    <button onClick={() => setIsCartOpen(true)}
                        className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors relative">
                        <div className="relative">
                            <ShoppingBag className="w-5 h-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </div>
                        <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">My Bag</span>
                    </button>

                    {user ? (
                        <button onClick={() => {
                            const url = session 
                                ? `https://app.italostudy.com/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=signup`
                                : 'https://app.italostudy.com';
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                            className="hidden md:flex h-9 px-4 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors">
                            Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                sessionStorage.setItem('post_login_redirect', window.location.pathname);
                                navigate('/auth');
                            }}
                            className="flex items-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="hidden sm:inline">Login</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

function StoreFooter() {
    return (
        <footer className="bg-[#0f172a] border-t border-slate-800 mt-10">
            <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo.webp" alt="Italostudy" className="h-7 brightness-0 invert opacity-80" />
                        <div className="w-px h-4 bg-slate-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Store</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        © {new Date().getFullYear()} Italostudy · All rights reserved
                    </p>
                    <Link to="/" className="text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors">
                        ← Back to Italostudy
                    </Link>
                </div>

                {/* Payment Logos */}
                <div className="flex flex-wrap justify-center items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                    {/* Visa */}
                    <svg className="h-4 w-auto text-white" viewBox="0 0 100 32" fill="currentColor">
                        <path d="M40.1 1.1h-6.2L28.1 19.3l-2.6-13.8c-.3-1.4-1.3-2.3-2.6-2.3H11.7l-.2.9c2.3.5 4.8 1.4 6.4 2.3.9.5 1.2.9 1.4 1.8l4.8 18.5h6.3l9.7-25.6zm15.1 17.5c0-2.4 3.3-2.7 3.3-3.9 0-.4-.3-.7-.9-.7-1.4 0-2.6.4-3.7 1.1l-.7-.9c1.1-.9 2.7-1.5 4.4-1.5 2.8 0 4.7 1.4 4.7 3.7 0 4.3-5.9 4.6-5.9 6.5 0 .6.5 1 1.6 1 1.4 0 2.5-.5 3.5-1.1l.6.9c-1 1-2.6 1.7-4.4 1.7-2.9 0-4.6-1.5-4.6-3.8zm23.6-7.5l-2.1 10.4-1.3-6.6c-.3-1.5-1.1-2.4-2.5-2.4h-4.6l-.2.8c1 .2 2 .5 2.7.9.4.2.6.5.5.9L64.8 26.7h6.4l9.7-25.6h-6.1l4 17.5zM100 1.1h-4.9c-1.5 0-2.6 1-2.9 2.4l-7.3 17.5-1.1-5.7c-.3-1.4-1.2-2.3-2.6-2.3h-4.7l-.2.9c1 .2 2 .5 2.7.9.4.2.6.5.5.9l4.5 18.5h6.4L100 1.1z"/>
                    </svg>
                    {/* Mastercard */}
                    <svg className="h-6 w-auto" viewBox="0 0 100 60" fill="currentColor">
                        <circle cx="35" cy="30" r="25" fill="#EB001B" fillOpacity="0.8"/>
                        <circle cx="65" cy="30" r="25" fill="#F79E1B" fillOpacity="0.8"/>
                        <path d="M50 11.5c-4.4 4.5-7.1 10.7-7.1 18.5s2.7 14 7.1 18.5c4.4-4.5 7.1-10.7 7.1-18.5s-2.7-14-7.1-18.5z" fill="#FF5F00"/>
                    </svg>
                    {/* Stripe */}
                    <svg className="h-5 w-auto text-white" viewBox="0 0 100 42" fill="currentColor">
                        <path d="M50.4 14.5c0-1.8 1.4-2.8 3.8-2.8 2 0 4.4.7 6.4 1.8l1.3-4.4c-2-1-4.7-1.7-7.5-1.7-6.2 0-10 3.2-10 8.5 0 8.3 11.4 6.9 11.4 10.5 0 2-1.8 3-4.4 3-2.6 0-5.5-1-7.8-2.4l-1.3 4.5c2.4 1.4 5.7 2.3 8.8 2.3 6.6 0 10.8-3.1 10.8-8.8.1-8.5-11.5-6.9-11.5-10.5zM38.8 18.2V8.1h-5.8v10.1c0 2.2-.4 3.3-2.2 3.3-.6 0-1.2-.1-1.6-.3l-.4 4.6c.7.3 1.7.5 2.8.5 4.3 0 7.2-2.3 7.2-8.1zM11.6 8.1c-3.1 0-5.3 1.2-6.5 2.9V8.1H0v25.2h6V20.5c0-3.6 2.3-5.3 5.3-5.3.6 0 1.2.1 1.7.2l.6-5.5c-.6-.2-1.3-.3-2-.3zM45.5 3.3V0h-6v3.3h6zM26.4 8.1c-3.1 0-5.3 1.2-6.5 2.9V8.1h-5.1v25.2h6V20.5c0-3.6 2.3-5.3 5.3-5.3.6 0 1.2.1 1.7.2l.6-5.5c-.6-.2-1.3-.3-2-.3zM100 18.2c0-6.1-4.2-10.8-10.2-10.8-5.8 0-10 4.7-10 10.8 0 6.6 4.6 11.3 11 11.3 2.7 0 5-.6 6.8-1.7l-1.1-4.2c-1.4.7-2.9 1.1-4.8 1.1-3.2 0-5.6-1.7-6-4.5h14.1c.1-.7.2-1.4.2-2zm-14.1-2.4c.4-2.5 2.4-4.1 4.7-4.1 2.2 0 4.1 1.5 4.4 4.1h-9.1zM79.2 13.9c-1.3-1.6-3.1-2.5-5.5-2.5-4.2 0-7.3 3.6-7.3 8.3 0 5 3.1 8.5 7.4 8.5 2.3 0 4.3-.9 5.4-2.5v2h5.8V0h-5.8v13.9zM73.5 23c-2.4 0-4.1-1.9-4.1-4.4s1.7-4.3 4.1-4.3 4.1 1.8 4.1 4.3c0 2.5-1.7 4.4-4.1 4.4z"/>
                    </svg>
                    {/* Apple Pay */}
                    <svg className="h-5 w-auto text-white" viewBox="0 0 100 42" fill="currentColor">
                        <path d="M85.7 13.1c-1.8 0-3.6 1-4.7 2.6V0h-6.2v32.6h6.2V31c1 1.6 2.9 2.6 4.7 2.6 3.6 0 6.9-2.9 6.9-10.3s-3.3-10.2-6.9-10.2zm-.7 15.5c-2.3 0-4-1.9-4-5.2s1.7-5.2 4-5.2 4 1.9 4 5.2-1.7 5.2-4 5.2zM62.6 13.1c-1.8 0-3.6 1-4.7 2.6v-2.2H51.7V32.6h6.2V21c0-3.6 2.3-5.2 4.6-5.2.6 0 1.2.1 1.7.2l.6-5.6c-.6-.2-1.4-.3-2.2-.3zM41.8 13.1c-5.8 0-10.2 4.7-10.2 10.3s4.4 10.2 10.2 10.2 10.2-4.7 10.2-10.2S47.6 13.1 41.8 13.1zm0 15.4c-2.3 0-4-1.9-4-5.1s1.7-5.2 4-5.2 4 1.9 4 5.2-1.7 5.1-4 5.1zM23.1 27.2l-3-14h-6.2l5.7 19.4h6.8l6-19.4h-6.3l-3 14zM10.1 5.3c1.6 0 2.9-1.3 2.9-2.6S11.7 0 10.1 0 7.2 1.3 7.2 2.6s1.3 2.7 2.9 2.7zM13.2 13.4H7V32.6h6.2V13.4z"/>
                    </svg>
                    {/* Google Pay */}
                    <svg className="h-5 w-auto text-white" viewBox="0 0 100 42" fill="currentColor">
                        <path d="M43.7 21.1c0 3.3-1.1 6.1-3.2 8.1s-4.8 3.1-8.1 3.1h-5.2V10.1h5.2c3.3 0 6 1 8.1 3.1s3.2 4.7 3.2 7.9zm-4.7 0c0-2.3-.7-4.2-2-5.6s-3.2-2.1-5.6-2.1h-.9V28h.9c2.3 0 4.2-.7 5.6-2.1s2-3.3 2-4.8zm23.2-1.3v12.8h-4.3V29.5c0-1.8-.5-3.3-1.4-4.3s-2.1-1.5-3.5-1.5c-1.3 0-2.4.4-3.3 1.2s-1.4 1.8-1.4 3.1v4.6h-4.3V19.8h4.3v1.8c.6-.7 1.3-1.2 2-1.6s1.6-.6 2.6-.6c2.1 0 3.8.7 5 2.1s1.7 3.3 1.7 5.7zm11.5 5.5c0 2.3-1 4.2-3.1 5.6s-4.6 2.1-7.5 2.1c-2.4 0-4.6-.4-6.4-1.3s-3.1-2.1-3.7-3.6l4-1.7c.5.8 1.1 1.5 1.9 2s1.9.8 3.1.8c1.3 0 2.4-.3 3.1-.9s1.1-1.3 1.1-2.2c0-.7-.3-1.3-.9-1.8s-1.8-1-3.7-1.4-3.5-.9-4.8-1.5-2.2-1.4-2.8-2.6-.9-2.6-.9-4.2c0-2.2 1-3.9 2.9-5.1s4.4-1.8 7.3-1.8c2.2 0 4.2.4 5.9 1.1s3 1.8 3.6 3.2l-3.9 1.7c-.4-.7-1-1.2-1.7-1.6s-1.6-.5-2.6-.5c-1.2 0-2.1.2-2.8.7s-1.1 1.1-1.1 1.9c0 .7.3 1.3.8 1.7s1.7.9 3.5 1.3 3.6.9 5 1.5 2.3 1.3 3 2.5c.7 1.2 1.0 2.6 1 4.2z"/>
                    </svg>
                    {/* UPI */}
                    <svg className="h-5 w-auto text-white" viewBox="0 0 100 42" fill="currentColor">
                        <path d="M12.1 32.6L0 10.1h5.8l8.9 17.2L23.6 10.1h5.8L17.3 32.6h-5.2zm28.4 0V20.4c0-2.5-.7-4.4-2-5.6s-3.2-1.8-5.6-1.8c-2.4 0-4.4.6-6 1.8s-2.6 2.9-2.9 5.1l5.4.6c.2-1 .7-1.8 1.4-2.4s1.6-.9 2.6-.9c1.2 0 2.1.3 2.7 1s.9 1.6.9 2.8V23h-5.2c-2.7 0-4.8.7-6.3 2s-2.3 3.1-2.3 5.4c0 2.2.8 3.9 2.3 5.1s3.6 1.8 6.3 1.8c2.4 0 4.4-.6 6-1.8s2.6-2.9 2.9-5.1v7.2h5.2zm-5.2-6.5c0 1.2-.4 2.1-1.2 2.8s-1.9 1.1-3.3 1.1-2.4-.4-3.2-1.1-.9-1.6-.9-2.8c0-2.1 1.4-3.1 4.1-3.1h4.5v3.1zm22.4 6.5V10.1h5.8v3.4c1.1-2.3 3.1-3.4 6-3.4 2.9 0 5.2 1.1 6.9 3.4s2.6 5.4 2.6 9.3-0.9 7-2.6 9.3-4 3.4-6.9 3.4c-2.9 0-4.9-1.1-6-3.4v10.3h-5.8V32.6zm5.8-9.3c0 2.3.6 4.2 1.8 5.6s2.8 2.1 4.8 2.1 3.6-.7 4.8-2.1 1.8-3.3 1.8-5.6-0.6-4.2-1.8-5.6-2.8-2.1-4.8-2.1-3.6.7-4.8 2.1-1.8 3.3-1.8 5.6zM100 10.1H94v22.5h6V10.1zm-3-10.1c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                    </svg>
                </div>
            </div>
        </footer>
    );
}

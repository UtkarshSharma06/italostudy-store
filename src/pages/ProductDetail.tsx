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
import StoreFooter from '@/components/store/StoreFooter';
import StoreHeader from '@/components/store/StoreHeader';
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
                                src={(Array.isArray(product.images) && product.images.length > 0) ? product.images[activeImage] : `https://placehold.co/800x600/f1f5f9/0f172a?text=${encodeURIComponent(product.title.slice(0, 12))}`}
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

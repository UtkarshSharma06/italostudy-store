import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    ShoppingBag,
    ChevronRight,
    ChevronLeft,
    Search,
    X,
    Check,
    Truck,
    Shield,
    Zap,
    Package,
    LogIn,
    ClipboardList,
    Menu,
    Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import CartOverlay from '@/components/store/CartOverlay';
import { StoreGridSkeleton } from '@/components/SkeletonLoader';
import Layout from '@/components/Layout';
import { useCurrency } from '@/hooks/useCurrencyContext';

// ── Types ─────────────────────────────────────────────────
interface Product {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: number;
    discount_price: number | null;
    type: 'digital' | 'physical';
    images: string[];
    category_id: string | null;
    is_active: boolean;
}
interface Category { id: string; name: string; slug: string; }
interface Banner {
    id: string;
    title: string | null;
    subtitle: string | null;
    image_url: string;
    mobile_image_url?: string | null;
    link_url: string | null;
    badge_text: string | null;
    display_order: number;
}
interface HomeSection {
    id: string;
    title: string;
    subtitle: string | null;
    category_id: string | null;
    section_type: 'scroll' | 'grid' | 'hero_grid';
    display_order: number;
}

// ── Cart helpers ──────────────────────────────────────────
function getCart() {
    try { return JSON.parse(localStorage.getItem('italostudy_cart') || '[]'); } catch { return []; }
}

// ══════════════════════════════════════════════════════════
// STORE PAGE  (no Layout wrapper – fully self-contained)
// ══════════════════════════════════════════════════════════
export default function Store({ isMobileView: _isMobileView = false }: { isMobileView?: boolean }) {
    const navigate = useNavigate();
    const { user, session, syncCart } = useAuth() as any;

    const [products,   setProducts]   = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [banners,    setBanners]    = useState<Banner[]>([]);
    const [sections,   setSections]   = useState<HomeSection[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);

    const [isCartOpen,           setIsCartOpen]           = useState(false);
    const [cartCount,            setCartCount]            = useState(0);
    const [addedId,              setAddedId]              = useState<string | null>(null);
    const [searchQuery,          setSearchQuery]          = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
    const [currentBanner,        setCurrentBanner]        = useState(0);
    const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);

    // ── Auto-scroll announcement ticker (Not used but kept for logic)
    /*
    useEffect(() => {
        const t = setInterval(() => setAnnouncementOffset(o => o - 1), 30);
        return () => clearInterval(t);
    }, []);
    */

    // Auto-advance banner
    useEffect(() => {
        if (banners.length < 2) return;
        const t = setInterval(() => setCurrentBanner(c => (c + 1) % banners.length), 5000);
        return () => clearInterval(t);
    }, [banners.length]);

    // Cart count
    const refreshCartCount = useCallback(() => {
        setCartCount(getCart().reduce((s: number, i: any) => s + i.quantity, 0));
    }, []);
    useEffect(() => {
        refreshCartCount();
        window.addEventListener('cart-updated', refreshCartCount);
        return () => window.removeEventListener('cart-updated', refreshCartCount);
    }, [refreshCartCount]);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        const [pR, cR, bR, sR] = await Promise.all([
            (supabase.from('store_products' as any)     as any).select('*').eq('is_active', true),
            (supabase.from('store_categories' as any)   as any).select('*').order('name'),
            (supabase.from('store_banners' as any)      as any).select('*').eq('is_active', true).order('display_order'),
            (supabase.from('store_home_sections' as any)as any).select('*').eq('is_active', true).order('display_order'),
        ]);
        setProducts   ((pR.data as any) || []);
        setCategories ((cR.data as any) || []);
        setBanners    ((bR.data as any) || []);
        setSections   ((sR.data as any) || []);
        setIsLoading(false);
    };

    const handleAddToCart = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        
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

        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 1500);
    };

    const filteredProducts = products.filter(p => {
        const q = searchQuery.toLowerCase();
        return (!q || p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
            && (!activeCategoryFilter || p.category_id === activeCategoryFilter);
    });
    const isSearching = !!searchQuery || !!activeCategoryFilter;
    const productsForSection = (s: HomeSection) =>
        s.category_id ? products.filter(p => p.category_id === s.category_id) : products;

    // ── Announcement text ──────────────────────────────────
    /*
    const announcements = [
        '✨  Free digital access on all IMAT 2025 bundles!',
        '📦  Physical orders shipped globally via express delivery.',
        '🎓  Join 5,000+ students who trust Italostudy resources.',
        '🔐  100% secure checkout powered by Stripe.',
    ];
    */
    // const announcementText = announcements.join('     •     ');

    return (
        <Layout showHeader={false} showFooter={false} isLoading={isLoading}>
            <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 font-sans flex flex-col">


            {/* ─── Store Header ────────────────────────────────── */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm shrink-0">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    {/* Logo — real Italostudy logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                        <img
                            src="/logo.webp"
                            alt="Italostudy"
                            className="h-8 md:h-9 w-auto object-contain"
                            width={140}
                            height={40}
                            loading="eager"
                        />
                        <div className="hidden sm:flex items-center gap-1.5">
                            <div className="w-px h-5 bg-slate-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Store</span>
                        </div>
                    </Link>

                    {/* ── Search bar (centre) ── */}
                    <div className="flex-1 min-w-0 md:max-w-xl mx-auto">
                        <div className="relative group">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0f172a] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 md:pl-11 pr-9 md:pr-10 h-10 md:h-11 rounded-full bg-slate-50 border border-slate-200 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent transition-all placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')}
                                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 transition-colors">
                                    <X className="w-3.5 h-3.5 text-slate-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Right actions ── */}
                    <div className="flex items-center gap-3 shrink-0">

                        {/* My Orders */}
                        {user && (
                            <button
                                onClick={() => navigate('/orders')}
                                className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <ClipboardList className="w-5 h-5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">My Orders</span>
                            </button>
                        )}

                        {/* Cart */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors relative"
                        >
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

                        {/* Products page link */}
                        <Link to="/products"
                            className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors">
                            <Package className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">All Products</span>
                        </Link>

                        {/* Login / Avatar */}
                        {user ? (
                            <button
                                onClick={() => {
                                    const url = session 
                                        ? `https://app.italostudy.com/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=signup`
                                        : 'https://app.italostudy.com';
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors"
                            >
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

                        {/* Mobile menu */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Category Nav Bar ───────────────────────────── */}
                <div className="border-t border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-11 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setActiveCategoryFilter(null)}
                            className={cn(
                                "shrink-0 flex items-center gap-1 px-3 md:px-4 h-7 md:h-8 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                !activeCategoryFilter
                                    ? "bg-[#0f172a] text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            All
                        </button>
                        <Link to="/products"
                            className="shrink-0 flex items-center gap-1 px-3 md:px-4 h-7 md:h-8 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 whitespace-nowrap transition-all">
                            Browse All →
                        </Link>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryFilter(cat.id === activeCategoryFilter ? null : cat.id)}
                                className={cn(
                                    "shrink-0 flex items-center gap-1 px-3 md:px-4 h-7 md:h-8 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    activeCategoryFilter === cat.id
                                        ? "bg-[#0f172a] text-white"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {cat.name}
                                <ChevronRight className="w-3 h-3 opacity-40 md:block hidden" />
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* ─── Page Body ───────────────────────────────────── */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-10">

                {/* ── Hero Banner ──────────────────────────────── */}
                {!isSearching && (
                    <div className="relative md:rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 select-none -mx-4 md:mx-0 min-h-[120px] md:min-h-[220px]">
                        {banners.length > 0 ? (
                            <>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentBanner}
                                        initial={{ opacity: 0, x: 60 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -60 }}
                                        transition={{ duration: 0.35 }}
                                        className="cursor-pointer h-full"
                                        onClick={() => banners[currentBanner].link_url && navigate(banners[currentBanner].link_url!)}
                                    >
                                        <picture className="block w-full h-full">
                                            {banners[currentBanner].mobile_image_url && (
                                                <source media="(max-width: 768px)" srcSet={banners[currentBanner].mobile_image_url} />
                                            )}
                                            <img
                                                src={banners[currentBanner].image_url}
                                                alt={banners[currentBanner].title || 'Banner'}
                                                className="w-full h-full object-cover max-h-[200px] md:max-h-[480px]"
                                            />
                                        </picture>
                                        {(banners[currentBanner].title || banners[currentBanner].badge_text) && (
                                            <div className={cn(
                                                "absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex-col justify-end p-5 md:p-8 pointer-events-none",
                                                banners[currentBanner].mobile_image_url ? "hidden md:flex" : "flex"
                                            )}>
                                                {banners[currentBanner].badge_text && (
                                                    <span className="mb-2 px-2.5 py-1 rounded-full bg-amber-400 text-[9px] font-black uppercase tracking-widest text-slate-900 w-fit">
                                                        {banners[currentBanner].badge_text}
                                                    </span>
                                                )}
                                                {banners[currentBanner].title && (
                                                    <h2 className="text-white text-xl md:text-4xl font-black leading-tight max-w-[85%] md:max-w-lg drop-shadow-xl">
                                                        {banners[currentBanner].title}
                                                    </h2>
                                                )}
                                                {banners[currentBanner].subtitle && (
                                                    <p className="text-white/90 mt-1.5 md:mt-2 text-[11px] md:text-sm font-medium line-clamp-1">{banners[currentBanner].subtitle}</p>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {banners.length > 1 && (
                                    <>
                                        <button onClick={() => setCurrentBanner(c => (c - 1 + banners.length) % banners.length)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10">
                                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                                        </button>
                                        <button onClick={() => setCurrentBanner(c => (c + 1) % banners.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10">
                                            <ChevronRight className="w-5 h-5 text-slate-700" />
                                        </button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                            {banners.map((_, i) => (
                                                <button key={i} onClick={() => setCurrentBanner(i)}
                                                    className={cn("h-2 rounded-full transition-all", i === currentBanner ? "bg-white w-6" : "bg-white/50 w-2")} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            /* Fallback gradient banner */
                            <div className="bg-gradient-to-r from-[#0f172a] via-slate-800 to-slate-700 p-8 md:p-16 flex items-center justify-between gap-8 h-full">
                                <div className="space-y-3 md:space-y-4">
                                    <span className="inline-block px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-amber-400/30">
                                        Educational Marketplace
                                    </span>
                                    <h2 className="text-white text-2xl md:text-5xl font-black leading-tight">
                                        Italostudy<br /><span className="text-amber-400">Store</span>
                                    </h2>
                                    <p className="text-slate-400 font-medium text-xs md:text-sm max-w-[240px] md:max-w-md line-clamp-2 md:line-clamp-none">
                                        Premium resources for IMAT, CENT-S, TIL & every exam you're preparing for.
                                    </p>
                                    <Link to="/products"
                                        className="inline-flex items-center gap-2 h-9 md:h-11 px-5 md:px-6 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-amber-300 transition-colors shadow-xl">
                                        Browse All <span className="hidden md:inline">Products</span> →
                                    </Link>
                                </div>
                                <img src="/logo.webp" alt="Italostudy" className="h-16 md:h-24 opacity-20 brightness-0 invert hidden sm:block" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Search Results ───────────────────────────── */}
                {isSearching && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-black text-slate-900 dark:text-white text-sm">
                                    {filteredProducts.length} results
                                </span>
                                {searchQuery && (
                                    <span className="text-sm text-slate-500">
                                        for "<span className="text-indigo-600 font-bold">{searchQuery}</span>"
                                    </span>
                                )}
                                {activeCategoryFilter && (
                                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest">
                                        {categories.find(c => c.id === activeCategoryFilter)?.name}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => { setSearchQuery(''); setActiveCategoryFilter(null); }}
                                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Clear
                            </button>
                        </div>
                        <ProductGrid
                            products={filteredProducts} isLoading={isLoading}
                            navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart}
                        />
                    </div>
                )}

                {/* ── Dynamic Sections ─────────────────────────── */}
                {!isSearching && (
                    sections.length === 0 ? (
                        <div className="space-y-5">
                            <SectionHeader title="All Products" />
                            <ProductGrid
                                products={products} isLoading={false}
                                navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart}
                            />
                        </div>
                    ) : (
                        sections.map(section => {
                            const sectionProds = productsForSection(section);
                            if (!sectionProds.length) return null;
                            return (
                                <div key={section.id} className="space-y-4">
                                    <SectionHeader
                                        title={section.title}
                                        subtitle={section.subtitle || undefined}
                                        onViewAll={() => setActiveCategoryFilter(section.category_id)}
                                    />
                                    {section.section_type === 'scroll' && (
                                        <HorizontalScrollRow products={sectionProds} navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart} />
                                    )}
                                    {section.section_type === 'grid' && (
                                        <ProductGrid products={sectionProds} isLoading={false} navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart} />
                                    )}
                                    {section.section_type === 'hero_grid' && (
                                        <HeroGrid products={sectionProds} navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart} />
                                    )}
                                </div>
                            );
                        })
                    )
                )}

                {/* ── Trust strip ──────────────────────────────── */}
                {!isSearching && !isLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-slate-200">
                        {[
                            { icon: Zap,    label: 'Instant Access',  desc: 'Digital products unlocked immediately' },
                            { icon: Truck,  label: 'Fast Shipping',   desc: 'Physical items shipped worldwide' },
                            { icon: Shield, label: 'Secure Payments', desc: 'Stripe-powered checkout' },
                            { icon: Star,   label: 'Expert Curated',  desc: 'Handpicked by Italostudy team' },
                        ].map((b, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                    <b.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{b.label}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Footer ──────────────────────────────────────── */}
            <footer className="bg-[#0f172a] border-t border-slate-800 mt-10">
                <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
                    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <img src="/logo.webp" alt="Italostudy" className="h-7 brightness-0 invert opacity-80" />
                            <div className="w-px h-4 bg-slate-700" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Store</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            © {new Date().getFullYear()} Italostudy · All rights reserved
                        </p>
                        <a href="https://italostudy.com" className="text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors">
                            ← Back to Italostudy
                        </a>
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
                            <path d="M43.7 21.1c0 3.3-1.1 6.1-3.2 8.1s-4.8 3.1-8.1 3.1h-5.2V10.1h5.2c3.3 0 6 1 8.1 3.1s3.2 4.7 3.2 7.9zm-4.7 0c0-2.3-.7-4.2-2-5.6s-3.2-2.1-5.6-2.1h-.9V28h.9c2.3 0 4.2-.7 5.6-2.1s2-3.3 2-4.8zm23.2-1.3v12.8h-4.3V29.5c0-1.8-.5-3.3-1.4-4.3s-2.1-1.5-3.5-1.5c-1.3 0-2.4.4-3.3 1.2s-1.4 1.8-1.4 3.1v4.6h-4.3V19.8h4.3v1.8c.6-.7 1.3-1.2 2-1.6s1.6-.6 2.6-.6c2.1 0 3.8.7 5 2.1s1.7 3.3 1.7 5.7zm11.5 5.5c0 2.3-1 4.2-3.1 5.6s-4.6 2.1-7.5 2.1c-2.4 0-4.6-.4-6.4-1.3s-3.1-2.1-3.7-3.6l4-1.7c.5.8 1.1 1.5 1.9 2s1.9.8 3.1.8c1.3 0 2.4-.3 3.1-.9s1.1-1.3 1.1-2.2c0-.7-.3-1.3-.9-1.8s-1.8-1-3.7-1.4-3.5-.9-4.8-1.5-2.2-1.4-2.8-2.6-.9-2.6-.9-4.2c0-2.2 1-3.9 2.9-5.1s4.4-1.8 7.3-1.8c2.2 0 4.2.4 5.9 1.1s3 1.8 3.6 3.2l-3.9 1.7c-.4-.7-1-1.2-1.7-1.6s-1.6-.5-2.6-.5c-1.2 0-2.1.2-2.8.7s-1.1 1.1-1.1 1.9c0 .7.3 1.3.8 1.7s1.7.9 3.5 1.3 3.6.9 5 1.5 2.3 1.3 3 2.5c.7 1.2 1 2.6 1 4.2z"/>
                        </svg>
                        {/* UPI */}
                        <svg className="h-5 w-auto text-white" viewBox="0 0 100 42" fill="currentColor">
                            <path d="M12.1 32.6L0 10.1h5.8l8.9 17.2L23.6 10.1h5.8L17.3 32.6h-5.2zm28.4 0V20.4c0-2.5-.7-4.4-2-5.6s-3.2-1.8-5.6-1.8c-2.4 0-4.4.6-6 1.8s-2.6 2.9-2.9 5.1l5.4.6c.2-1 .7-1.8 1.4-2.4s1.6-.9 2.6-.9c1.2 0 2.1.3 2.7 1s.9 1.6.9 2.8V23h-5.2c-2.7 0-4.8.7-6.3 2s-2.3 3.1-2.3 5.4c0 2.2.8 3.9 2.3 5.1s3.6 1.8 6.3 1.8c2.4 0 4.4-.6 6-1.8s2.6-2.9 2.9-5.1v7.2h5.2zm-5.2-6.5c0 1.2-.4 2.1-1.2 2.8s-1.9 1.1-3.3 1.1-2.4-.4-3.2-1.1-.9-1.6-.9-2.8c0-2.1 1.4-3.1 4.1-3.1h4.5v3.1zm22.4 6.5V10.1h5.8v3.4c1.1-2.3 3.1-3.4 6-3.4 2.9 0 5.2 1.1 6.9 3.4s2.6 5.4 2.6 9.3-0.9 7-2.6 9.3-4 3.4-6.9 3.4c-2.9 0-4.9-1.1-6-3.4v10.3h-5.8V32.6zm5.8-9.3c0 2.3.6 4.2 1.8 5.6s2.8 2.1 4.8 2.1 3.6-.7 4.8-2.1 1.8-3.3 1.8-5.6-0.6-4.2-1.8-5.6-2.8-2.1-4.8-2.1-3.6.7-4.8 2.1-1.8 3.3-1.8 5.6zM100 10.1H94v22.5h6V10.1zm-3-10.1c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                        </svg>
                    </div>
                </div>
            </footer>

            {/* ─── Mobile menu ─────────────────────────────────── */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                             <div className="flex items-center justify-between mb-6">
                                <span className="font-black text-slate-900 dark:text-white">Store Menu</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-slate-50">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="space-y-1 mb-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 mb-2">Navigation</p>
                                <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                                    <ShoppingBag className="w-4 h-4" /> Home
                                </button>
                                <button onClick={() => { navigate('/products'); setIsMobileMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                                    <Package className="w-4 h-4" /> All Products
                                </button>
                                {user && (
                                    <button onClick={() => { navigate('/orders'); setIsMobileMenuOpen(false); }}
                                        className="w-full text-left px-4 py-3 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                                        <ClipboardList className="w-4 h-4" /> My Orders
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 mb-2">Categories</p>
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => { setActiveCategoryFilter(cat.id); setIsMobileMenuOpen(false); }}
                                        className="w-full text-left px-4 py-3 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between">
                                        {cat.name}
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-slate-50 dark:border-slate-800 pt-4 mt-4 space-y-3 px-2">
                                {user ? (
                                    <button onClick={() => {
                                        const url = session 
                                            ? `https://app.italostudy.com/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=signup`
                                            : 'https://app.italostudy.com';
                                        window.open(url, '_blank', 'noopener,noreferrer');
                                    }}
                                        className="w-full h-12 rounded-2xl bg-[#0f172a] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200">
                                        Go to Dashboard
                                    </button>
                                ) : (
                                    <button onClick={() => navigate('/auth')}
                                        className="w-full h-12 rounded-2xl bg-[#0f172a] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                                        <LogIn className="w-4 h-4" /> Login
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
        </Layout>
    );
}

// ══════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════

function SectionHeader({ title, subtitle, onViewAll }: { title: string; subtitle?: string; onViewAll?: (() => void) | null }) {
    return (
        <div className="flex items-end justify-between gap-4 pb-1 border-b-2 border-slate-200 dark:border-slate-800">
            <div>
                <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
            {onViewAll && (
                <button onClick={onViewAll}
                    className="shrink-0 flex items-center gap-1 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 pb-1 transition-colors">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

function ProductCard({ product, navigate, addedId, onAddToCart, variant = 'default' }: {
    product: Product;
    navigate: ReturnType<typeof useNavigate>;
    addedId: string | null;
    onAddToCart: (p: Product, e: React.MouseEvent) => void;
    variant?: 'default' | 'compact';
}) {
    const isAdded = addedId === product.id;
    const { formatPrice } = useCurrency();
    const displayFormat = formatPrice;
    const discountPct = product.discount_price && product.price < product.discount_price
        ? Math.round((1 - product.price / product.discount_price) * 100) : null;

    return (
        <div
            onClick={() => navigate(`/${product.slug}`)}
            className={cn(
                "group bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5 flex flex-col",
                variant === 'compact' ? "w-44 shrink-0" : "w-full"
            )}
        >
            <div className={cn("relative bg-slate-50 overflow-hidden", variant === 'compact' ? "h-36" : "h-44")}>
                <img
                    src={product.images?.[0] || `https://placehold.co/400x300/f8fafc/0f172a?text=${encodeURIComponent(product.title.slice(0, 10))}`}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                {discountPct && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase">
                        -{discountPct}% OFF
                    </span>
                )}
                {product.type === 'digital' && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#0f172a] text-white text-[9px] font-black uppercase">
                        Digital
                    </span>
                )}
            </div>

            <div className="p-2 md:p-3 flex flex-col flex-1 gap-1.5 md:gap-2 text-center md:text-left">
                <h3 className={cn(
                    "font-bold md:font-semibold text-slate-800 leading-tight md:leading-snug line-clamp-1 md:line-clamp-2 group-hover:text-[#0f172a] transition-colors",
                    variant === 'compact' ? "text-[10px] md:text-xs" : "text-[11px] md:text-sm"
                )}>
                    {product.title}
                </h3>
                <div className="flex items-baseline justify-center md:justify-start gap-1 md:gap-1.5 mt-auto">
                    <span className={cn("font-black text-[#0f172a]", variant === 'compact' ? "text-xs md:text-sm" : "text-sm md:text-base")}>
                        {displayFormat(product.price)}
                    </span>
                    {product.discount_price && (
                        <span className="text-[9px] md:text-[10px] text-slate-400 line-through font-medium">{displayFormat(product.discount_price)}</span>
                    )}
                </div>
                <button
                    onClick={e => onAddToCart(product, e)}
                    className={cn(
                        "w-full rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 md:gap-1.5 mt-0.5 md:mt-1",
                        variant === 'compact' ? "h-7 md:h-8" : "h-8 md:h-9",
                        isAdded
                            ? "bg-emerald-500 text-white"
                            : "bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white"
                    )}
                >
                    {isAdded ? <><Check className="w-3 h-3" /> <span className="hidden xs:inline">Added</span></> : <><ShoppingBag className="w-3 h-3" /> <span className="hidden xs:inline">Add</span><span className="xs:hidden">Buy</span></>}
                </button>
            </div>
        </div>
    );
}

function HorizontalScrollRow({ products, navigate, addedId, onAddToCart }: {
    products: Product[];
    navigate: ReturnType<typeof useNavigate>;
    addedId: string | null;
    onAddToCart: (p: Product, e: React.MouseEvent) => void;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const scroll = (dir: -1 | 1) => rowRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
    return (
        <div className="relative group/row">
            <button onClick={() => scroll(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div ref={rowRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 scroll-smooth">
                {products.map(p => (
                    <ProductCard key={p.id} product={p} navigate={navigate} addedId={addedId} onAddToCart={onAddToCart} variant="compact" />
                ))}
            </div>
            <button onClick={() => scroll(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
        </div>
    );
}

function ProductGrid({ products, isLoading, navigate, addedId, onAddToCart }: {
    products: Product[]; isLoading: boolean;
    navigate: ReturnType<typeof useNavigate>;
    addedId: string | null;
    onAddToCart: (p: Product, e: React.MouseEvent) => void;
}) {
    if (isLoading) return (
        <StoreGridSkeleton />
    );
    if (!products.length) return (
        <div className="py-20 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">No products found.</p>
        </div>
    );
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => (
                <ProductCard key={p.id} product={p} navigate={navigate} addedId={addedId} onAddToCart={onAddToCart} />
            ))}
        </div>
    );
}

function HeroGrid({ products, navigate, addedId, onAddToCart }: {
    products: Product[];
    navigate: ReturnType<typeof useNavigate>;
    addedId: string | null;
    onAddToCart: (p: Product, e: React.MouseEvent) => void;
}) {
    const { formatPrice } = useCurrency();
    if (!products.length) return null;
    const [hero, ...rest] = products;
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onClick={() => navigate(`/${hero.slug}`)}
                className="group md:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all flex flex-col">
                <img src={hero.images?.[0] || `https://placehold.co/600x400/f8fafc/6366f1?text=${encodeURIComponent(hero.title.slice(0,10))}`}
                    alt={hero.title} className="w-full h-44 md:h-52 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">{hero.title}</h3>
                    <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{formatPrice(hero.price)}</span>
                        <button onClick={e => onAddToCart(hero, e)}
                            className={cn("h-8 md:h-9 px-3 md:px-4 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all",
                                addedId === hero.id ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white")}>
                            {addedId === hero.id ? '✓ Added' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
                {rest.slice(0, 4).map(p => <ProductCard key={p.id} product={p} navigate={navigate} addedId={addedId} onAddToCart={onAddToCart} />)}
            </div>
        </div>
    );
}


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
    Star,
    Award,
    Monitor,
    Package,
    User,
    LogIn,
    ClipboardList,
    Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import CartOverlay from '@/components/store/CartOverlay';
import { StoreGridSkeleton } from '@/components/SkeletonLoader';
import Layout from '@/components/Layout';

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
export default function Store({ isMobileView = false }: { isMobileView?: boolean }) {
    const navigate = useNavigate();
    const { user, profile, syncCart } = useAuth() as any;

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
    const [announcementOffset,   setAnnouncementOffset]   = useState(0);

    // Auto-scroll announcement ticker
    useEffect(() => {
        const t = setInterval(() => setAnnouncementOffset(o => o - 1), 30);
        return () => clearInterval(t);
    }, []);

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
    const announcements = [
        '✨  Free digital access on all IMAT 2025 bundles!',
        '📦  Physical orders shipped globally via express delivery.',
        '🎓  Join 5,000+ students who trust Italostudy resources.',
        '🔐  100% secure checkout powered by Stripe.',
    ];
    const announcementText = announcements.join('     •     ');

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
                                onClick={() => window.open('https://app.italostudy.com/dashboard', '_blank', 'noopener,noreferrer')}
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
                    <div className="relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 select-none min-h-[220px]">
                        {banners.length > 0 ? (
                            <>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentBanner}
                                        initial={{ opacity: 0, x: 60 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -60 }}
                                        transition={{ duration: 0.35 }}
                                        className="cursor-pointer"
                                        onClick={() => banners[currentBanner].link_url && navigate(banners[currentBanner].link_url!)}
                                    >
                                        <img
                                            src={banners[currentBanner].image_url}
                                            alt={banners[currentBanner].title || 'Banner'}
                                            className="w-full object-cover max-h-[360px]"
                                        />
                                        {(banners[currentBanner].title || banners[currentBanner].badge_text) && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex flex-col justify-end p-5 md:p-8 pointer-events-none">
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
                    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
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
                                    <button onClick={() => window.open('https://app.italostudy.com/dashboard', '_blank', 'noopener,noreferrer')}
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
                        €{product.price}
                    </span>
                    {product.discount_price && (
                        <span className="text-[9px] md:text-[10px] text-slate-400 line-through font-medium">€{product.discount_price}</span>
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
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white">€{hero.price}</span>
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

function SectionSkeleton() {
    return (
        <div className="space-y-10">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                    <div className="h-6 w-56 bg-white rounded-xl animate-pulse" />
                    <div className="flex gap-4 overflow-hidden">
                        {[...Array(5)].map((_, j) => <div key={j} className="w-44 h-60 shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 animate-pulse" />)}
                    </div>
                </div>
            ))}
        </div>
    );
}

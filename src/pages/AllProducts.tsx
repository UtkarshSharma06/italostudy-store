import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    ShoppingBag, Search, X, Check, ChevronDown,
    Package, LogIn,
    Grid3X3, List, ChevronRight, Filter, Heart, Star
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import CartOverlay from '@/components/store/CartOverlay';
import SocialProofToasts from '@/components/store/SocialProofToasts';
import { StoreGridSkeleton, CategorySidebarSkeleton } from '@/components/SkeletonLoader';
import StoreFooter from '@/components/store/StoreFooter';
import SEOHead from '@/components/SEOHead';

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
    stock_quantity: number;
    avgRating?: number | null;
    reviewCount?: number;
}
interface Category { id: string; name: string; slug: string; }

function getCart() {
    try { return JSON.parse(localStorage.getItem('italostudy_cart') || '[]'); } catch { return []; }
}
function addToCart(product: Product) {
    const maxStock = product.stock_quantity ?? 999;
    if (maxStock < 1) {
        toast.error('Product is out of stock');
        return;
    }
    const cart = getCart();
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) {
        if (existing.quantity >= maxStock) {
            toast.error(`Only ${maxStock} in stock available`);
            return;
        }
        existing.quantity += 1;
    }
    else cart.push({ id: product.id, title: product.title, price: product.price, image: product.images?.[0] || '', quantity: 1, type: product.type });
    localStorage.setItem('italostudy_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name_asc';
type ViewMode = 'grid' | 'list';

export default function AllProducts() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth() as any;

    const [products,    setProducts]    = useState<Product[]>([]);
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [isCartOpen,  setIsCartOpen]  = useState(false);
    const [cartCount,   setCartCount]   = useState(0);
    const [addedId,     setAddedId]     = useState<string | null>(null);
    const [viewMode,    setViewMode]    = useState<ViewMode>('grid');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [searchQuery,  setSearchQuery]  = useState(searchParams.get('q') || '');
    const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || '');
    const [activeType,   setActiveType]   = useState<'' | 'digital' | 'physical'>('' as '' | 'digital' | 'physical');
    const [sortKey,      setSortKey]      = useState<SortKey>('default');
    const [priceRange,   setPriceRange]   = useState<[number, number]>([0, 1000]);

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
        const [pR, cR, rR] = await Promise.all([
            (supabase.from('store_products' as any) as any).select('*').eq('is_active', true),
            (supabase.from('store_categories' as any) as any).select('*').order('name'),
            (supabase.from('store_reviews' as any) as any).select('product_id, rating').eq('is_approved', true)
        ]);

        const reviewData = (rR.data as any) || [];
        const productData = (pR.data as any) || [];
        
        const productsWithRatings = productData.map((p: any) => {
            const pReviews = reviewData.filter((r: any) => r.product_id === p.id);
            const avgRating = pReviews.length > 0 
                ? (pReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / pReviews.length)
                : null;
            return { ...p, avgRating, reviewCount: pReviews.length };
        });

        setProducts(productsWithRatings);
        setCategories((cR.data as any) || []);
        setIsLoading(false);
    };

    const handleAddToCart = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        addToCart(product);
        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 1500);
    };

    // Apply filters + sort
    const filtered = products
        .filter(p => {
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
            const matchCat = !activeCategory || p.category_id === activeCategory;
            const matchType = !activeType || p.type === activeType;
            const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
            return matchSearch && matchCat && matchType && matchPrice;
        })
        .sort((a, b) => {
            if (sortKey === 'price_asc')  return a.price - b.price;
            if (sortKey === 'price_desc') return b.price - a.price;
            if (sortKey === 'name_asc')   return a.title.localeCompare(b.title);
            return 0;
        });

    const activeFilterCount =
        (activeCategory ? 1 : 0) + (activeType ? 1 : 0) +
        (searchQuery ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 1000 ? 1 : 0);

    const clearAll = () => {
        setSearchQuery(''); setActiveCategory(''); setActiveType(''); setPriceRange([0, 1000]);
    };

    return (
        <div className="min-h-screen bg-[#f7f8fa] font-sans flex flex-col">
            <SEOHead 
                title={activeCategory ? `${categories.find(c => c.id === activeCategory)?.name} Resources` : "All Products"}
                description={activeCategory 
                    ? `Browse our complete collection of ${categories.find(c => c.id === activeCategory)?.name} study materials and exam kits.`
                    : "Complete catalogue of Italostudy premium resources, study kits, and digital guides for medical exams."}
                keywords={[activeCategory ? categories.find(c => c.id === activeCategory)?.name || '' : '', 'italostudy catalogue', 'all products']}
            />

            {/* ── Store Header (same as Store.tsx) ──────────── */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm shrink-0">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <img src="/logo.webp" alt="Italostudy" className="h-8 md:h-9 w-auto object-contain" loading="eager" />
                        <div className="hidden sm:flex items-center gap-1.5">
                            <div className="w-px h-5 bg-slate-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Store</span>
                        </div>
                    </Link>

                    {/* Search */}
                    <div className="flex-1 min-w-0 max-w-xl mx-auto">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0f172a] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search all products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-10 h-11 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <X className="w-3.5 h-3.5 text-slate-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] relative">
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
                            <button onClick={() => window.open('https://app.italostudy.com/dashboard', '_blank', 'noopener,noreferrer')}
                                className="hidden md:flex h-9 px-4 rounded-full bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest items-center">
                                Dashboard
                            </button>
                        ) : (
                            <button onClick={() => navigate('/auth')}
                                className="flex items-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest">
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Breadcrumb nav */}
            <div className="border-t border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 h-9 text-[11px] font-semibold text-slate-400">
                        <Link to="/" className="hover:text-[#0f172a] transition-colors">Store</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[#0f172a] font-black">All Products</span>
                        {activeCategory && (
                            <>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-amber-600 font-black">
                                    {categories.find(c => c.id === activeCategory)?.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
                <div className="flex gap-6 items-start">

                    {/* ── Desktop Sidebar Filter ─────────────────── */}
                    <aside className="hidden lg:flex flex-col gap-5 w-60 shrink-0 sticky top-28">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                <span className="font-black text-[11px] uppercase tracking-widest text-slate-900">Filters</span>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAll} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest">
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* Categories */}
                            <div className="px-5 py-4 border-b border-slate-50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Category</p>
                                <div className="space-y-1">
                                    {isLoading ? (
                                        <CategorySidebarSkeleton />
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setActiveCategory('')}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                                    !activeCategory ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                All Categories
                                            </button>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveCategory(cat.id === activeCategory ? '' : cat.id)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                                                        activeCategory === cat.id ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {cat.name}
                                                    {activeCategory === cat.id && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Type */}
                            <div className="px-5 py-4 border-b border-slate-50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Product Type</p>
                                <div className="space-y-1">
                                    {([
                                        { value: '', label: 'All Types' },
                                        { value: 'digital', label: '💻  Digital' },
                                        { value: 'physical', label: '📦  Physical' },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setActiveType(opt.value)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                                                activeType === opt.value ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {opt.label}
                                            {activeType === opt.value && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price range */}
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                    Price Range — <span className="text-[#0f172a]">€{priceRange[0]} – €{priceRange[1]}</span>
                                </p>
                                <input
                                    type="range" min={0} max={1000} step={10}
                                    value={priceRange[1]}
                                    onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                                    className="w-full accent-[#0f172a]"
                                />
                            </div>
                        </div>
                    </aside>

                    {/* ── Main Content ───────────────────────────── */}
                    <div className="flex-1 min-w-0 space-y-5">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                <h1 className="text-lg md:text-xl font-black text-[#0f172a] tracking-tight truncate">
                                    {activeCategory
                                        ? categories.find(c => c.id === activeCategory)?.name
                                        : 'All Products'}
                                </h1>
                                <span className="text-[10px] md:text-xs font-semibold text-slate-400">
                                    ({isLoading ? '…' : filtered.length} items)
                                </span>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearAll} className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600">
                                        <X className="w-2.5 h-2.5" /> Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto scrollbar-none py-1">
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Mobile filter button */}
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="lg:hidden flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600"
                                    >
                                        <Filter className="w-3.5 h-3.5" />
                                        <span className="hidden xxs:inline">Filters</span>
                                        {activeFilterCount > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-[#0f172a] text-white text-[9px] font-black flex items-center justify-center">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Sort */}
                                    <div className="relative">
                                        <select
                                            value={sortKey}
                                            onChange={e => setSortKey(e.target.value as SortKey)}
                                            className="h-9 pl-3 pr-7 rounded-xl border border-slate-200 bg-white text-[11px] font-black text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                                        >
                                            <option value="default">Sort: Default</option>
                                            <option value="price_asc">Price: Low → High</option>
                                            <option value="price_desc">Price: High → Low</option>
                                            <option value="name_asc">Name: A → Z</option>
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* View toggle */}
                                <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
                                    {(['grid', 'list'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setViewMode(v)}
                                            className={cn(
                                                "w-8 h-8 md:w-9 md:h-9 flex items-center justify-center transition-colors",
                                                viewMode === v ? "bg-[#0f172a] text-white" : "text-slate-400 hover:text-slate-700"
                                            )}
                                        >
                                            {v === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {activeCategory && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                                        {categories.find(c => c.id === activeCategory)?.name}
                                        <button onClick={() => setActiveCategory('')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {activeType && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                                        {activeType}
                                        <button onClick={() => setActiveType('')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {searchQuery && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black">
                                        "{searchQuery}"
                                        <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Product Grid / List */}
                        {isLoading ? (
                            <StoreGridSkeleton />
                        ) : filtered.length === 0 ? (
                            <div className="py-24 text-center">
                                <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                <h2 className="text-xl font-black text-slate-900 mb-2">No products found</h2>
                                <p className="text-slate-400 font-medium text-sm mb-6">Try adjusting your filters or search query.</p>
                                <button onClick={clearAll}
                                    className="h-10 px-6 rounded-full bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                                    Clear All Filters
                                </button>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <motion.div
                                layout
                                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
                            >
                                <AnimatePresence>
                                    {filtered.map(p => (
                                        <motion.div
                                            key={p.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <ProductCard product={p} navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map(p => (
                                    <ListCard key={p.id} product={p} navigate={navigate} addedId={addedId} onAddToCart={handleAddToCart} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <StoreFooter />

            {/* Mobile filter drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}>
                        <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                                <span className="font-black text-[11px] uppercase tracking-widest">Filters</span>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-xl hover:bg-slate-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Same filter content */}
                            <div className="px-5 py-4 border-b">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Category</p>
                                <div className="space-y-1">
                                    {[{ id: '', name: 'All Categories' }, ...categories].map(cat => (
                                        <button key={cat.id}
                                            onClick={() => { setActiveCategory(cat.id); setIsSidebarOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between",
                                                activeCategory === cat.id ? "bg-[#0f172a] text-white" : "text-slate-700 hover:bg-slate-50"
                                            )}>
                                            {cat.name}
                                            {activeCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Type</p>
                                <div className="space-y-1">
                                    {([{ value: '', label: 'All Types' }, { value: 'digital', label: '💻 Digital' }, { value: 'physical', label: '📦 Physical' }] as const).map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setActiveType(opt.value); setIsSidebarOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                                                activeType === opt.value ? "bg-[#0f172a] text-white" : "text-slate-700 hover:bg-slate-50"
                                            )}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <SocialProofToasts products={products} />
        </div>
    );
}

// ── Grid Card ─────────────────────────────────────────────
function ProductCard({ product, navigate, addedId, onAddToCart }: {
    product: Product; navigate: ReturnType<typeof useNavigate>;
    addedId: string | null; onAddToCart: (p: Product, e: React.MouseEvent) => void;
}) {
    const isAdded = addedId === product.id;
    const { formatPrice } = useCurrency();
    const discountPct = product.discount_price && product.price < product.discount_price
        ? Math.round((1 - product.price / product.discount_price) * 100) : null;

    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        const wishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
        setIsWishlisted(wishlist.some((item: any) => item.id === product.id));

        const handleWishlistUpdate = () => {
            const currentWishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
            setIsWishlisted(currentWishlist.some((item: any) => item.id === product.id));
        };
        window.addEventListener('wishlist-updated', handleWishlistUpdate);
        return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    }, [product.id]);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        const wishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
        if (isWishlisted) {
            const updated = wishlist.filter((item: any) => item.id !== product.id);
            localStorage.setItem('italostudy_wishlist', JSON.stringify(updated));
            setIsWishlisted(false);
        } else {
            wishlist.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images?.[0] || '',
                slug: product.slug,
                type: product.type
            });
            localStorage.setItem('italostudy_wishlist', JSON.stringify(wishlist));
            setIsWishlisted(true);
        }
        window.dispatchEvent(new Event('wishlist-updated'));
    };

    return (
        <div onClick={() => navigate(`/${product.slug}`)}
            className="group bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 flex flex-col">
            <div className="relative h-48 bg-slate-50">
                <img
                    src={(Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : `https://placehold.co/400x300/f1f5f9/0f172a?text=${encodeURIComponent(product.title.slice(0, 10))}`}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                {discountPct && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-black uppercase">
                        -{discountPct}% OFF
                    </span>
                )}
                {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase flex items-center gap-1">
                        Only {product.stock_quantity} left!
                    </span>
                )}
                <span className={cn(
                    "absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                    product.type === 'digital' ? "bg-[#0f172a] text-white" : "bg-slate-100 text-slate-600"
                )}>
                    {product.type}
                </span>
                <button
                    onClick={toggleWishlist}
                    className="absolute top-8 right-2 md:top-8 md:right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white transition-all shadow-sm z-10 opacity-0 group-hover:opacity-100"
                    style={{ opacity: isWishlisted ? 1 : undefined }}
                >
                    <Heart className={cn("w-3.5 h-3.5", isWishlisted && "fill-rose-500 text-rose-500")} />
                </button>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0f172a]">
                    {product.title}
                </h3>
                {product.avgRating && (
                    <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    className={cn(
                                        "w-2 md:w-2.5 h-2 md:h-2.5", 
                                        i < Math.round(product.avgRating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                    )} 
                                />
                            ))}
                        </div>
                        <span className="text-[8px] md:text-[9px] font-bold text-slate-400">({product.reviewCount})</span>
                    </div>
                )}
                <div className="flex items-baseline gap-1.5 mt-auto">
                    <span className="text-base font-black text-[#0f172a]">{formatPrice(product.price)}</span>
                    {product.discount_price && (
                        <span className="text-xs text-slate-400 line-through">{formatPrice(product.discount_price)}</span>
                    )}
                </div>
                <button onClick={e => onAddToCart(product, e)}
                    disabled={product.stock_quantity === 0}
                    className={cn(
                        "w-full h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                        product.stock_quantity === 0
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : isAdded ? "bg-emerald-500 text-white" : "bg-[#0f172a] hover:bg-slate-800 text-white active:scale-95"
                    )}>
                    {product.stock_quantity === 0 ? 'Sold Out' : isAdded ? <><Check className="w-3 h-3" /> Added!</> : <><ShoppingBag className="w-3 h-3" /> Add to Cart</>}
                </button>
            </div>
        </div>
    );
}

// ── List Card ─────────────────────────────────────────────
function ListCard({ product, navigate, addedId, onAddToCart }: {
    product: Product; navigate: ReturnType<typeof useNavigate>;
    addedId: string | null; onAddToCart: (p: Product, e: React.MouseEvent) => void;
}) {
    const isAdded = addedId === product.id;
    const { formatPrice } = useCurrency();
    const discountPct = product.discount_price && product.price < product.discount_price
        ? Math.round((1 - product.price / product.discount_price) * 100) : null;

    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        const wishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
        setIsWishlisted(wishlist.some((item: any) => item.id === product.id));

        const handleWishlistUpdate = () => {
            const currentWishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
            setIsWishlisted(currentWishlist.some((item: any) => item.id === product.id));
        };
        window.addEventListener('wishlist-updated', handleWishlistUpdate);
        return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    }, [product.id]);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        const wishlist = JSON.parse(localStorage.getItem('italostudy_wishlist') || '[]');
        if (isWishlisted) {
            const updated = wishlist.filter((item: any) => item.id !== product.id);
            localStorage.setItem('italostudy_wishlist', JSON.stringify(updated));
            setIsWishlisted(false);
        } else {
            wishlist.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images?.[0] || '',
                slug: product.slug,
                type: product.type
            });
            localStorage.setItem('italostudy_wishlist', JSON.stringify(wishlist));
            setIsWishlisted(true);
        }
        window.dispatchEvent(new Event('wishlist-updated'));
    };

    return (
        <div onClick={() => navigate(`/${product.slug}`)}
            className="group bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer transition-all hover:shadow-md flex gap-4 p-4 relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                <img
                    src={(Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : `https://placehold.co/200x200/f1f5f9/0f172a?text=${encodeURIComponent(product.title.slice(0, 8))}`}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-snug group-hover:text-[#0f172a] transition-colors line-clamp-2">
                            {product.title}
                        </h3>
                        {product.avgRating && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-2.5 h-2.5", i < Math.round(product.avgRating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">({product.reviewCount})</span>
                            </div>
                        )}
                        {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">
                                Only {product.stock_quantity} left!
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleWishlist}
                            className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                        >
                            <Heart className={cn("w-3.5 h-3.5", isWishlisted && "fill-rose-500 text-rose-500")} />
                        </button>
                        <span className={cn(
                            "shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase",
                            product.type === 'digital' ? "bg-[#0f172a] text-white" : "bg-slate-100 text-slate-600"
                        )}>
                            {product.type}
                        </span>
                    </div>
                </div>
                {product.description && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 font-medium hidden sm:block">
                        {product.description}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#0f172a]">{formatPrice(product.price)}</span>
                        {product.discount_price && (
                            <span className="text-xs text-slate-400 line-through">{formatPrice(product.discount_price)}</span>
                        )}
                        {discountPct && (
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-black border border-red-100">
                                -{discountPct}%
                            </span>
                        )}
                    </div>
                    <button onClick={e => onAddToCart(product, e)}
                        disabled={product.stock_quantity === 0}
                        className={cn(
                            "h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0",
                            product.stock_quantity === 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : isAdded ? "bg-emerald-500 text-white" : "bg-[#0f172a] hover:bg-slate-800 text-white active:scale-95"
                        )}>
                        {product.stock_quantity === 0 ? 'Sold Out' : isAdded ? <><Check className="w-3 h-3" /> Added</> : <><ShoppingBag className="w-3 h-3" /> Add to Cart</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

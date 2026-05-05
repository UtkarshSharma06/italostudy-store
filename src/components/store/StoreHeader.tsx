import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, X, ClipboardList, Package, LogIn, Menu, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrencyContext';


interface StoreHeaderProps {
    user: any;
    session: any;
    cartCount: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    navigate: (path: string) => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function StoreHeader({
    user,
    session,
    cartCount,
    setIsCartOpen,
    navigate,
    searchQuery: externalSearchQuery,
    setSearchQuery: externalSetSearchQuery,
    setIsMobileMenuOpen = () => {}
}: StoreHeaderProps) {
    const { formatPrice } = useCurrency();
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const query = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
    const setQuery = externalSetSearchQuery || setLocalSearchQuery;

    useEffect(() => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        
        const fetchResults = async () => {
            setIsSearching(true);
            const { data } = await (supabase
                .from('store_products' as any) as any)
                .select('id, title, slug, price, images, type')
                .eq('is_active', true)
                .ilike('title', `%${query}%`)
                .limit(5);
            
            if (data) setSearchResults(data);
            setIsSearching(false);
        };
        
        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);
    return (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm shrink-0">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                {/* Logo */}
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

                {/* Search bar */}
                <div className="flex-1 min-w-0 md:max-w-xl mx-auto">
                    <div className="relative group">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0f172a] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="w-full pl-9 md:pl-11 pr-9 md:pr-10 h-10 md:h-11 rounded-full bg-slate-50 border border-slate-200 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                        {query && (
                            <button onClick={() => setQuery('')}
                                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                        )}

                        {/* Search Dropdown */}
                        {query && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                                {isSearching ? (
                                    <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Searching...</div>
                                ) : searchResults.length > 0 ? (
                                    <div className="flex flex-col p-1">
                                        {searchResults.map((p) => (
                                            <Link
                                                key={p.id}
                                                to={`/store/${p.slug}`}
                                                onClick={() => setQuery('')}
                                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                    <img src={p.images?.[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black text-[#0f172a] truncate">{p.title}</h4>
                                                    <p className="text-[10px] font-bold text-indigo-600">{formatPrice(p.price)}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No results found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-3 shrink-0">
                    {user && (
                        <button
                            onClick={() => navigate('/orders')}
                            className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <ClipboardList className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">My Orders</span>
                        </button>
                    )}

                    <Link to="/wishlist"
                        className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-rose-500 transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Wishlist</span>
                    </Link>

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

                    <Link to="/products"
                        className="hidden md:flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0f172a] transition-colors">
                        <Package className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">All Products</span>
                    </Link>

                    {user ? (
                        <button
                            onClick={() => {
                                const url = session 
                                    ? `https://app.italostudy.com/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=signup`
                                    : 'https://app.italostudy.com';
                                window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="hidden md:flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                sessionStorage.setItem('post_login_redirect', window.location.pathname);
                                navigate('/auth');
                            }}
                            className="hidden md:flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            <LogIn className="w-4 h-4 mr-1" /> Login
                        </button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}

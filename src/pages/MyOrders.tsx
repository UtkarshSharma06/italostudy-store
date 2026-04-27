import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
    ShoppingBag, Package, Monitor, Download, ExternalLink,
    Clock, CheckCircle2, Truck, XCircle, RefreshCw,
    ChevronRight, LogIn, FileText, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CartOverlay from '@/components/store/CartOverlay';
import { StoreGridSkeleton } from '@/components/SkeletonLoader';

interface OrderItem {
    id: string;
    quantity: number;
    unit_price: number;
    product: {
        id: string;
        title: string;
        slug: string;
        type: 'digital' | 'physical';
        images: string[];
        file_url: string | null;
    };
}

interface Order {
    id: string;
    created_at: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    shipping_address: any;
    tracking_number: string | null;
    tracking_url: string | null;
    admin_notes: string | null;
    payment_method: string | null;
    order_items: OrderItem[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pending:   { label: 'Pending',   icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
    paid:      { label: 'Paid',      icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    shipped:   { label: 'Shipped',   icon: Truck,        color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
    delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
    cancelled: { label: 'Cancelled', icon: XCircle,      color: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200' },
    refunded:  { label: 'Refunded',  icon: RefreshCw,    color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
};

export default function MyOrders({ isMobileView = false }: { isMobileView?: boolean }) {
    const navigate = useNavigate();
    const { user } = useAuth() as any;

    const [orders,     setOrders]     = useState<Order[]>([]);
    const [isLoading,  setIsLoading]  = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartCount,  setCartCount]  = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [linkError, setLinkError] = useState<string | null>(null);

    const refreshCartCount = useCallback(() => {
        try {
            const cart = JSON.parse(localStorage.getItem('italostudy_cart') || '[]');
            setCartCount(cart.reduce((s: number, i: any) => s + i.quantity, 0));
        } catch { setCartCount(0); }
    }, []);

    useEffect(() => {
        refreshCartCount();
        window.addEventListener('cart-updated', refreshCartCount);
        return () => window.removeEventListener('cart-updated', refreshCartCount);
    }, [refreshCartCount]);

    useEffect(() => {
        if (!user) return;
        fetchOrders();
    }, [user]);

    const fetchOrders = async () => {
        setIsLoading(true);
        const { data, error } = await (supabase
            .from('store_orders' as any) as any)
            .select(`
                *,
                order_items:store_order_items (
                    id, quantity, unit_price,
                    product:store_products ( id, title, slug, type, images, download_url )
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'paid')
            .order('created_at', { ascending: false });

        if (!error) setOrders((data as any) || []);
        setIsLoading(false);
    };

    const handleSecureDownload = async (productId: string) => {
        setGeneratingId(productId);
        setLinkError(null);
        try {
            const { data, error } = await supabase.functions.invoke('store-download', {
                body: { product_id: productId }
            });

            if (error || !data?.url) {
                const errMsg = error?.message || data?.error || 'Failed to generate link';
                if (errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('piracy')) {
                    setLinkError('Link got expired due to piracy leak, mail us at contact@italostudy.com');
                } else {
                    toast.error(errMsg);
                }
                return;
            }

            // Open the signed URL in a new tab
            window.open(data.url, '_blank');
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Download error:', errorMessage);
            setLinkError('Link got expired due to piracy leak, mail us at contact@italostudy.com');
        } finally {
            setGeneratingId(null);
        }
    };

    // ── Invoice PDF (Professional Breakdown) ───────────────
    const downloadInvoice = (order: Order) => {
        const items = order.order_items.map(item =>
            `<tr>
                <td style="padding:16px 0;border-bottom:1px solid #f1f5f9">
                    <div style="font-weight:700;color:#0f172a;font-size:14px">${item.product?.title || 'Product'}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">
                        ${item.product?.type === 'digital' ? 'Digital Access' : 'Physical Shipment'}
                    </div>
                </td>
                <td style="padding:16px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#64748b">${item.quantity}</td>
                <td style="padding:16px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#64748b">&euro;${(item.unit_price || 0).toFixed(2)}</td>
                <td style="padding:16px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800;color:#0f172a">&euro;${((item.unit_price || 0) * item.quantity).toFixed(2)}</td>
            </tr>`
        ).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - Italostudy Store #${order.id.split('-')[0].toUpperCase()}</title>
    <!-- Fonts & Latex -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-logo { height: 40px; }
        .brand-divider { width: 2px; height: 24px; background: #e2e8f0; }
        .brand-text { font-family: 'Outfit', sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 0.25em; font-size: 14px; color: #0f172a; }
        .invoice-meta { text-align: right; }
        .invoice-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 32px; margin: 0; line-height: 1; color: #0f172a; }
        .invoice-id { font-family: 'monospace'; color: #94a3b8; font-size: 14px; margin: 8px 0; font-weight: 600; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 60px; }
        .meta-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin: 0 0 12px 0; }
        .meta-box p { margin: 0; font-size: 13px; font-weight: 600; color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
        .total-section { margin-left: auto; width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b; }
        .total-row.grand { padding-top: 16px; border-top: 2px solid #f1f5f9; margin-top: 12px; }
        .total-row.grand span:last-child { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 26px; color: #0f172a; }
        .total-row.discount { color: #10b981; }
        .footer { margin-top: 80px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 40px; }
        .footer p { font-size: 11px; color: #94a3b8; font-weight: 500; margin: 4px 0; }
        @media print { body { padding: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <img src="${window.location.origin}/logo.webp" class="brand-logo" style="height:40px">
            <div class="brand-divider"></div>
            <span class="brand-text">Store</span>
        </div>
        <div class="invoice-meta">
            <h1 class="invoice-title">TAX INVOICE</h1>
            <p class="invoice-id">#${order.id.split('-')[0].toUpperCase()}</p>
            <p style="font-size:13px; font-weight:700; color:#64748b">${format(new Date(order.created_at), 'MMMM dd, yyyy')}</p>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-box">
            <h4>Customer Details</h4>
            <p>${(user as any)?.display_name || 'Valued Customer'}</p>
            <p>${(user as any)?.email}</p>
        </div>
        ${order.shipping_address && Object.keys(order.shipping_address).length > 0 ? `
        <div class="meta-box">
            <h4>Shipping To</h4>
            <p>${order.shipping_address.name || ''}</p>
            <p>${order.shipping_address.address || ''}</p>
            <p>${order.shipping_address.city || ''}, ${order.shipping_address.country || ''}</p>
        </div>
        ` : `
        <div class="meta-box">
            <h4>Fulfillment</h4>
            <p>Digital Marketplace Order</p>
            <p>Access: Instant Dashboard Download</p>
        </div>
        `}
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Unit Price</th>
                <th style="text-align:right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${items}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal (Net)</span>
            <span>&euro;${Number(order.subtotal || order.total_amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>GST / Tax (18%)</span>
            <span>&euro;${Number(order.tax_amount || 0).toFixed(2)}</span>
        </div>
        ${order.discount_amount > 0 ? `
        <div class="total-row discount">
            <span>Coupon Discount</span>
            <span>- &euro;${Number(order.discount_amount).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row grand">
            <div style="display:flex; flex-direction:column">
                <span style="font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.1em; font-size:11px">Grand Total</span>
                <span style="font-size:9px; font-weight:700; color:#94a3b8; margin-top:2px; text-transform:uppercase; letter-spacing:0.05em">Paid via ${order.payment_method || 'Secure Gateway'}</span>
            </div>
            <span>&euro;${Number(order.total_amount).toFixed(2)}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for choosing Italostudy. Keep this invoice for your records.</p>
        <p>© ${new Date().getFullYear()} Italostudy Store · contact@italostudy.com</p>
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\\\(", right: "\\\\)", display: false},
                    {left: "\\\\[", right: "\\\\]", display: true}
                ],
                throwOnError : false
            });
        });
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (w) { 
            w.onload = () => { 
                setTimeout(() => {
                    w.print(); 
                    // URL.revokeObjectURL(url); // Don't revoke immediately as it might break print
                }, 500);
            }; 
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f8fa] flex flex-col font-sans">

            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm shrink-0">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <img src="/logo.webp" alt="Italostudy" className="h-8 md:h-9 w-auto object-contain" />
                        <div className="hidden sm:flex items-center gap-1.5">
                            <div className="w-px h-5 bg-slate-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a]">Store</span>
                        </div>
                    </Link>
                    <div className="flex-1" />
                    <div className="flex items-center gap-3">
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
                                className="hidden md:flex h-9 px-4 rounded-full bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest">
                                Dashboard
                            </button>
                        ) : (
                            <button onClick={() => navigate('/auth')}
                                className="flex items-center gap-2 h-9 px-4 rounded-full bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest">
                                <LogIn className="w-4 h-4" />
                                <span>Login</span>
                            </button>
                        )}
                    </div>
                </div>
                {/* Breadcrumb */}
                <div className="border-t border-slate-100">
                    <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 h-9 text-[11px] font-semibold text-slate-400">
                        <Link to="/" className="hover:text-[#0f172a] transition-colors">Store</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[#0f172a] font-black">My Orders</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black text-[#0f172a]">My Orders</h1>
                    <Link to="/products"
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#0f172a] transition-colors flex items-center gap-1">
                        Browse Store <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* ── Not logged in ─────────────────────────────── */}
                {!user && (
                    <div className="py-24 text-center space-y-4">
                        <LogIn className="w-16 h-16 mx-auto text-slate-200" />
                        <h2 className="text-xl font-black text-slate-900">Login to view your orders</h2>
                        <p className="text-slate-400 font-medium text-sm">Your orders and downloads appear here after purchase.</p>
                        <button onClick={() => navigate('/auth')}
                            className="h-11 px-6 rounded-xl bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
                            Login Now →
                        </button>
                    </div>
                )}

                {/* ── Loading ───────────────────────────────────── */}
                {user && isLoading && (
                    <StoreGridSkeleton />
                )}

                {/* ── Empty ────────────────────────────────────── */}
                {user && !isLoading && orders.length === 0 && (
                    <div className="py-24 text-center space-y-4">
                        <Package className="w-16 h-16 mx-auto text-slate-200" />
                        <h2 className="text-xl font-black text-slate-900">No orders yet</h2>
                        <p className="text-slate-400 font-medium text-sm">Your purchases will appear here.</p>
                        <Link to="/products"
                            className="inline-flex h-11 px-6 rounded-xl bg-[#0f172a] text-white text-xs font-black uppercase tracking-widest items-center hover:bg-slate-800 transition-colors">
                            Start Shopping →
                        </Link>
                    </div>
                )}

                {/* ── Orders List ───────────────────────────────── */}
                {user && !isLoading && orders.length > 0 && (
                    <div className="space-y-4">
                        {orders.map(order => {
                            const statusConf = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = statusConf.icon;
                            const isExpanded = expandedId === order.id;
                            const hasDigital = order.order_items?.some(i => i.product?.type === 'digital');
                            const hasPhysical = order.order_items?.some(i => i.product?.type === 'physical');

                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
                                >
                                    {/* Order header row */}
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="w-full text-left px-6 py-5 flex flex-wrap items-center gap-4 cursor-pointer"
                                    >
                                        {/* Order ID */}
                                        <div className="shrink-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Order</p>
                                            <p className="font-black text-[#0f172a] text-sm font-mono">
                                                #{order.id.split('-')[0].toUpperCase()}
                                            </p>
                                        </div>

                                        {/* Date */}
                                        <div className="shrink-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date</p>
                                            <p className="text-sm font-bold text-slate-700">
                                                {format(new Date(order.created_at), 'dd MMM yyyy')}
                                            </p>
                                        </div>

                                        {/* Total */}
                                        <div className="shrink-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                                            <p className="text-sm font-black text-[#0f172a]">€{Number(order.total_amount).toFixed(2)}</p>
                                        </div>

                                        {/* Status */}
                                        <span className={cn(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                            statusConf.bg, statusConf.color
                                        )}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusConf.label}
                                        </span>

                                        {/* Type pills */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {hasDigital && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f172a] text-white text-[9px] font-black uppercase">
                                                    <Monitor className="w-2.5 h-2.5" /> Digital
                                                </span>
                                            )}
                                            {hasPhysical && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase">
                                                    <Package className="w-2.5 h-2.5" /> Physical
                                                </span>
                                            )}
                                        </div>

                                        {/* Invoice */}
                                        <button
                                            onClick={e => { e.stopPropagation(); downloadInvoice(order); }}
                                            className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#0f172a] transition-colors"
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Invoice
                                        </button>

                                        <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform", isExpanded && "rotate-90")} />
                                    </div>

                                    {/* ── Expanded content ──────────────────────── */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-6 pb-6 space-y-5 border-t border-slate-50 pt-5">

                                                    {/* Items */}
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Items in this order</p>
                                                        {order.order_items?.map(item => (
                                                            <div key={item.id} className="flex items-center gap-4 bg-slate-50 rounded-xl p-3">
                                                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 overflow-hidden shrink-0">
                                                                    <img
                                                                        src={item.product?.images?.[0] || `https://placehold.co/80x80/f1f5f9/0f172a?text=P`}
                                                                        alt={item.product?.title}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.product?.title}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {item.quantity} × €{item.unit_price?.toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <span className={cn(
                                                                    "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                                                    item.product?.type === 'digital' ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-600'
                                                                )}>
                                                                    {item.product?.type === 'digital' ? <Monitor className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                                                                    {item.product?.type}
                                                                </span>

                                                                {/* Download button for digital */}
                                                                {item.product?.type === 'digital' && (order.status === 'paid' || order.status === 'delivered') && (
                                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                                        <button
                                                                            disabled={generatingId === item.product.id}
                                                                            onClick={(e) => { e.stopPropagation(); handleSecureDownload(item.product.id); }}
                                                                            className={cn(
                                                                                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-white text-[10px] font-black uppercase tracking-widest transition-all",
                                                                                generatingId === item.product.id ? "bg-slate-300" : "bg-emerald-500 hover:bg-emerald-600"
                                                                            )}
                                                                        >
                                                                            {generatingId === item.product.id ? (
                                                                                <><Loader2 className="w-3 h-3 animate-spin" /> Verifying</>
                                                                            ) : (
                                                                                <><Download className="w-3 h-3" /> Get Secure Link</>
                                                                            )}
                                                                        </button>
                                                                        {linkError && generatingId === null && (
                                                                            <p className="text-[9px] font-bold text-rose-500 max-w-[150px] text-right leading-tight">
                                                                                {linkError}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Tracking info (physical) */}
                                                    {hasPhysical && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping & Tracking</p>
                                                            {order.status === 'pending' || order.status === 'paid' ? (
                                                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                                                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-xs font-black text-amber-700">Processing your order</p>
                                                                        <p className="text-[10px] text-amber-600 mt-0.5">Your order is confirmed. Tracking info will appear here once shipped.</p>
                                                                    </div>
                                                                </div>
                                                            ) : order.tracking_url || order.tracking_number ? (
                                                                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                                    <Truck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-black text-blue-700">Your order is on the way!</p>
                                                                        {order.tracking_number && (
                                                                            <p className="text-[10px] text-blue-600 mt-0.5 font-mono">
                                                                                Tracking: {order.tracking_number}
                                                                            </p>
                                                                        )}
                                                                        {order.tracking_url && (
                                                                            <a
                                                                                href={order.tracking_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                                                            >
                                                                                Track Package <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : null}

                                                            {/* Shipping address */}
                                                            {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                                                                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 font-medium space-y-0.5">
                                                                    <p className="font-black text-slate-700">{order.shipping_address.name}</p>
                                                                    <p>{order.shipping_address.address}</p>
                                                                    <p>{order.shipping_address.city}, {order.shipping_address.country}</p>
                                                                    {order.shipping_address.phone && <p>{order.shipping_address.phone}</p>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Cancelled / Refunded notice */}
                                                    {(order.status === 'cancelled' || order.status === 'refunded') && (
                                                        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
                                                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-black text-rose-700">
                                                                    Order {order.status === 'refunded' ? 'Refunded' : 'Cancelled'}
                                                                </p>
                                                                {order.admin_notes && (
                                                                    <p className="text-[10px] text-rose-600 mt-0.5">{order.admin_notes}</p>
                                                                )}
                                                                <p className="text-[10px] text-rose-500 mt-1">
                                                                    Contact contact@italostudy.com for assistance.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Admin notes (non-cancelled) */}
                                                    {order.admin_notes && order.status !== 'cancelled' && order.status !== 'refunded' && (
                                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Note from Italostudy</p>
                                                            <p className="text-xs text-slate-600 font-medium">{order.admin_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-[#0f172a] border-t border-slate-800 mt-10">
                <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
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

            <CartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}

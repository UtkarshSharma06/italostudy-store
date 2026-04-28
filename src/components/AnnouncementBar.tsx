import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';

import { X } from 'lucide-react';
import { cn } from "@/lib/utils";

/** Strip full HTML document wrapper — extracts styles from head + body content */
function extractBodyContent(html: string): string {
    const trimmed = html.trim();
    // If it's not a full HTML doc, return as-is
    if (!/<html/i.test(trimmed)) return trimmed;

    // Extract all <style> blocks from <head>
    const styleBlocks: string[] = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(trimmed)) !== null) {
        styleBlocks.push(`<style>${styleMatch[1]}</style>`);
    }

    // Extract body content
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : trimmed;

    return styleBlocks.join('\n') + '\n' + bodyContent;
}

/** Re-execute scripts inside a container — dangerouslySetInnerHTML ignores them */
function activateScripts(container: HTMLElement) {
    container.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr =>
            newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
}

interface Announcement {
    id: string;
    title: string | null;
    content: string;
    mobile_content: string | null;
    is_active: boolean;
    page_target: string;
}

interface AnnouncementBarProps {
    previewData?: Partial<Announcement>;
}

export default function AnnouncementBar({ previewData }: AnnouncementBarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(!previewData);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (previewData) {
            setAnnouncements([previewData as Announcement]);
            setIsLoading(false);
            return;
        }

        fetchAnnouncements();
        
        const channel = supabase
            .channel('public:site_announcements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_announcements' }, () => {
                fetchAnnouncements();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [location.pathname, previewData]);

    const fetchAnnouncements = async () => {
        try {
            const path = location.pathname;
            
            // NEVER show on test window or admin panel (except for preview)
            if (!previewData && (path.includes('/test/') || path.includes('/sectioned-test/') || path.startsWith('/admin'))) {
                setAnnouncements([]);
                return;
            }

            const isStore = true; // This is the store project
            const isDashboard = path.includes('/dashboard');

            const { data, error } = await supabase
                .from('site_announcements' as any)
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false }) as { data: Announcement[] | null, error: any };

            if (error) throw error;

            if (data && data.length > 0) {
                // Filter based on targeting
                const filtered = data.filter(ann => {
                    const target = ann.page_target;
                    if (target === 'global') return true;
                    if (target === 'dashboard' && isDashboard) return true;
                    if (target === 'store' && isStore) return true;
                    
                    // Public Popup Logic
                    const isHome = path === '/';
                    const isPricing = path === '/pricing';
                    const isBlog = path === '/blog' || path.startsWith('/blog/');
                    
                    if (target === 'public_popup') return true;
                    if (target === 'public_popup_home' && isHome) return true;
                    if (target === 'public_popup_store' && isStore) return true;
                    if (target === 'public_popup_pricing' && isPricing) return true;
                    if (target === 'public_popup_blog' && isBlog) return true;
                    
                    return false;
                });

                const visible = filtered.filter(ann => !dismissedIds.includes(ann.id));
                setAnnouncements(visible);
            } else {
                setAnnouncements([]);
            }
        } catch (err) {
            console.error('Error fetching announcements:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = (id: string) => {
        const newDismissed = [...dismissedIds, id];
        setDismissedIds(newDismissed);
        setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    };

    const [showPopup, setShowPopup] = useState(false);
    
    useEffect(() => {
        if (announcements.some(a => a.page_target.startsWith('public_popup'))) {
            const timer = setTimeout(() => setShowPopup(true), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowPopup(false);
        }
    }, [announcements]);

    const bannerContainerRef = useRef<HTMLDivElement>(null);
    const activatedBanners = useRef<Set<string>>(new Set());

    const banners = announcements.filter(ann => !ann.page_target.startsWith('public_popup'));
    const popups = announcements.filter(ann => ann.page_target.startsWith('public_popup'));

    // Re-execute scripts once per banner (dangerouslySetInnerHTML ignores <script> tags)
    useEffect(() => {
        if (!bannerContainerRef.current) return;
        const newBannerIds = banners.map(b => b.id).join(',');
        if (activatedBanners.current.has(newBannerIds)) return;
        activatedBanners.current.add(newBannerIds);
        activateScripts(bannerContainerRef.current);
    });

    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href) return;

        // Catch marketing links and force them to absolute + new tab
        const marketingPaths = ['/blog', '/resources', '/it', '/tr', '/exams'];
        if (marketingPaths.some(p => href.startsWith(p)) || href === '/') {
            e.preventDefault();
            const absoluteUrl = `https://italostudy.com${href === '/' ? '' : href}`;
            window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        // Static HTML files or redirects we just added
        const staticPaths = ['/status', '/roadmap', '/updates', '/cent-s-mock', '/imat-mock'];
        if (href.endsWith('.html') || staticPaths.includes(href)) {
            return; // Let browser handle it
        }

        // Internal SPA links
        if (href.startsWith('/')) {
            e.preventDefault();
            if (href === '/dashboard' || href.startsWith('/dashboard/')) {
                window.location.href = `https://app.italostudy.com${href}`;
            } else {
                navigate(href);
            }
        }
    };

    if (isLoading || (banners.length === 0 && popups.length === 0)) return null;

    return (
        <>
            {/* Horizontal Banners */}
            {banners.length > 0 && (
                <div 
                    ref={bannerContainerRef} 
                    onClick={handleContainerClick}
                    style={{ width: '100%', overflow: 'hidden' }}
                >
                    {banners.map((ann) => {
                        const rawHtml = (isMobile && ann.mobile_content)
                            ? ann.mobile_content
                            : ann.content;
                        // Strip full HTML doc wrapper so admins can paste full HTML files
                        const htmlToRender = extractBodyContent(rawHtml);
                        return (
                            <div
                                key={ann.id}
                                className="relative group w-full"
                                style={{ overflow: 'hidden' }}
                            >
                                {/* HTML Banner Content */}
                                <div
                                    style={{ width: '100%', overflow: 'hidden' }}
                                    dangerouslySetInnerHTML={{
                                        __html: `<style>.ann-root{width:100%;overflow:hidden;box-sizing:border-box;}.ann-root>*{width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-width:0!important;}</style><div class="ann-root">${htmlToRender}</div>`
                                    }}
                                />
                                {/* Strategic Close Button — React element, always on top */}
                                {!previewData && (
                                    <button
                                        onClick={() => handleDismiss(ann.id)}
                                        aria-label="Dismiss announcement"
                                        className="absolute top-1/2 -translate-y-1/2 right-2 md:right-3 z-50 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200 opacity-60 hover:opacity-100 group-hover:opacity-100"
                                    >
                                        <X size={12} className="text-white" strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Popups/Square Banners */}
            {popups.length > 0 && showPopup && (
                <div className={cn(
                    "z-[200] flex items-center justify-center p-4",
                    previewData ? "relative w-full min-h-[300px]" : "fixed inset-0 pointer-events-none"
                )}>
                    <div className={cn(
                        "absolute inset-0 bg-black/40 backdrop-blur-sm",
                        previewData ? "rounded-2xl" : "pointer-events-auto"
                    )} />
                    <div className="flex flex-col gap-4 pointer-events-none relative z-[210] max-w-[95vw] w-fit mx-auto">
                        {popups.map((ann) => (
                            <div 
                                key={ann.id} 
                                className="relative pointer-events-auto animate-fadeIn group w-fit mx-auto"
                                onClick={handleContainerClick}
                            >
                                <div 
                                    className="shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[32px] overflow-hidden border border-white/10 w-fit"
                                    dangerouslySetInnerHTML={{ __html: ann.content }}
                                />
                                <button 
                                    onClick={() => handleDismiss(ann.id)}
                                    className="absolute -top-3 -right-3 p-2 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-[220] opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                >
                                    <X size={16} className="text-slate-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}


/**
 * SharedStorage - A cross-subdomain compatible storage provider for Supabase.
 * For the store (Web only), it uses cookies with domain .italostudy.com to share auth state.
 */
const SharedStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;
    
    // 1. Try to get from cookie first (shared across subdomains)
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1);
      if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    
    // 2. Fallback to localStorage
    return localStorage.getItem(key);
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;

    const isItalostudyDomain = window.location.hostname.endsWith('italostudy.com');
    const domain = isItalostudyDomain ? '; domain=.italostudy.com' : '';
    
    // Set cookie that expires in 1 year
    const expires = "; max-age=" + (60 * 60 * 24 * 365);
    document.cookie = `${key}=${value}${expires}${domain}; path=/; SameSite=Lax${isItalostudyDomain ? '; Secure' : ''}`;
    
    // Also save to localStorage for local dev or backup
    localStorage.setItem(key, value);
  },
  
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;

    const isItalostudyDomain = window.location.hostname.endsWith('italostudy.com');
    const domain = isItalostudyDomain ? '; domain=.italostudy.com' : '';
    
    // Clear cookie
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}; path=/`;
    
    // Clear localStorage
    localStorage.removeItem(key);
  }
};

export default SharedStorage;

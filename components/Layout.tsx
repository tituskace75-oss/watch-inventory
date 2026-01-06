
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';
import { 
  FiMenu, FiSearch, FiX, FiHeart, FiShoppingBag, FiUser, 
  FiHeadphones, FiCheckCircle, FiShield, FiFacebook, FiTwitter, FiLinkedin 
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const buildWhatsAppUrl = (message?: string) => {
  const phone = '8801571339897';
  const baseUrl = `https://wa.me/${phone}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
};

export const Header: React.FC = () => {
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Scroll listener for sticky header effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for Super Admin Role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role:roles(name)')
          .eq('user_id', user.id);
        
        const roles = data?.map((r: any) => r.role?.name) || [];
        setIsSuperAdmin(roles.includes('super_admin'));
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsSuperAdmin(false);
      }
    };
    checkAdminRole();
  }, [user]);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOverlayOpen(false);
    setIsAccountMenuOpen(false);
  }, [location]);

  // Handle click outside account menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOverlayOpen(false);
    }
  };

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'Smart Watches', path: '/c/smart-watches' },
    { name: 'Classic Watches', path: '/c/classic-watches' },
    { name: 'Women', path: '/c/women' },
    { name: 'Gift Picks', path: '/c/gift-picks' },
    { name: 'Sale', path: '/c/sale' },
    { name: 'Wholesale', path: '/wholesale' },
    { name: 'Journal', path: '/blog' },
  ];

  return (
    <>
      {/* Top Promo Strip */}
      <div className="bg-slate-900 text-white py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-center px-4">
        <div className="max-w-7xl mx-auto flex justify-center md:justify-between items-center">
          <span className="hidden md:inline">Dhaka: within 12 hours • Outside Dhaka: within 1 day</span>
          <span className="md:hidden">Nationwide Fast Delivery Available</span>
          <a href={buildWhatsAppUrl()} className="hidden md:inline hover:text-green-400 transition-colors">WhatsApp: 01571339897</a>
        </div>
      </div>

      <header 
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? 'bg-white shadow-sm border-b border-slate-100 py-2' : 'bg-white py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Left: Hamburger (Mobile) / Logo (Desktop) */}
            <div className="flex items-center space-x-4 lg:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-slate-700 hover:text-slate-900"
                aria-label="Menu"
              >
                <Icon icon={FiMenu} size={24} />
              </button>
              <button 
                onClick={() => setIsSearchOverlayOpen(true)}
                className="p-2 text-slate-700 hover:text-slate-900"
                aria-label="Search"
              >
                <Icon icon={FiSearch} size={20} />
              </button>
            </div>

            <div className="flex-shrink-0 flex flex-col items-center lg:items-start group relative">
              <Link to="/" className="text-2xl font-bold tracking-tighter text-slate-900">
                RUIZ
              </Link>
              <span className="hidden lg:block text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400 -mt-1 group-hover:text-slate-900 transition-colors">
                Style in every second.
              </span>
            </div>

            {/* Center: Search (Desktop) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-12">
              <form onSubmit={handleSearchSubmit} className="relative w-full group">
                <input
                  type="text"
                  placeholder="Search watches, brands, SKU..."
                  className="w-full bg-slate-50 border border-transparent group-hover:border-slate-200 focus:bg-white focus:border-slate-900 px-5 py-2 text-sm transition-all outline-none rounded-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-900 transition-colors">
                  <Icon icon={FiSearch} size={16} />
                </button>
              </form>
            </div>

            {/* Right: Icons & Actions */}
            <div className="flex items-center space-x-1 md:space-x-4">
              
              {isSuperAdmin && (
                <Link 
                  to="/admin" 
                  className="hidden md:flex items-center space-x-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 hover:text-blue-600 transition-colors border border-slate-200 rounded-sm"
                >
                  <Icon icon={FiShield} size={16} />
                  <span>ADMIN</span>
                </Link>
              )}

              <a 
                href={buildWhatsAppUrl("Hi Ruiz, I have a question about a watch.")} 
                target="_blank" 
                rel="noreferrer"
                className="hidden md:flex items-center space-x-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 hover:text-green-600 transition-colors"
              >
                <Icon icon={FiHeadphones} size={20} />
                <span>SUPPORT</span>
              </a>

              <Link to="/wishlist" className="p-3 text-slate-700 hover:text-slate-900 relative transition-all group" aria-label="Wishlist">
                <Icon icon={FiHeart} size={24} />
                {wishlist.length > 0 && (
                  <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <Link to="/cart" className="p-3 text-slate-700 hover:text-slate-900 relative transition-all group" aria-label="Cart">
                <Icon icon={FiShoppingBag} size={24} />
                {cartCount > 0 && (
                  <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Account Dropdown (Desktop) */}
              <div className="relative hidden lg:block" ref={accountMenuRef}>
                <button 
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="p-3 text-slate-700 hover:text-slate-900 transition-all flex items-center"
                  aria-label="Account"
                >
                  <Icon icon={FiUser} size={24} />
                </button>
                
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-2xl border border-slate-100 py-2 rounded-sm origin-top-right animate-in fade-in zoom-in duration-200">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-slate-50 mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logged in as</p>
                          <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                        </div>
                        {isSuperAdmin && (
                          <Link to="/admin" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-600 hover:bg-slate-50">Admin Dashboard</Link>
                        )}
                        <Link to="/account" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900">My Dashboard</Link>
                        <Link to="/track-order" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900">Order Tracking</Link>
                        <button onClick={() => signOut()} className="w-full text-left block px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50">Logout</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50">Login</Link>
                        <Link to="/register" className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50">Create Account</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Nav row (Desktop) */}
          <nav className="hidden lg:flex items-center justify-center space-x-10 mt-2 border-t border-slate-50 pt-3">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${
                  location.pathname === link.path 
                    ? 'text-slate-900 border-slate-900' 
                    : 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-200'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Sidebar Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <span className="text-xl font-bold tracking-tighter">RUIZ</span>
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                 <Icon icon={FiX} size={24} />
               </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 space-y-8">
              <nav className="space-y-6">
                 {navLinks.map(link => (
                   <Link key={link.path} to={link.path} className="block text-sm font-bold uppercase tracking-widest text-slate-900">{link.name}</Link>
                 ))}
              </nav>

              <div className="pt-8 border-t border-slate-100 space-y-4">
                 {user ? (
                   <>
                     {isSuperAdmin && (
                       <Link to="/admin" className="block text-sm font-bold uppercase tracking-widest text-blue-600">Admin Dashboard</Link>
                     )}
                     <Link to="/account" className="block text-sm font-bold uppercase tracking-widest text-slate-600">My Dashboard</Link>
                     <Link to="/track-order" className="block text-sm font-bold uppercase tracking-widest text-slate-600">Track Order</Link>
                     <button onClick={() => signOut()} className="text-sm font-bold uppercase tracking-widest text-red-500">Sign Out</button>
                   </>
                 ) : (
                   <>
                     <Link to="/login" className="block text-sm font-bold uppercase tracking-widest text-slate-900">Login</Link>
                     <Link to="/register" className="block text-sm font-bold uppercase tracking-widest text-slate-600">Create Account</Link>
                   </>
                 )}
              </div>

              <div className="pt-8 border-t border-slate-100">
                <a 
                  href={buildWhatsAppUrl("Hi Ruiz, I'm using your mobile site.")}
                  className="flex items-center space-x-4 p-4 bg-green-50 text-green-700 rounded-sm"
                >
                   <Icon icon={FaWhatsapp} size={24} />
                   <div>
                      <p className="text-xs font-bold uppercase tracking-widest">Chat with an Expert</p>
                      <p className="text-[10px] font-medium opacity-70">Average reply: 2 mins</p>
                   </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Search Overlay */}
      {isSearchOverlayOpen && (
        <div className="fixed inset-0 z-[70] bg-white animate-in fade-in zoom-in duration-200 p-6 flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Search Ruiz</span>
              <button onClick={() => setIsSearchOverlayOpen(false)} className="p-2 text-slate-900">
                <Icon icon={FiX} size={24} />
              </button>
           </div>
           <form onSubmit={handleSearchSubmit} className="relative mb-12">
              <input 
                autoFocus
                type="text" 
                placeholder="What are you looking for?" 
                className="w-full text-2xl font-bold tracking-tighter border-b-2 border-slate-900 py-4 outline-none placeholder:text-slate-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-900">
                <Icon icon={FiSearch} size={32} />
              </button>
           </form>
           
           <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Collections</h4>
              <div className="flex flex-wrap gap-2">
                 {['Smart Watches', 'Classic', 'Best Sellers', 'Sale'].map(tag => (
                   <button key={tag} onClick={() => { setSearchQuery(tag); navigate(`/search?q=${tag}`); setIsSearchOverlayOpen(false); }} className="px-4 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-widest rounded-full">{tag}</button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold tracking-tighter mb-6">RUIZ</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs font-light mb-8">
              Ruiz — Style in every second. Curated timepieces for those who value precision, elegance, and reliability in Bangladesh.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white">
                    <Icon icon={FiShield} size={16} />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest">100% Genuine Brands</span>
              </div>
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white">
                    <Icon icon={FiCheckCircle} size={16} />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest">Verified COD Support</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-slate-500">Shop</h4>
            <ul className="space-y-3 text-xs text-slate-300 font-medium">
              <li><Link to="/c/smart-watches" className="hover:text-white transition-colors">Smart Watches</Link></li>
              <li><Link to="/c/classic-watches" className="hover:text-white transition-colors">Classic Watches</Link></li>
              <li><Link to="/c/gift-picks" className="hover:text-white transition-colors">Gift Sets</Link></li>
              <li><Link to="/wholesale" className="hover:text-white transition-colors">Wholesale</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-slate-500">Support</h4>
            <ul className="space-y-3 text-xs text-slate-300 font-medium">
              <li><Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/legal/returns" className="hover:text-white transition-colors">Returns & Warranty</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-slate-500">Connect</h4>
            <ul className="space-y-3 text-xs text-slate-300 font-medium">
              <li><a href={buildWhatsAppUrl()} className="hover:text-white transition-colors">WhatsApp: 01571339897</a></li>
              <li><a href="mailto:support@ruiz.com.bd" className="hover:text-white transition-colors">support@ruiz.com.bd</a></li>
              <li className="text-slate-500 pt-2">Dhaka, Bangladesh</li>
            </ul>
            <div className="flex space-x-4 mt-6">
                <a href="#" className="text-slate-400 hover:text-white"><Icon icon={FiFacebook} size={18} /></a>
                <a href="#" className="text-slate-400 hover:text-white"><Icon icon={FiTwitter} size={18} /></a>
                <a href="#" className="text-slate-400 hover:text-white"><Icon icon={FiLinkedin} size={18} /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <p>© 2024 Ruiz. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-900 bg-white">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

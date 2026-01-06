
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';
import { 
  FiGrid, FiBox, FiShoppingBag, FiUsers, FiLayers, FiTag, 
  FiStar, FiEdit, FiTruck, FiAward, FiBarChart2, FiSettings, 
  FiMenu, FiX, FiLogOut, FiUser, FiSearch, FiExternalLink, FiAlertCircle, FiChevronDown,
  FiMapPin
} from 'react-icons/fi';

// Role Definitions
const ADMIN_ROLES = ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'];

// Navigation Configuration
const NAV_ITEMS = [
  { 
    label: 'Dashboard', 
    path: '/admin/dashboard', 
    icon: FiGrid, 
    roles: ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'] 
  },
  { 
    label: 'Products', 
    path: '/admin/products', 
    icon: FiBox, 
    roles: ['super_admin', 'catalog_manager'] 
  },
  { 
    label: 'Orders', 
    path: '/admin/orders', 
    icon: FiShoppingBag, 
    roles: ['super_admin', 'order_manager'] 
  },
  { 
    label: 'Customers', 
    path: '/admin/customers', 
    icon: FiUsers, 
    roles: ['super_admin', 'order_manager'] 
  },
  { 
    label: 'Inventory', 
    path: '/admin/inventory', 
    icon: FiLayers, 
    roles: ['super_admin', 'catalog_manager'] 
  },
  { 
    label: 'Coupons', 
    path: '/admin/coupons', 
    icon: FiTag, 
    roles: ['super_admin', 'order_manager'] 
  },
  { 
    label: 'Reviews', 
    path: '/admin/reviews', 
    icon: FiStar, 
    roles: ['super_admin', 'content_manager'] 
  },
  { 
    label: 'Blog CMS', 
    path: '/admin/content/blog', 
    icon: FiEdit, 
    roles: ['super_admin', 'content_manager', 'catalog_manager'] 
  },
  {
    label: 'Contact Page',
    path: '/admin/content/contact',
    icon: FiMapPin,
    roles: ['super_admin', 'content_manager']
  },
  { 
    label: 'Shipping Rules', 
    path: '/admin/shipping', 
    icon: FiTruck, 
    roles: ['super_admin', 'order_manager'] 
  },
  { 
    label: 'Loyalty & Referrals', 
    path: '/admin/loyalty', 
    icon: FiAward, 
    roles: ['super_admin'] 
  },
  { 
    label: 'Reports', 
    path: '/admin/reports', 
    icon: FiBarChart2, 
    roles: ['super_admin'] 
  },
  { 
    label: 'Site Settings', 
    path: '/admin/settings', 
    icon: FiSettings, 
    roles: ['super_admin', 'content_manager'] 
  },
];

export const AdminLayout: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Roles
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role:roles(name)') // Join roles table using inferred FK
          .eq('user_id', user.id);
        
        const roles = rolesData?.map((r: any) => r.role?.name) || [];
        setUserRoles(roles);
      } catch (err) {
        console.error('Error fetching roles:', err);
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRoles();
  }, [user, authLoading, navigate, location.pathname]);

  // Close menus on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileOpen(false);
  }, [location]);

  // Click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Loading State
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verifying Privileges...</p>
        </div>
      </div>
    );
  }

  // 3. Access Denied State
  const hasAdminAccess = userRoles.some(r => ADMIN_ROLES.includes(r));
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
           <Icon icon={FiAlertCircle} size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-8 max-w-md leading-relaxed">
          You do not have permission to view the administration dashboard. 
          Please contact the system administrator if you believe this is a mistake.
        </p>
        <Link to="/account" className="px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 rounded-sm">
          Go to My Account
        </Link>
      </div>
    );
  }

  // Filter Nav Items based on Roles
  const availableNavItems = NAV_ITEMS.filter(item => 
    userRoles.includes('super_admin') || item.roles.some(r => userRoles.includes(r))
  );

  const activeItem = availableNavItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = activeItem?.label || 'Dashboard';

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD';
  
  // Format Role Label for Badge
  const primaryRole = userRoles.includes('super_admin') ? 'Super Admin' : userRoles[0]?.replace('_', ' ') || 'Admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex-shrink-0
      `}>
         {/* Sidebar Header */}
         <div className="h-16 flex items-center px-6 border-b border-slate-100 justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
               <span className="text-xl font-bold tracking-tighter text-slate-900">RUIZ</span>
               <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Admin</span>
            </Link>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-900"
            >
              <Icon icon={FiX} size={20} />
            </button>
         </div>

         {/* Nav Items */}
         <div className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
            {availableNavItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative
                    ${isActive 
                      ? 'text-slate-900 bg-slate-50' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900"></div>}
                  <Icon 
                    icon={item.icon} 
                    className={`mr-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} 
                    size={16} 
                  />
                  {item.label}
                </Link>
              );
            })}
         </div>

         {/* Sidebar Footer */}
         <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm">
                 {userInitials}
               </div>
               <div className="overflow-hidden">
                 <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{user?.email}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider capitalize truncate">{primaryRole}</p>
               </div>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
         
         {/* TOPBAR */}
         <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-sm lg:hidden"
               >
                 <Icon icon={FiMenu} size={20} />
               </button>
               <h1 className="text-sm font-bold uppercase tracking-widest text-slate-900 hidden sm:block">
                 {pageTitle}
               </h1>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
               {/* Search */}
               <div className="hidden md:flex items-center relative group">
                  <Icon icon={FiSearch} className="absolute left-3 text-slate-400 group-focus-within:text-slate-600" size={14} />
                  <input 
                    placeholder="Search..." 
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border border-transparent focus:bg-white focus:border-slate-200 rounded-sm text-xs font-medium w-48 transition-all outline-none"
                  />
               </div>

               {/* Role Badge */}
               <span className="hidden sm:inline-flex bg-slate-100 text-slate-600 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                 {primaryRole}
               </span>

               <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

               {/* User Dropdown */}
               <div className="relative" ref={profileMenuRef}>
                 <button 
                   onClick={() => setIsProfileOpen(!isProfileOpen)}
                   className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-sm transition-colors focus:outline-none"
                 >
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-sm flex items-center justify-center text-[10px] font-bold shadow-sm">
                       {userInitials}
                    </div>
                    <Icon icon={FiChevronDown} className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} size={14} />
                 </button>

                 {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-sm py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                       <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Signed in as</p>
                          <p className="text-xs font-bold text-slate-900 truncate">{user?.email}</p>
                       </div>
                       
                       <div className="py-1">
                          <a 
                            href="#/" 
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Icon icon={FiExternalLink} className="mr-3" size={14} /> View Live Store
                          </a>
                          <Link 
                            to="/account" 
                            className="flex items-center px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Icon icon={FiUser} className="mr-3" size={14} /> My Account
                          </Link>
                       </div>

                       <div className="border-t border-slate-50 py-1">
                          <button 
                            onClick={() => { signOut(); navigate('/login'); }} 
                            className="w-full text-left flex items-center px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Icon icon={FiLogOut} className="mr-3" size={14} /> Log Out
                          </button>
                       </div>
                    </div>
                 )}
               </div>
            </div>
         </header>

         {/* PAGE CONTENT */}
         <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
               <Outlet />
            </div>
         </main>

      </div>
    </div>
  );
};

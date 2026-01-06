
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiSearch, FiDownload, FiRefreshCcw, FiChevronRight, FiUser, 
  FiPhone, FiMail, FiMessageCircle, FiX, FiShoppingBag, FiStar, FiAward
} from 'react-icons/fi';

// --- TYPES ---

interface CustomerProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  loyalty?: { points_balance: number };
  referral?: { code: string };
  // Aggregated stats
  orders_count: number;
  lifetime_value: number;
  last_order_date: string | null;
}

interface GuestBuyer {
  phone: string;
  name: string;
  email?: string;
  first_seen: string;
  // Aggregated stats
  orders_count: number;
  lifetime_value: number;
  last_order_date: string;
}

interface OrderSimple {
  id: string;
  order_number: number;
  created_at: string;
  status: string;
  total: number;
}

// --- HELPERS ---

const normalizeToE164 = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.substring(1);
  if (cleaned.startsWith('0')) return `88${cleaned}`; // 017... -> 88017...
  if (cleaned.startsWith('880')) return cleaned;
  if (cleaned.length === 10 && !cleaned.startsWith('0')) return `880${cleaned}`;
  return `880${cleaned}`; 
};

const buildWhatsAppUrl = (phone: string, name: string) => {
  const e164 = normalizeToE164(phone);
  const message = `Hi ${name.split(' ')[0]}, this is Ruiz support. How can we help you today?`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
};

export const AdminCustomers: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'registered' | 'guests'>('registered');
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [guests, setGuests] = useState<GuestBuyer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | GuestBuyer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderSimple[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- 1. DATA FETCHING ---

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'registered') {
        // A. Fetch Registered Profiles
        const { data: rawProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch aggregation data
        const userIds = rawProfiles.map(p => p.user_id);
        
        // 1. Orders
        const { data: orders } = await supabase
          .from('orders')
          .select('customer_id, total, status, created_at')
          .in('customer_id', userIds)
          .neq('status', 'cancelled')
          .neq('status', 'returned')
          .neq('status', 'refunded');

        // 2. Loyalty (Manual Fetch)
        const { data: loyaltyData } = await supabase
          .from('loyalty_accounts')
          .select('user_id, points_balance')
          .in('user_id', userIds);
        
        const loyaltyMap: Record<string, any> = {};
        loyaltyData?.forEach((l: any) => loyaltyMap[l.user_id] = l);

        // 3. Referrals (Manual Fetch)
        const { data: referralData } = await supabase
          .from('referral_codes')
          .select('user_id, code')
          .in('user_id', userIds);

        const referralMap: Record<string, any> = {};
        referralData?.forEach((r: any) => referralMap[r.user_id] = r);

        const profileMap = rawProfiles.map((p: any) => {
          const userOrders = orders?.filter((o: any) => o.customer_id === p.user_id) || [];
          const ltv = userOrders.reduce((sum: number, o: any) => sum + o.total, 0);
          const lastOrder = userOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          return {
            user_id: p.user_id,
            full_name: p.full_name || 'Unnamed',
            email: p.email,
            phone: p.phone || '',
            created_at: p.created_at,
            loyalty: loyaltyMap[p.user_id],
            referral: referralMap[p.user_id],
            orders_count: userOrders.length,
            lifetime_value: ltv,
            last_order_date: lastOrder?.created_at || null
          };
        });

        setProfiles(profileMap);

      } else {
        // B. Fetch Guest Buyers (Group by Phone)
        const { data: orders, error } = await supabase
          .from('orders')
          .select('customer_name, customer_phone, customer_email, total, created_at, status')
          .is('customer_id', null)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;

        // Group by Phone
        const guestMap = new Map<string, GuestBuyer>();

        orders?.forEach((o: any) => {
          if (!o.customer_phone) return;
          const phone = o.customer_phone.trim();
          
          if (!guestMap.has(phone)) {
            guestMap.set(phone, {
              phone: phone,
              name: o.customer_name,
              email: o.customer_email,
              first_seen: o.created_at,
              orders_count: 0,
              lifetime_value: 0,
              last_order_date: o.created_at
            });
          }

          const guest = guestMap.get(phone)!;
          // Only sum valid orders
          if (!['cancelled', 'returned', 'refunded'].includes(o.status)) {
             guest.lifetime_value += o.total;
          }
          guest.orders_count += 1;
        });

        setGuests(Array.from(guestMap.values()));
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // --- 2. DRAWER LOGIC ---

  const openCustomerDetails = async (customer: CustomerProfile | GuestBuyer) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    setCustomerOrders([]);

    try {
      let query = supabase
        .from('orders')
        .select('id, order_number, created_at, status, total')
        .order('created_at', { ascending: false })
        .limit(20);

      if ('user_id' in customer) {
        // Registered
        query = query.eq('customer_id', customer.user_id);
      } else {
        // Guest - match by phone
        query = query.is('customer_id', null).eq('customer_phone', customer.phone);
      }

      const { data, error } = await query;
      if (!error && data) {
        setCustomerOrders(data);
      }
    } catch (err) {
      console.error('Error details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDrawer = () => {
    setSelectedCustomer(null);
  };

  // --- 3. FILTERING ---

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'registered') {
      return profiles.filter(p => 
        p.full_name.toLowerCase().includes(q) || 
        p.email?.toLowerCase().includes(q) || 
        p.phone?.includes(q)
      );
    } else {
      return guests.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.phone.includes(q)
      );
    }
  }, [profiles, guests, activeTab, searchQuery]);

  // --- 4. EXPORT ---

  const handleExport = () => {
    const isReg = activeTab === 'registered';
    const headers = isReg 
      ? ['Name', 'Email', 'Phone', 'Joined', 'Orders', 'LTV', 'Points', 'Referral Code']
      : ['Name', 'Phone', 'Email', 'Last Order', 'Orders', 'LTV'];
    
    const rows = isReg 
      ? profiles.map(p => [
          `"${p.full_name}"`, p.email, p.phone, formatDate(p.created_at), 
          p.orders_count, p.lifetime_value, p.loyalty?.points_balance || 0, p.referral?.code || ''
        ])
      : guests.map(g => [
          `"${g.name}"`, g.phone, g.email || '', formatDate(g.last_order_date),
          g.orders_count, g.lifetime_value
        ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruiz_${activeTab}_customers.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER ---

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-50 text-red-600';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage your customer base • {filteredData.length} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-1 mb-6 border-b border-slate-200 gap-8">
        <button 
          onClick={() => { setActiveTab('registered'); setSearchQuery(''); }}
          className={`whitespace-nowrap pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'registered' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Registered Profiles
        </button>
        <button 
          onClick={() => { setActiveTab('guests'); setSearchQuery(''); }}
          className={`whitespace-nowrap pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'guests' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Guest Buyers
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex items-center shadow-sm">
        <div className="relative flex-grow max-w-md">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search by name, phone, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Orders</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">LTV</th>
                {activeTab === 'registered' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Points</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Referral</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Joined</th>
                  </>
                )}
                {activeTab === 'guests' && (
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Order</th>
                )}
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">No customers found.</td>
                </tr>
              ) : (
                filteredData.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.full_name || item.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{activeTab === 'registered' ? 'Member' : 'Guest'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono text-slate-600">{item.phone}</p>
                      {item.email && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.email}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-2 py-1 rounded-sm text-xs font-bold">{item.orders_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm text-slate-900">
                      {formatCurrency(item.lifetime_value)}
                    </td>
                    
                    {activeTab === 'registered' ? (
                      <>
                        <td className="px-6 py-4 text-center text-xs font-bold text-purple-600">{item.loyalty?.points_balance || 0}</td>
                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-500">{item.referral?.code || '—'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{formatDate(item.created_at)}</td>
                      </>
                    ) : (
                      <td className="px-6 py-4 text-xs text-slate-500">{formatDate(item.last_order_date)}</td>
                    )}

                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openCustomerDetails(item)}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all"
                      >
                        <Icon icon={FiChevronRight} size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DETAILS DRAWER (Sheet) --- */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={closeDrawer}></div>
          
          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
                  {'full_name' in selectedCustomer ? selectedCustomer.full_name : selectedCustomer.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm border ${'user_id' in selectedCustomer ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {'user_id' in selectedCustomer ? 'Registered' : 'Guest'}
                  </span>
                  {'user_id' in selectedCustomer && (
                    <span className="text-[10px] text-slate-400">Joined {formatDate(selectedCustomer.created_at)}</span>
                  )}
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                <Icon icon={FiX} size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-4">
                <a 
                  href={buildWhatsAppUrl(selectedCustomer.phone, 'full_name' in selectedCustomer ? selectedCustomer.full_name : selectedCustomer.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-sm hover:border-green-500 hover:bg-green-50 group transition-all"
                >
                  <Icon icon={FiMessageCircle} size={24} className="text-slate-400 group-hover:text-green-600 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 group-hover:text-green-700">WhatsApp</span>
                </a>
                <a 
                  href={`tel:${selectedCustomer.phone}`}
                  className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-sm hover:border-slate-900 hover:bg-slate-50 group transition-all"
                >
                  <Icon icon={FiPhone} size={24} className="text-slate-400 group-hover:text-slate-900 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 group-hover:text-slate-900">Call</span>
                </a>
              </div>

              {/* Info Block */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-sm">
                  <Icon icon={FiPhone} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-sm">
                    <Icon icon={FiMail} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 truncate">{selectedCustomer.email}</span>
                  </div>
                )}
                
                {'user_id' in selectedCustomer && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-sm border border-purple-100">
                      <div className="flex items-center gap-3 text-purple-700">
                        <Icon icon={FiStar} />
                        <span className="text-xs font-bold uppercase tracking-widest">Points Balance</span>
                      </div>
                      <span className="font-bold text-lg text-purple-900">{(selectedCustomer as CustomerProfile).loyalty?.points_balance || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-sm border border-blue-100">
                      <div className="flex items-center gap-3 text-blue-700">
                        <Icon icon={FiAward} />
                        <span className="text-xs font-bold uppercase tracking-widest">Referral Code</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-blue-900">{(selectedCustomer as CustomerProfile).referral?.code || '—'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center justify-between">
                  <span>Recent Orders</span>
                  <span className="text-slate-400">{selectedCustomer.orders_count} Total</span>
                </h3>
                
                {loadingDetails ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-sm"></div>)}
                  </div>
                ) : customerOrders.length > 0 ? (
                  <div className="border border-slate-100 rounded-sm overflow-hidden">
                    {customerOrders.map(order => (
                      <Link 
                        key={order.id}
                        to={`/admin/orders/${order.order_number}`}
                        target="_blank"
                        className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-900">#{order.order_number}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${getStatusColor(order.status)}`}>{order.status}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{formatDate(order.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</span>
                          <Icon icon={FiChevronRight} className="text-slate-300 group-hover:text-slate-900" size={14} />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-sm">
                    <Icon icon={FiShoppingBag} className="text-slate-300 mx-auto mb-2" size={24} />
                    <p className="text-xs text-slate-400">No order history found.</p>
                  </div>
                )}
              </div>

            </div>
            
            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                Lifetime Value: <span className="text-slate-900 font-bold">{formatCurrency(selectedCustomer.lifetime_value)}</span>
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

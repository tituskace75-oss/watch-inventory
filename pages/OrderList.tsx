
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { FiSearch, FiFilter, FiChevronRight, FiPackage, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export const OrderList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(quantity)
          `)
          .eq('customer_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  // Client-side filtering
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toString().includes(searchQuery) || 
      order.total.toString().includes(searchQuery);
    
    const matchesStatus = 
      statusFilter === 'All' || 
      order.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-slate-100 text-slate-700';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="space-y-4 animate-pulse">
           <div className="h-8 bg-slate-100 w-1/4 rounded-sm"></div>
           <div className="h-12 bg-slate-50 rounded-sm"></div>
           <div className="h-64 bg-slate-50 rounded-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header */}
      <div className="mb-10">
        <Link to="/account" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 mb-4">
          <Icon icon={FiArrowLeft} className="mr-2" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tighter text-slate-900">My Orders</h1>
        <p className="text-slate-500 mt-2 text-sm font-light">Track, review, and manage your purchase history.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow max-w-md">
           <Icon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search by Order #" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-colors"
           />
        </div>
        <div className="relative min-w-[180px]">
           <Icon icon={FiFilter} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none appearance-none cursor-pointer"
           >
             {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-sm overflow-hidden shadow-sm">
           {/* Desktop Table Header */}
           <div className="hidden md:grid grid-cols-6 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div className="col-span-1">Order #</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-center">Items</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
           </div>

           <div className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <div key={order.id} className="group hover:bg-slate-50 transition-colors">
                  
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-6 gap-4 p-5 items-center">
                     <div className="col-span-1 font-bold text-slate-900">#{order.order_number}</div>
                     <div className="col-span-1 text-sm text-slate-500">{formatDate(order.created_at)}</div>
                     <div className="col-span-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                           {order.status}
                        </span>
                     </div>
                     <div className="col-span-1 text-center text-sm text-slate-500">{order.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} Items</div>
                     <div className="col-span-1 text-right font-bold text-slate-900">{formatCurrency(order.total)}</div>
                     <div className="col-span-1 text-right">
                        <button 
                          onClick={() => navigate(`/account/orders/${order.order_number}`)}
                          className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-900 flex items-center justify-end"
                        >
                           Details <Icon icon={FiChevronRight} className="ml-1" />
                        </button>
                     </div>
                  </div>

                  {/* Mobile Card */}
                  <div className="md:hidden p-5 flex flex-col gap-4 cursor-pointer" onClick={() => navigate(`/account/orders/${order.order_number}`)}>
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="font-bold text-lg text-slate-900">#{order.order_number}</div>
                           <div className="text-xs text-slate-400">{formatDate(order.created_at)}</div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                           {order.status}
                        </span>
                     </div>
                     <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                        <div className="text-xs text-slate-500 font-medium">
                           {order.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} Items • <span className="text-slate-900 font-bold">{formatCurrency(order.total)}</span>
                        </div>
                        <Icon icon={FiChevronRight} className="text-slate-300" />
                     </div>
                  </div>

                </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-50 border border-slate-100 rounded-sm border-dashed">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Icon icon={FiPackage} size={24} className="text-slate-300" />
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">No orders found</h3>
           <p className="text-slate-500 text-sm mb-8">
             {searchQuery || statusFilter !== 'All' 
               ? "Try adjusting your search or filters." 
               : "You haven't placed any orders yet."}
           </p>
           {(searchQuery || statusFilter !== 'All') ? (
             <button onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} className="text-xs font-bold uppercase tracking-widest border-b border-slate-900 pb-0.5">Clear Filters</button>
           ) : (
             <Link to="/shop" className="bg-slate-900 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all rounded-sm">
                Shop Watches
             </Link>
           )}
        </div>
      )}

    </div>
  );
};

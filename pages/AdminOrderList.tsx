
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiSearch, FiFilter, FiDownload, FiRefreshCcw, FiChevronRight, 
  FiEdit3, FiCopy, FiExternalLink, FiCheck, FiX, FiMoreHorizontal,
  FiChevronLeft, FiPackage, FiTruck, FiAlertCircle
} from 'react-icons/fi';

// --- TYPES ---
interface Order {
  id: string;
  order_number: number;
  status: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  created_at: string;
  items: { quantity: number }[];
  shipment: { 
    status: string; 
    tracking_number: string; 
    tracking_url: string;
    courier_name: string;
  }[];
}

const TABS = ['All', 'Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const ADMIN_EDIT_ROLES = ['super_admin', 'order_manager'];

export const AdminOrderList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [canEdit, setCanEdit] = useState(false);

  // Filter State
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('created_at-desc');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Quick Action State
  const [quickStatusId, setQuickStatusId] = useState<string | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, pageSize, sort, paymentFilter, searchQuery]); // Re-fetch on filter change

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setCanEdit(roles.some(r => ADMIN_EDIT_ROLES.includes(r)));
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(quantity),
          shipment:shipments(status, tracking_number, tracking_url, courier_name)
        `, { count: 'exact' });

      // Search (Client-side filtering for joined fields is hard, using simple OR on main table)
      if (searchQuery) {
        // Only searching order_number (need casting to text for partial match if not exact) or customer details
        // Note: order_number is int, ilike works on text. For simplicity in Phase 1, strictly matching text fields
        const isNum = !isNaN(Number(searchQuery));
        if (isNum) {
           query = query.eq('order_number', searchQuery);
        } else {
           query = query.or(`customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`);
        }
      }

      // Tabs
      if (activeTab !== 'All') {
        query = query.eq('status', activeTab.toLowerCase());
      }

      // Filters
      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }
      if (dateFilter.from) query = query.gte('created_at', dateFilter.from);
      if (dateFilter.to) query = query.lte('created_at', dateFilter.to);

      // Sort
      const [field, dir] = sort.split('-');
      query = query.order(field, { ascending: dir === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Fetch orders error:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(orders.map(o => o.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (!canEdit) return alert('Permission denied');
    
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      // Log history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        note: 'Updated from Orders List'
      });

      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setQuickStatusId(null);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!canEdit || selectedIds.length === 0) return;
    if (!window.confirm(`Update ${selectedIds.length} orders to ${action}?`)) return;

    setBulkActionLoading(true);
    try {
      const newStatus = action.toLowerCase();
      const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', selectedIds);
      if (error) throw error;

      // History logs (batch insert)
      const logs = selectedIds.map(id => ({
        order_id: id,
        status: newStatus,
        note: 'Bulk update from Orders List'
      }));
      await supabase.from('order_status_history').insert(logs);

      // Refresh
      await fetchOrders();
      setSelectedIds([]);
    } catch (err: any) {
      alert(`Bulk update failed: ${err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Total', 'Status', 'Payment', 'Items Qty'];
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString(),
      `"${o.customer_name}"`,
      o.customer_phone,
      o.total,
      o.status,
      o.payment_method,
      o.items.reduce((sum, i) => sum + i.quantity, 0)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'packed': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage & track customer orders • {totalCount} Total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchOrders()} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-1 mb-6 border-b border-slate-200 no-scrollbar gap-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`whitespace-nowrap pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-slate-900 text-slate-900' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col xl:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-grow w-full xl:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search Order #, Name, Phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <input 
            type="date"
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
            onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
          />
          <select 
            value={paymentFilter} 
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Payments</option>
            <option value="cod">COD</option>
            <option value="online">Online</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="total-desc">Amount: High to Low</option>
            <option value="total-asc">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-6 py-3 rounded-sm mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.length} Selected</span>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(action => (
              <button 
                key={action}
                disabled={bulkActionLoading} 
                onClick={() => handleBulkAction(action)}
                className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-300 whitespace-nowrap"
              >
                Mark {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-4">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.length === orders.length && orders.length > 0}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Items</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Payment</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">No orders found.</td>
                </tr>
              ) : (
                orders.map(order => {
                  const itemCount = order.items.reduce((a, b) => a + b.quantity, 0);
                  const shipment = order.shipment?.[0];

                  return (
                    <tr key={order.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(order.id) ? 'bg-slate-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(order.id)}
                          onChange={() => handleSelectRow(order.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">#{order.order_number}</span>
                          <button onClick={() => handleCopy(String(order.order_number))} className="text-slate-300 hover:text-slate-600"><Icon icon={FiCopy} size={12}/></button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{order.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{order.customer_phone}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                          {itemCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-sm text-slate-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-sm border border-slate-200">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center relative">
                        {quickStatusId === order.id ? (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl border border-slate-200 z-10 rounded-sm min-w-[120px] animate-in zoom-in-95 duration-100">
                            {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                              <button 
                                key={s}
                                onClick={() => updateStatus(order.id, s.toLowerCase())}
                                className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50"
                              >
                                {s}
                              </button>
                            ))}
                            <button onClick={() => setQuickStatusId(null)} className="block w-full text-left px-4 py-2 text-xs text-red-500 border-t border-slate-100 hover:bg-slate-50">Cancel</button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => canEdit && setQuickStatusId(order.id)}
                            className={`cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}
                          >
                            {order.status}
                            {canEdit && <Icon icon={FiEdit3} size={10} className="ml-1 opacity-50" />}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {shipment?.tracking_url && (
                            <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Track">
                              <Icon icon={FiTruck} size={14} />
                            </a>
                          )}
                          <Link to={`/account/orders/${order.order_number}`} target="_blank" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="View Details">
                            <Icon icon={FiChevronRight} size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to <span className="font-bold">{Math.min(totalCount, page * pageSize)}</span> of <span className="font-bold">{totalCount}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="p-2 bg-white border border-slate-200 rounded-sm disabled:opacity-50 hover:bg-slate-100 text-slate-600"
            >
              <Icon icon={FiChevronLeft} size={16} />
            </button>
            <button 
              disabled={page * pageSize >= totalCount} 
              onClick={() => setPage(p => p + 1)}
              className="p-2 bg-white border border-slate-200 rounded-sm disabled:opacity-50 hover:bg-slate-100 text-slate-600"
            >
              <Icon icon={FiChevronRight} size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

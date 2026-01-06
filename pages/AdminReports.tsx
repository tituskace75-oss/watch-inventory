
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiCalendar, FiFilter, FiDownload, FiRefreshCcw, 
  FiDollarSign, FiShoppingBag, FiBox, FiTag, FiTrendingUp, 
  FiTruck, FiAlertCircle, FiCheckCircle, FiActivity, FiPackage, FiX
} from 'react-icons/fi';

// --- TYPES ---

type DateRange = 'today' | '7d' | '30d' | '90d' | 'all';
type StatusScope = 'completed' | 'non_cancelled' | 'all';

interface OrderData {
  id: string;
  order_number: number;
  status: string;
  total: number;
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  created_at: string;
  coupon_id?: string;
  payment_method: string;
}

interface OrderItemData {
  quantity: number; // schema requirement
  line_total: number;
  variant: {
    id: string;
    sku: string;
    title: string;
    product: {
      id: string;
      title: string;
      model: string;
      brand?: { name: string };
    };
  };
}

interface CouponData {
  id: string;
  code: string;
  is_active: boolean;
}

// --- CONSTANTS ---

const ACCESS_ROLES = ['super_admin', 'order_manager'];
const STATUS_SCOPE_MAP: Record<StatusScope, string[]> = {
  completed: ['delivered'],
  non_cancelled: ['pending', 'confirmed', 'packed', 'shipped', 'delivered'],
  all: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']
};

export const AdminReports: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'orders' | 'products' | 'coupons'>('sales');
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [statusScope, setStatusScope] = useState<StatusScope>('non_cancelled');

  // Raw Data (Fetched based on date range)
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [inventoryStats, setInventoryStats] = useState<{low: number, out: number}>({ low: 0, out: 0 });

  // --- 1. INITIALIZATION ---

  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    if (authorized) fetchData();
  }, [authorized, dateRange, statusScope]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setAuthorized(roles.some(r => ACCESS_ROLES.includes(r)));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Calculate Date Filter
      let startDate: string | null = null;
      const now = new Date();
      if (dateRange === 'today') startDate = new Date(now.setHours(0,0,0,0)).toISOString();
      if (dateRange === '7d') startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
      if (dateRange === '30d') startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
      if (dateRange === '90d') startDate = new Date(now.setDate(now.getDate() - 90)).toISOString();

      // 2. Fetch Orders
      let orderQuery = supabase
        .from('orders')
        .select('id, order_number, status, total, subtotal, discount_total, shipping_fee, created_at, coupon_id, payment_method');
      
      if (startDate) orderQuery = orderQuery.gte('created_at', startDate);
      const targetStatuses = STATUS_SCOPE_MAP[statusScope];
      if (targetStatuses) orderQuery = orderQuery.in('status', targetStatuses);

      const { data: orderData, error: orderError } = await orderQuery;
      if (orderError) throw orderError;
      
      setOrders(orderData || []);

      // 3. Fetch Order Items (Only if needed for Products tab, but we fetch to aggregation)
      // To optimize, we filter items by the order IDs we just fetched
      if (orderData && orderData.length > 0) {
        const orderIds = orderData.map(o => o.id);
        const { data: itemData } = await supabase
          .from('order_items')
          .select(`
            quantity, line_total,
            variant:product_variants (
              id, sku, title,
              product:products (
                id, title, model,
                brand:brands (name)
              )
            )
          `)
          .in('order_id', orderIds);
        
        // Cast to unknown first to handle the deeply nested join types safely
        setOrderItems((itemData as any[]) || []);
      } else {
        setOrderItems([]);
      }

      // 4. Fetch Inventory Snapshot (Always fresh, ignoring date filter)
      const { data: invData } = await supabase.from('product_variants').select('stock_qty');
      if (invData) {
        setInventoryStats({
          low: invData.filter((v: any) => v.stock_qty > 0 && v.stock_qty <= 5).length,
          out: invData.filter((v: any) => v.stock_qty === 0).length
        });
      }

      // 5. Fetch Coupons Reference
      const { data: couponData } = await supabase.from('coupons').select('id, code, is_active');
      setCoupons(couponData || []);

    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. AGGREGATIONS ---

  const salesMetrics = useMemo(() => {
    return {
      revenue: orders.reduce((sum, o) => sum + o.total, 0),
      count: orders.length,
      aov: orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
      discounts: orders.reduce((sum, o) => sum + o.discount_total, 0),
      shipping: orders.reduce((sum, o) => sum + o.shipping_fee, 0),
    };
  }, [orders]);

  const salesByDay = useMemo(() => {
    const map: Record<string, { date: string, revenue: number, orders: number }> = {};
    orders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString();
      if (!map[date]) map[date] = { date, revenue: 0, orders: 0 };
      map[date].revenue += o.total;
      map[date].orders += 1;
    });
    // Sort by date desc
    return Object.values(map).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  const orderStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const productPerformance = useMemo(() => {
    const variantMap: Record<string, { sku: string, variant: string, product: string, sold: number, revenue: number }> = {};
    const productMap: Record<string, { product: string, sold: number, revenue: number }> = {};

    orderItems.forEach(item => {
      if (!item.variant) return; // Deleted variant handling
      
      const vId = item.variant.id;
      const pId = item.variant.product.id;
      const pName = `${item.variant.product.brand?.name || ''} ${item.variant.product.title}`;
      
      // Variant Level
      if (!variantMap[vId]) {
        variantMap[vId] = {
          sku: item.variant.sku,
          variant: item.variant.title,
          product: pName,
          sold: 0,
          revenue: 0
        };
      }
      variantMap[vId].sold += item.quantity;
      variantMap[vId].revenue += item.line_total;

      // Product Level
      if (!productMap[pId]) {
        productMap[pId] = { product: pName, sold: 0, revenue: 0 };
      }
      productMap[pId].sold += item.quantity;
      productMap[pId].revenue += item.line_total;
    });

    return {
      variants: Object.values(variantMap).sort((a, b) => b.revenue - a.revenue).slice(0, 50),
      products: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 50)
    };
  }, [orderItems]);

  const couponPerformance = useMemo(() => {
    const map: Record<string, { code: string, uses: number, revenue: number, discount: number, is_active: boolean }> = {};
    
    // Initialize with all existing coupons (even if 0 uses in period)
    coupons.forEach(c => {
      map[c.id] = { code: c.code, is_active: c.is_active, uses: 0, revenue: 0, discount: 0 };
    });

    // Aggregate usage
    orders.forEach(o => {
      if (o.coupon_id && map[o.coupon_id]) {
        map[o.coupon_id].uses += 1;
        map[o.coupon_id].revenue += o.total;
        map[o.coupon_id].discount += o.discount_total;
      }
    });

    return Object.values(map).sort((a, b) => b.uses - a.uses);
  }, [orders, coupons]);

  // --- 3. EXPORT ACTIONS ---

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `ruiz_report_${activeTab}_${dateRange}.csv`;

    if (activeTab === 'sales') {
      headers = ['Date', 'Revenue', 'Orders', 'AOV'];
      rows = salesByDay.map(d => [d.date, d.revenue, d.orders, (d.revenue / d.orders).toFixed(2)]);
    } 
    else if (activeTab === 'orders') {
      headers = ['Order #', 'Date', 'Status', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Payment'];
      rows = orders.map(o => [o.order_number, formatDate(o.created_at), o.status, o.subtotal, o.discount_total, o.shipping_fee, o.total, o.payment_method]);
    }
    else if (activeTab === 'products') {
      headers = ['Product', 'Variant', 'SKU', 'Units Sold', 'Revenue'];
      rows = productPerformance.variants.map(p => [
        `"${p.product.replace(/"/g, '""')}"`, p.variant, p.sku, p.sold, p.revenue
      ]);
    }
    else if (activeTab === 'coupons') {
      headers = ['Code', 'Active', 'Uses', 'Revenue Generated', 'Total Discount Given'];
      rows = couponPerformance.map(c => [c.code, c.is_active ? 'Yes' : 'No', c.uses, c.revenue, c.discount]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER ---

  if (!authorized && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><Icon icon={FiAlertCircle} size={32}/></div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 text-sm">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-24 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 sticky top-20 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Performance metrics and insights
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex items-center bg-white border border-slate-200 rounded-sm p-1 shadow-sm">
            <Icon icon={FiCalendar} className="ml-3 mr-2 text-slate-400" size={14} />
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest text-slate-600 py-2 pr-8 outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-sm p-1 shadow-sm">
            <Icon icon={FiFilter} className="ml-3 mr-2 text-slate-400" size={14} />
            <select 
              value={statusScope} 
              onChange={(e) => setStatusScope(e.target.value as StatusScope)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest text-slate-600 py-2 pr-8 outline-none cursor-pointer"
            >
              <option value="completed">Completed Only</option>
              <option value="non_cancelled">Non-Cancelled</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden xl:block"></div>

          <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all shadow-sm" title="Refresh Data">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          
          <button onClick={handleExport} className="flex items-center px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-800 transition-all shadow-sm">
            <Icon icon={FiDownload} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-8">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {[
            { id: 'sales', label: 'Sales Overview', icon: FiTrendingUp },
            { id: 'orders', label: 'Orders', icon: FiShoppingBag },
            { id: 'products', label: 'Products & Inventory', icon: FiBox },
            { id: 'coupons', label: 'Coupons', icon: FiTag },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon icon={tab.icon} className="mr-2 mb-0.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 bg-slate-50/30 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
               <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Processing Data...</p>
            </div>
          ) : (
            <>
              {/* --- TAB 1: SALES --- */}
              {activeTab === 'sales' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Total Revenue', value: formatCurrency(salesMetrics.revenue), icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'Total Orders', value: salesMetrics.count, icon: FiShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Avg Order Value', value: formatCurrency(salesMetrics.aov), icon: FiActivity, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { label: 'Discounts', value: formatCurrency(salesMetrics.discounts), icon: FiTag, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Shipping', value: formatCurrency(salesMetrics.shipping), icon: FiTruck, color: 'text-slate-600', bg: 'bg-slate-100' },
                    ].map((kpi, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{kpi.label}</p>
                          <div className={`p-2 rounded-full ${kpi.bg} ${kpi.color}`}>
                            <Icon icon={kpi.icon} size={16} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily Table (Chart Substitute) */}
                  <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Daily Performance</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Orders</th>
                            <th className="px-6 py-3 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {salesByDay.map((day) => (
                            <tr key={day.date} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono text-slate-600">{day.date}</td>
                              <td className="px-6 py-3 text-right font-bold">{day.orders}</td>
                              <td className="px-6 py-3 text-right font-bold text-slate-900">{formatCurrency(day.revenue)}</td>
                            </tr>
                          ))}
                          {salesByDay.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No sales data for this period.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 2: ORDERS --- */}
              {activeTab === 'orders' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  {/* Status Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'].map(status => (
                      <div key={status} className={`p-4 rounded-sm border text-center ${status === 'cancelled' || status === 'returned' ? 'bg-red-50 border-red-100' : status === 'delivered' ? 'bg-green-50 border-green-100' : 'bg-white border-slate-200'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${status === 'cancelled' ? 'text-red-500' : 'text-slate-400'}`}>{status}</p>
                        <p className="text-lg font-bold text-slate-900">{orderStatusCounts[status] || 0}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Orders Table */}
                  <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Recent Orders (Filtered)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Order #</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-center">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {orders.slice(0, 50).map(o => (
                            <tr key={o.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => window.open(`#/admin/orders/${o.order_number}`, '_blank')}>
                              <td className="px-6 py-3 font-bold text-slate-900">#{o.order_number}</td>
                              <td className="px-6 py-3 text-slate-500">{formatDate(o.created_at)}</td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-slate-900">{formatCurrency(o.total)}</td>
                              <td className="px-6 py-3 text-center uppercase text-[10px] font-bold text-slate-400">{o.payment_method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 3: PRODUCTS --- */}
              {activeTab === 'products' && (
                <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-grow space-y-8">
                    {/* Top Variants */}
                    <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Best Selling Variants</h3>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Variant</th>
                            <th className="px-6 py-3 text-right">Sold</th>
                            <th className="px-6 py-3 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {productPerformance.variants.slice(0, 10).map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-bold text-slate-900 truncate max-w-[200px]">{v.product}</td>
                              <td className="px-6 py-3 text-slate-500">{v.variant} <span className="text-[9px] text-slate-400">({v.sku})</span></td>
                              <td className="px-6 py-3 text-right font-bold">{v.sold}</td>
                              <td className="px-6 py-3 text-right">{formatCurrency(v.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Best Selling Products (Aggregated)</h3>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Product Name</th>
                            <th className="px-6 py-3 text-right">Total Units</th>
                            <th className="px-6 py-3 text-right">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {productPerformance.products.slice(0, 10).map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-bold text-slate-900">{p.product}</td>
                              <td className="px-6 py-3 text-right font-bold">{p.sold}</td>
                              <td className="px-6 py-3 text-right">{formatCurrency(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sidebar: Inventory */}
                  <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
                    <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Inventory Alert</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-900">Out of Stock</span>
                        <span className="text-lg font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">{inventoryStats.out}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Low Stock (&le;5)</span>
                        <span className="text-lg font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">{inventoryStats.low}</span>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <a href="#/admin/inventory" className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">Manage Inventory →</a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 4: COUPONS --- */}
              {activeTab === 'coupons' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Coupon Usage</h3>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-6 py-3">Code</th>
                          <th className="px-6 py-3 text-center">Active</th>
                          <th className="px-6 py-3 text-center">Uses</th>
                          <th className="px-6 py-3 text-right">Revenue Generated</th>
                          <th className="px-6 py-3 text-right">Discount Given</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {couponPerformance.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-mono font-bold text-slate-900">{c.code}</td>
                            <td className="px-6 py-3 text-center">
                              {c.is_active ? <Icon icon={FiCheckCircle} className="text-green-500 mx-auto"/> : <Icon icon={FiX} className="text-slate-300 mx-auto"/>}
                            </td>
                            <td className="px-6 py-3 text-center font-bold">{c.uses}</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(c.revenue)}</td>
                            <td className="px-6 py-3 text-right text-green-600 font-bold">-{formatCurrency(c.discount)}</td>
                          </tr>
                        ))}
                        {couponPerformance.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No coupon usage found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

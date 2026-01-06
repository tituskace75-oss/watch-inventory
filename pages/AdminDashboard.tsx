
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiDollarSign, FiShoppingBag, FiUsers, FiActivity, 
  FiArrowUp, FiArrowDown, FiClock, FiAlertTriangle, 
  FiStar, FiPlus, FiChevronRight, FiBox, FiTruck, FiPieChart 
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Types for Dashboard Data
interface DashboardMetrics {
  revenue: number;
  ordersCount: number;
  aov: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  pendingReviews: number;
}

interface RecentOrder {
  id: string;
  order_number: number; // BigInt coming as number or string from API
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
}

interface LowStockItem {
  id: string;
  sku: string;
  title: string; // Variant title
  stock_qty: number;
  product: {
    title: string; // Product title
    slug: string;
  };
}

interface ChartData {
  date: string;
  rawDate: string; // For sorting
  revenue: number;
  orders: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const ADMIN_ROLES = ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'];

const STATUS_COLORS: Record<string, string> = {
  pending: '#f97316', // orange-500
  confirmed: '#64748b', // slate-500
  packed: '#a855f7', // purple-500
  shipped: '#3b82f6', // blue-500
  delivered: '#22c55e', // green-500
  cancelled: '#ef4444', // red-500
  returned: '#ef4444', // red-500
  refunded: '#ef4444', // red-500
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('30d');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenue: 0,
    ordersCount: 0,
    aov: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalCustomers: 0,
    pendingReviews: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  // Chart State
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);

  // 1. Fetch User Roles
  useEffect(() => {
    if (!user) return;
    const fetchRoles = async () => {
      const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
      const r = data?.map((x: any) => x.role?.name) || [];
      setRoles(r);
    };
    fetchRoles();
  }, [user]);

  // 2. Fetch Dashboard Data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let startDate = new Date();

        if (timeRange === 'today') startDate.setHours(0, 0, 0, 0);
        else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);

        const isoStart = startDate.toISOString();

        // --- PARALLEL QUERIES ---
        const promises = [];

        // A. Orders & Revenue
        const fetchOrders = supabase
          .from('orders')
          .select('id, total, status, created_at, order_number, customer_name')
          .gte('created_at', isoStart)
          .order('created_at', { ascending: false });

        // B. Inventory
        const fetchInventory = supabase
          .from('product_variants')
          .select('id, stock_qty, sku, title, product:products(title, slug)')
          .lt('stock_qty', 5)
          .eq('is_active', true) // Only active variants
          .order('stock_qty', { ascending: true })
          .limit(10); // Low stock table limit

        const fetchAllVariants = supabase
          .from('product_variants')
          .select('stock_qty', { count: 'exact', head: true })
          .eq('stock_qty', 0)
          .eq('is_active', true); // Out of stock count

        // C. Reviews
        const fetchReviews = supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // D. Customers Count
        const fetchCustomers = supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true });

        // Execute
        const [ordersRes, lowStockRes, oosRes, reviewsRes, custRes] = await Promise.all([
          fetchOrders,
          fetchInventory,
          fetchAllVariants,
          fetchReviews,
          fetchCustomers
        ]);

        // --- PROCESS DATA ---

        const ordersData = ordersRes.data || [];
        const validOrders = ordersData.filter(o => o.status !== 'cancelled' && o.status !== 'returned' && o.status !== 'refunded');
        
        // Metrics Calculation
        const revenue = validOrders.reduce((sum, o) => sum + o.total, 0);
        const ordersCount = validOrders.length;
        const aov = ordersCount > 0 ? revenue / ordersCount : 0;
        const pendingCount = ordersData.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status.toLowerCase())).length;

        // Inventory processing
        const rawLowStock = lowStockRes.data || [];
        const lowStockData: LowStockItem[] = rawLowStock.map((item: any) => ({
          id: item.id,
          sku: item.sku,
          title: item.title,
          stock_qty: item.stock_qty,
          product: Array.isArray(item.product) ? item.product[0] : item.product
        }));
        
        const outOfStockCount = oosRes.count || 0;
        
        // Update Metrics State
        setMetrics({
          revenue,
          ordersCount,
          aov,
          pendingOrders: pendingCount,
          lowStockCount: lowStockData.length,
          outOfStockCount,
          totalCustomers: custRes.count || 0,
          pendingReviews: 0 
        });

        setRecentOrders(ordersData.slice(0, 10) as RecentOrder[]);
        setLowStockItems(lowStockData);
        setReviews(reviewsRes.data || []);

        // --- CHART DATA PROCESSING ---
        
        // 1. Daily Stats (Revenue & Orders)
        const dailyMap: Record<string, { revenue: number; orders: number; rawDate: string }> = {};
        
        ordersData.forEach(o => {
          const d = new Date(o.created_at);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const isoDate = d.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
          
          if (!dailyMap[key]) {
            dailyMap[key] = { revenue: 0, orders: 0, rawDate: isoDate };
          }
          
          // Count all orders for volume
          dailyMap[key].orders += 1;
          
          // Sum only valid orders for revenue
          if (!['cancelled', 'returned', 'refunded'].includes(o.status)) {
            dailyMap[key].revenue += o.total;
          }
        });

        const processedChartData = Object.entries(dailyMap)
          .map(([date, data]) => ({
            date,
            rawDate: data.rawDate,
            revenue: data.revenue,
            orders: data.orders
          }))
          .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

        setChartData(processedChartData);

        // 2. Status Distribution
        const statusCounts: Record<string, number> = {};
        ordersData.forEach(o => {
          const s = o.status.toLowerCase();
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const processedStatusData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count,
          color: STATUS_COLORS[status] || '#cbd5e1'
        })).sort((a, b) => b.value - a.value);

        setStatusData(processedStatusData);

      } catch (err) {
        console.error('Dashboard Data Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, user]);

  // Role Checks
  const hasRole = (r: string[]) => roles.includes('super_admin') || r.some(role => roles.includes(role));
  const canViewOrders = hasRole(['order_manager']);
  const canViewCatalog = hasRole(['catalog_manager']);
  const canViewContent = hasRole(['content_manager']);

  // Loading Skeleton
  if (loading) {
     return (
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse p-4">
           <div className="flex justify-between items-center mb-8">
              <div className="h-8 w-48 bg-slate-200 rounded"></div>
              <div className="h-8 w-64 bg-slate-200 rounded"></div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-sm"></div>)}
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
              <div className="bg-slate-100 rounded-sm"></div>
              <div className="bg-slate-100 rounded-sm"></div>
           </div>
        </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
       
       {/* --- HEADER --- */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
             <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
             <p className="text-sm text-slate-500 mt-1">
                Store overview for <span className="font-bold text-slate-900 capitalize">{timeRange === 'today' ? 'Today' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}</span>
             </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             {/* Time Filter */}
             <div className="flex bg-white border border-slate-200 rounded-sm p-1">
                {(['today', '7d', '30d'] as const).map((t) => (
                   <button
                     key={t}
                     onClick={() => setTimeRange(t)}
                     className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${
                        timeRange === t 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50'
                     }`}
                   >
                     {t === 'today' ? 'Today' : t === '7d' ? '7 Days' : '30 Days'}
                   </button>
                ))}
             </div>

             {/* Quick Actions */}
             {canViewCatalog && (
                <Link to="/admin/products/new" className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm">
                   <Icon icon={FiPlus} /> Add Product
                </Link>
             )}
          </div>
       </div>

       {/* --- KPI GRID --- */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {canViewOrders && (
            <>
               {/* Revenue */}
               <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.revenue)}</h3>
                     </div>
                     <div className="p-2 bg-green-50 text-green-600 rounded-full">
                        <Icon icon={FiDollarSign} size={16} />
                     </div>
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400">
                     <span className="uppercase tracking-wide">Avg Order: {formatCurrency(metrics.aov)}</span>
                  </div>
               </div>

               {/* Orders */}
               <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.ordersCount}</h3>
                     </div>
                     <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <Icon icon={FiShoppingBag} size={16} />
                     </div>
                  </div>
                  <div className="flex items-center text-[10px] font-bold">
                     <span className={`flex items-center mr-2 ${metrics.pendingOrders > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                        <Icon icon={FiClock} className="mr-1" size={10} /> 
                        {metrics.pendingOrders} Pending
                     </span>
                  </div>
               </div>
            </>
          )}

          {canViewCatalog && (
            <>
               {/* Inventory Issues */}
               <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Stock Alerts</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.lowStockCount + metrics.outOfStockCount}</h3>
                     </div>
                     <div className="p-2 bg-orange-50 text-orange-600 rounded-full">
                        <Icon icon={FiAlertTriangle} size={16} />
                     </div>
                  </div>
                  <div className="flex items-center text-[10px] font-bold">
                     <span className="text-red-500 mr-3">{metrics.outOfStockCount} Out of Stock</span>
                     <span className="text-orange-500">{metrics.lowStockCount} Low</span>
                  </div>
               </div>
            </>
          )}

          {/* Customers / General */}
          <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Customers</p>
                      <h3 className="text-2xl font-bold text-slate-900">{metrics.totalCustomers}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
                      <Icon icon={FiUsers} size={16} />
                  </div>
              </div>
              <div className="flex items-center text-[10px] font-bold text-slate-400">
                 <span className="uppercase tracking-wide">Registered accounts</span>
              </div>
          </div>
       </div>

       {/* --- CHARTS SECTION --- */}
       {canViewOrders && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* 1. REVENUE CHART */}
            <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                     <Icon icon={FiActivity} className="mr-2 text-slate-400"/> Revenue Trend
                  </h3>
               </div>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                           dataKey="date" 
                           tick={{fontSize: 10, fill: '#64748b'}} 
                           axisLine={false} 
                           tickLine={false} 
                           dy={10}
                        />
                        <YAxis 
                           tick={{fontSize: 10, fill: '#64748b'}} 
                           axisLine={false} 
                           tickLine={false}
                           tickFormatter={(value) => `${value/1000}k`}
                        />
                        <Tooltip 
                           contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px', fontSize: '12px'}}
                           itemStyle={{color: '#0f172a', fontWeight: 'bold'}}
                           formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        />
                        <Line 
                           type="monotone" 
                           dataKey="revenue" 
                           stroke="#0f172a" 
                           strokeWidth={2} 
                           dot={{r: 3, fill: '#0f172a'}} 
                           activeDot={{r: 5}} 
                        />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* 2. ORDERS CHART */}
            <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                     <Icon icon={FiShoppingBag} className="mr-2 text-slate-400"/> Order Volume
                  </h3>
               </div>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                           dataKey="date" 
                           tick={{fontSize: 10, fill: '#64748b'}} 
                           axisLine={false} 
                           tickLine={false}
                           dy={10}
                        />
                        <YAxis 
                           tick={{fontSize: 10, fill: '#64748b'}} 
                           axisLine={false} 
                           tickLine={false}
                           allowDecimals={false}
                        />
                        <Tooltip 
                           cursor={{fill: '#f1f5f9'}}
                           contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px', fontSize: '12px'}}
                           itemStyle={{color: '#0f172a', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="orders" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={20} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* 3. STATUS DISTRIBUTION */}
            <div className="bg-white p-6 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200 lg:col-span-2">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                     <Icon icon={FiPieChart} className="mr-2 text-slate-400"/> Order Status Breakdown
                  </h3>
               </div>
               <div className="h-64 w-full flex flex-col md:flex-row items-center justify-center">
                  <div className="h-full w-full md:w-1/2">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {statusData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                           </Pie>
                           <Tooltip 
                              contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px', fontSize: '12px'}}
                              itemStyle={{color: '#0f172a', fontWeight: 'bold'}}
                           />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 grid grid-cols-2 gap-4 mt-4 md:mt-0 px-4">
                     {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center">
                           <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: entry.color}}></div>
                           <div>
                              <p className="text-xs font-bold text-slate-900">{entry.name}</p>
                              <p className="text-[10px] text-slate-500">{entry.value} Orders</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

         </div>
       )}

       {/* --- OPERATIONAL TABLES GRID --- */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* RECENT ORDERS TABLE */}
          {canViewOrders && (
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col h-full">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                     <Icon icon={FiShoppingBag} className="mr-2 text-slate-400" /> Recent Orders
                  </h3>
                  <Link to="/admin/orders" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">View All</Link>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                           <th className="px-6 py-3 tracking-widest">Order</th>
                           <th className="px-6 py-3 tracking-widest">Customer</th>
                           <th className="px-6 py-3 tracking-widest">Status</th>
                           <th className="px-6 py-3 tracking-widest text-right">Total</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs">
                        {recentOrders.length > 0 ? (
                           recentOrders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => window.location.href=`#/admin/orders`}>
                                 <td className="px-6 py-4 font-bold text-slate-900">
                                    #{order.order_number}
                                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{formatDate(order.created_at)}</span>
                                 </td>
                                 <td className="px-6 py-4 text-slate-600">
                                    {order.customer_name}
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest 
                                       ${order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                         order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                                         order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                                         'bg-slate-100 text-slate-600'}`}>
                                       {order.status}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-right font-bold text-slate-900">
                                    {formatCurrency(order.total)}
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No orders found in this period.</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* LOW STOCK TABLE */}
          {canViewCatalog && (
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col h-full">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                     <Icon icon={FiAlertTriangle} className="mr-2 text-orange-500" /> Low Stock Alerts
                  </h3>
                  <Link to="/admin/inventory" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Manage Inventory</Link>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                           <th className="px-6 py-3 tracking-widest">Product</th>
                           <th className="px-6 py-3 tracking-widest">SKU</th>
                           <th className="px-6 py-3 tracking-widest text-right">Stock</th>
                           <th className="px-6 py-3 tracking-widest">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs">
                        {lowStockItems.length > 0 ? (
                           lowStockItems.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4">
                                    <span className="font-bold text-slate-900 block truncate max-w-[150px]">{item.product?.title}</span>
                                    <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{item.title}</span>
                                 </td>
                                 <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                                    {item.sku}
                                 </td>
                                 <td className="px-6 py-4 text-right font-bold text-slate-900">
                                    {item.stock_qty}
                                 </td>
                                 <td className="px-6 py-4">
                                    {item.stock_qty === 0 ? (
                                       <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-sm">Out</span>
                                    ) : (
                                       <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-sm">Low</span>
                                    )}
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No inventory alerts. Good job!</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
       </div>

       {/* --- BOTTOM ROW: REVIEWS (Content Manager) --- */}
       {canViewContent && (
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                   <Icon icon={FiStar} className="mr-2 text-yellow-500" /> Latest Reviews
                </h3>
                <Link to="/admin/reviews" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900">Moderate All</Link>
             </div>
             <div className="divide-y divide-slate-100">
                {reviews.length > 0 ? (
                   reviews.map(review => (
                      <div key={review.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <div className="flex text-yellow-400 text-[10px]">
                                  {[...Array(5)].map((_, i) => (
                                     <Icon key={i} icon={FiStar} size={10} className={i < review.rating ? "fill-current" : "text-slate-200"} />
                                  ))}
                               </div>
                               <span className="text-xs font-bold text-slate-900">{review.title}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{review.body}</p>
                         </div>
                         <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase tracking-widest flex-shrink-0">
                            <span>{formatDate(review.created_at)}</span>
                            {/* Actions Stub */}
                            <button className="text-slate-900 font-bold hover:underline">View</button>
                         </div>
                      </div>
                   ))
                ) : (
                   <div className="px-6 py-8 text-center text-slate-400 italic text-sm">No recent reviews.</div>
                )}
             </div>
          </div>
       )}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Icon } from '../components/Icon';
import { 
  FiPlus, FiUpload, FiDownload, FiSearch, FiFilter, FiMoreVertical, 
  FiEdit3, FiCopy, FiTrash2, FiExternalLink, FiArchive, FiCheck, 
  FiX, FiChevronLeft, FiChevronRight, FiImage, FiToggleLeft, FiToggleRight 
} from 'react-icons/fi';

// Types
interface Product {
  id: string;
  title: string;
  slug: string;
  model: string;
  brand_id: string;
  watch_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: { name: string };
  variants: { id: string; price_bdt: number; stock_qty: number; is_active: boolean }[];
  images: { url: string; is_primary: boolean }[];
}

interface Brand {
  id: string;
  name: string;
}

export const AdminProductList: React.FC = () => {
  const navigate = useNavigate();
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, draft
  const [sort, setSort] = useState('created_at-desc'); // field-dir

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    fetchBrands();
  }, []);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery, filterBrand, filterType, filterStatus, sort]);

  const fetchBrands = async () => {
    const { data } = await supabase.from('brands').select('id, name').order('name');
    if (data) setBrands(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Base Query
      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(name),
          variants:product_variants(id, price_bdt, stock_qty, is_active),
          images:product_images(url, is_primary)
        `, { count: 'exact' });

      // Filters
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%, slug.ilike.%${searchQuery}%, model.ilike.%${searchQuery}%`);
      }
      if (filterBrand !== 'all') {
        query = query.eq('brand_id', filterBrand);
      }
      if (filterType !== 'all') {
        query = query.eq('watch_type', filterType);
      }
      if (filterStatus !== 'all') {
        query = query.eq('is_active', filterStatus === 'active');
      }

      // Sort
      const [sortField, sortDir] = sort.split('-');
      query = query.order(sortField, { ascending: sortDir === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ACTIONS ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(products.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} products? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    try {
      if (action === 'delete') {
        await supabase.from('products').delete().in('id', selectedIds);
      } else {
        const isActive = action === 'activate';
        await supabase.from('products').update({ is_active: isActive }).in('id', selectedIds);
      }
      // Refresh
      await fetchProducts();
      setSelectedIds([]);
    } catch (err) {
      console.error('Bulk action error:', err);
      alert('Action failed. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = () => {
    // Simple CSV Export of current view
    const headers = ['ID', 'Model', 'Title', 'Brand', 'Type', 'Status', 'Variants Count', 'Total Stock'];
    const rows = products.map(p => [
      p.id,
      p.model || '',
      `"${p.title.replace(/"/g, '""')}"`,
      p.brand?.name || '',
      p.watch_type,
      p.is_active ? 'Active' : 'Inactive',
      p.variants.length,
      p.variants.reduce((acc, v) => acc + v.stock_qty, 0)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for computing price range
  const getPriceRange = (variants: any[]) => {
    if (!variants.length) return 'No variants';
    const prices = variants.map(v => v.price_bdt);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  // Helper for computing stock
  const getStockSummary = (variants: any[]) => {
    const total = variants.reduce((acc, v) => acc + v.stock_qty, 0);
    const lowStock = variants.filter(v => v.stock_qty > 0 && v.stock_qty < 5).length;
    const outOfStock = variants.filter(v => v.stock_qty === 0).length;
    return { total, lowStock, outOfStock };
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage your catalog • {totalCount} items found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="hidden sm:flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
          <Link to="/admin/products/new" className="flex items-center px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-800 transition-all shadow-sm">
            <Icon icon={FiPlus} className="mr-2" /> Add Product
          </Link>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        
        {/* Search */}
        <div className="relative flex-grow w-full md:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search by title, SKU, model..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select 
            value={filterBrand} 
            onChange={(e) => setFilterBrand(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Types</option>
            <option value="smartwatch">Smart Watches</option>
            <option value="classic">Classic Watches</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>

          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="created_at-desc">Newest</option>
            <option value="created_at-asc">Oldest</option>
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>
      </div>

      {/* --- BULK ACTIONS --- */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-6 py-3 rounded-sm mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.length} Selected</span>
          <div className="flex gap-4">
            <button disabled={bulkActionLoading} onClick={() => handleBulkAction('activate')} className="text-[10px] font-bold uppercase tracking-widest hover:text-green-400">Activate</button>
            <button disabled={bulkActionLoading} onClick={() => handleBulkAction('deactivate')} className="text-[10px] font-bold uppercase tracking-widest hover:text-orange-400">Deactivate</button>
            <div className="w-px bg-white/20 h-4 my-auto"></div>
            <button disabled={bulkActionLoading} onClick={() => handleBulkAction('delete')} className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300">Delete</button>
          </div>
        </div>
      )}

      {/* --- TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-4">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.length === products.length && products.length > 0}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Price</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Stock</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-4 h-4 bg-slate-100 rounded"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-sm"></div>
                        <div className="space-y-2"><div className="w-32 h-3 bg-slate-100 rounded"></div><div className="w-16 h-2 bg-slate-100 rounded"></div></div>
                      </div>
                    </td>
                    <td colSpan={5} className="px-6 py-4"></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">No products found matching your criteria.</td>
                </tr>
              ) : (
                products.map(product => {
                  const stock = getStockSummary(product.variants);
                  const primaryImg = product.images.find(i => i.is_primary)?.url || product.images[0]?.url;

                  return (
                    <tr key={product.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(product.id) ? 'bg-slate-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(product.id)}
                          onChange={() => handleSelectRow(product.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-sm flex-shrink-0 overflow-hidden border border-slate-200">
                            {primaryImg ? (
                              <img src={primaryImg} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><Icon icon={FiImage} /></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 max-w-[200px] truncate" title={product.title}>{product.title}</p>
                            <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                               <span className="font-bold uppercase tracking-wider">{product.brand?.name || 'Unknown'}</span>
                               <span>•</span>
                               <span>{product.model}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-sm">
                          {product.watch_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs font-bold text-slate-900">{getPriceRange(product.variants)}</p>
                        {product.variants.length > 1 && <p className="text-[9px] text-slate-400">{product.variants.length} Variants</p>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-bold ${stock.total === 0 ? 'text-red-500' : 'text-slate-900'}`}>{stock.total}</span>
                          {stock.lowStock > 0 && <span className="text-[9px] text-orange-500 font-bold uppercase tracking-tighter">Low Stock</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/admin/products/${product.id}`} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="Edit">
                            <Icon icon={FiEdit3} size={14} />
                          </Link>
                          <a href={`#/p/${product.slug}`} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="View in Store">
                            <Icon icon={FiExternalLink} size={14} />
                          </a>
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

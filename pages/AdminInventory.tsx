
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiSearch, FiFilter, FiDownload, FiUpload, FiEdit3, 
  FiAlertTriangle, FiCheck, FiX, FiPlus, FiMinus, FiRefreshCw, 
  FiChevronLeft, FiChevronRight, FiBox, FiActivity 
} from 'react-icons/fi';

// --- TYPES ---
interface InventoryItem {
  id: string;
  sku: string;
  title: string; // Variant title
  price_bdt: number;
  stock_qty: number;
  updated_at: string;
  is_active: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    watch_type: string;
    brand?: { name: string };
    images?: { url: string; is_primary: boolean }[];
  };
}

interface AdjustModalState {
  isOpen: boolean;
  mode: 'single' | 'bulk';
  item?: InventoryItem; // For single mode
  type: 'add' | 'subtract' | 'set';
  value: number;
  reason: string;
}

const ADMIN_EDIT_ROLES = ['super_admin', 'catalog_manager'];

export const AdminInventory: React.FC = () => {
  const { user } = useAuth();
  
  // Data State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [canEdit, setCanEdit] = useState(false);

  // Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStock, setFilterStock] = useState('all'); // all, in, low, out
  const [filterType, setFilterType] = useState('all');
  const [sort, setSort] = useState('stock_qty-asc');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [adjustModal, setAdjustModal] = useState<AdjustModalState>({
    isOpen: false, mode: 'single', type: 'add', value: 0, reason: ''
  });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProcessing, setImportProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{success: number, failed: number} | null>(null);

  // --- 1. INITIAL LOAD & AUTH CHECK ---
  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [page, pageSize, searchQuery, filterStock, filterType, sort]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setCanEdit(roles.some(r => ADMIN_EDIT_ROLES.includes(r)));
  };

  // --- 2. DATA FETCHING ---
  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Query product_variants joining product info
      let query = supabase
        .from('product_variants')
        .select(`
          id, sku, title, price_bdt, stock_qty, updated_at, is_active,
          product:products!inner (
            id, title, slug, watch_type,
            brand:brands(name),
            images:product_images(url, is_primary)
          )
        `, { count: 'exact' });

      // Search Logic
      if (searchQuery) {
        // Filter by SKU OR Variant Title
        query = query.or(`sku.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      }

      if (filterType !== 'all') {
        query = query.eq('product.watch_type', filterType);
      }

      if (filterStock === 'out') query = query.eq('stock_qty', 0);
      if (filterStock === 'low') query = query.gt('stock_qty', 0).lt('stock_qty', 6);
      if (filterStock === 'in') query = query.gte('stock_qty', 6);

      // Sorting
      const [field, dir] = sort.split('-');
      if (field === 'stock_qty' || field === 'updated_at' || field === 'sku') {
        query = query.order(field, { ascending: dir === 'asc' });
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Map image logic: find primary, or fallback
      const formatted = (data || []).map((item: any) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        const images = product?.images || [];
        const primaryImg = images.find((i: any) => i.is_primary)?.url || images[0]?.url;
        
        return {
          ...item,
          product: {
            ...product,
            images: [{ url: primaryImg, is_primary: true }]
          }
        };
      });

      setInventory(formatted);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch inventory error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ACTIONS ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(inventory.map(i => i.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openAdjustModal = (item?: InventoryItem) => {
    if (!canEdit) {
      alert('You do not have permission to adjust stock.');
      return;
    }
    setAdjustModal({
      isOpen: true,
      mode: item ? 'single' : 'bulk',
      item,
      type: 'add',
      value: 0,
      reason: ''
    });
  };

  const applyStockAdjustment = async () => {
    const { mode, item, type, value, reason } = adjustModal;
    if (value < 0) { alert('Value must be positive'); return; }
    if (!reason.trim()) { alert('Reason is required'); return; }

    try {
      const targets = mode === 'single' && item ? [item] : inventory.filter(i => selectedIds.includes(i.id));
      
      const updates = targets.map(target => {
        let newStock = target.stock_qty;
        if (type === 'add') newStock += value;
        if (type === 'subtract') newStock = Math.max(0, newStock - value);
        if (type === 'set') newStock = Math.max(0, value);

        return {
          id: target.id,
          stock_qty: newStock,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase.from('product_variants').upsert(updates);
      if (error) throw error;

      alert(`Successfully updated ${updates.length} items.`);
      setAdjustModal({ ...adjustModal, isOpen: false });
      setSelectedIds([]);
      fetchInventory();

    } catch (err: any) {
      alert(`Failed to update stock: ${err.message}`);
    }
  };

  // --- 4. CSV IMPORT/EXPORT ---

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product', 'Variant', 'Stock', 'Price', 'Status'];
    const rows = inventory.map(i => [
      i.sku,
      `"${i.product.title.replace(/"/g, '""')}"`,
      i.title,
      i.stock_qty,
      i.price_bdt,
      i.is_active ? 'Active' : 'Inactive'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImportProcessing(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('sku') ? 1 : 0;
      
      let successCount = 0;
      let failCount = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const [sku, stockStr] = lines[i].split(',');
        const stock = parseInt(stockStr?.trim());
        
        if (sku && !isNaN(stock)) {
          const { error } = await supabase
            .from('product_variants')
            .update({ stock_qty: Math.max(0, stock), updated_at: new Date().toISOString() })
            .eq('sku', sku.trim());
          
          if (!error) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      }

      setImportResult({ success: successCount, failed: failCount });
      setImportProcessing(false);
      fetchInventory();
    };
    reader.readAsText(importFile);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage stock at SKU level • {totalCount} items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setImportModalOpen(true)}
            disabled={!canEdit}
            className="hidden sm:flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Icon icon={FiUpload} className="mr-2" /> Restock CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="hidden sm:flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all"
          >
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-grow w-full md:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search SKU or Variant Title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Types</option>
            <option value="smartwatch">Smart</option>
            <option value="classic">Classic</option>
          </select>
          <select 
            value={filterStock} 
            onChange={(e) => setFilterStock(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase tracking-wide text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="stock_qty-asc">Stock: Low to High</option>
            <option value="stock_qty-desc">Stock: High to Low</option>
            <option value="updated_at-desc">Updated: Newest</option>
            <option value="sku-asc">SKU: A-Z</option>
          </select>
        </div>
      </div>

      {/* BULK ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-6 py-3 rounded-sm mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.length} Selected</span>
          <div className="flex gap-4">
            <button onClick={() => openAdjustModal()} className="text-[10px] font-bold uppercase tracking-widest hover:text-blue-400 flex items-center">
              <Icon icon={FiEdit3} className="mr-2" /> Adjust Stock
            </button>
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
                    checked={selectedIds.length === inventory.length && inventory.length > 0}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product / SKU</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Variant</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Stock Level</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Updated</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-slate-50 rounded-sm"></div></td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">No inventory items found.</td></tr>
              ) : (
                inventory.map(item => {
                  const img = item.product.images?.[0]?.url;
                  const isLow = item.stock_qty > 0 && item.stock_qty <= 5;
                  const isOut = item.stock_qty === 0;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(item.id) ? 'bg-slate-50' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-sm flex-shrink-0 overflow-hidden border border-slate-200">
                            {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Icon icon={FiBox} /></div>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{item.product.title}</p>
                            <p className="text-[10px] font-mono text-slate-500">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {item.title}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-sm font-bold ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-slate-900'}`}>{item.stock_qty}</span>
                          {isOut && <span className="text-[8px] uppercase font-bold tracking-widest text-red-500 bg-red-50 px-1.5 py-0.5 rounded-sm mt-1">Out of Stock</span>}
                          {isLow && <span className="text-[8px] uppercase font-bold tracking-widest text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-sm mt-1">Low Stock</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] text-slate-400">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openAdjustModal(item)}
                          disabled={!canEdit}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all disabled:opacity-30"
                          title="Adjust Stock"
                        >
                          <Icon icon={FiEdit3} size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} • Showing {Math.min(totalCount, (page - 1) * pageSize + 1)}-{Math.min(totalCount, page * pageSize)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-white border border-slate-200 rounded-sm disabled:opacity-50"><Icon icon={FiChevronLeft} /></button>
            <button disabled={page * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-2 bg-white border border-slate-200 rounded-sm disabled:opacity-50"><Icon icon={FiChevronRight} /></button>
          </div>
        </div>
      </div>

      {/* ADJUST MODAL */}
      {adjustModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Adjust Stock</h3>
              <button onClick={() => setAdjustModal({...adjustModal, isOpen: false})}><Icon icon={FiX} /></button>
            </div>
            
            <div className="mb-6 bg-slate-50 p-4 rounded-sm border border-slate-100">
              {adjustModal.mode === 'single' && adjustModal.item ? (
                <>
                  <p className="text-xs font-bold text-slate-900">{adjustModal.item.product.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Variant: {adjustModal.item.title} • SKU: {adjustModal.item.sku}</p>
                  <p className="text-xs font-bold text-slate-900 mt-2">Current Stock: {adjustModal.item.stock_qty}</p>
                </>
              ) : (
                <p className="text-xs font-bold text-slate-900">Bulk Update: {selectedIds.length} Items Selected</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Operation</label>
                <div className="flex bg-slate-100 p-1 rounded-sm">
                  {(['add', 'subtract', 'set'] as const).map(t => (
                    <button 
                      key={t}
                      onClick={() => setAdjustModal({...adjustModal, type: t})}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${adjustModal.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Value</label>
                <input 
                  type="number" 
                  min="0"
                  value={adjustModal.value}
                  onChange={(e) => setAdjustModal({...adjustModal, value: parseInt(e.target.value) || 0})}
                  className="w-full border border-slate-200 p-3 text-sm font-bold outline-none focus:border-slate-900 rounded-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Reason (Required)</label>
                <input 
                  placeholder="e.g. New Shipment, Damage, Correction"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({...adjustModal, reason: e.target.value})}
                  className="w-full border border-slate-200 p-3 text-sm outline-none focus:border-slate-900 rounded-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setAdjustModal({...adjustModal, isOpen: false})} className="flex-1 py-3 border border-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-slate-50">Cancel</button>
              <button onClick={applyStockAdjustment} className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Import Stock CSV</h3>
              <button onClick={() => setImportModalOpen(false)}><Icon icon={FiX} /></button>
            </div>

            {!importResult ? (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-200 rounded-sm p-8 text-center">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="csvInput"
                  />
                  <label htmlFor="csvInput" className="cursor-pointer">
                    <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Icon icon={FiUpload} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600 block">Click to upload CSV</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">{importFile ? importFile.name : 'Format: sku, stock_qty'}</span>
                  </label>
                </div>
                <button 
                  onClick={handleImportCSV} 
                  disabled={!importFile || importProcessing}
                  className="w-full py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50"
                >
                  {importProcessing ? 'Processing...' : 'Start Import'}
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon={FiCheck} size={32} />
                </div>
                <h4 className="text-lg font-bold mb-2">Import Complete</h4>
                <p className="text-sm text-slate-500 mb-6">Updated {importResult.success} items. Failed {importResult.failed} items.</p>
                <button onClick={() => { setImportModalOpen(false); setImportResult(null); setImportFile(null); }} className="w-full py-3 border border-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-slate-50">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

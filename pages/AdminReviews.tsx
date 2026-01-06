
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiSearch, FiFilter, FiDownload, FiRefreshCcw, FiChevronRight, 
  FiCheck, FiX, FiImage, FiVideo, FiTrash2, FiPlus, FiStar, 
  FiExternalLink, FiUser, FiShoppingBag, FiMoreVertical, FiAlertCircle 
} from 'react-icons/fi';

// --- TYPES ---

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type MediaType = 'image' | 'video';

interface ReviewMedia {
  id: string;
  review_id: string;
  media_type: MediaType;
  url: string;
  sort_order: number;
  created_at: string;
}

interface Review {
  id: string;
  user_id: string | null;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  status: ReviewStatus;
  created_at: string;
  // Joins
  product?: {
    id: string;
    title: string;
    model: string;
    slug: string;
    brand?: { name: string };
  };
  reviewer?: {
    full_name: string;
    email: string;
    phone: string;
  };
  media: ReviewMedia[];
}

const ADMIN_EDIT_ROLES = ['super_admin', 'content_manager'];

export const AdminReviews: React.FC = () => {
  const { user } = useAuth();
  
  // Data State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  
  // Filter State
  const [activeTab, setActiveTab] = useState<ReviewStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [sort, setSort] = useState('created_at-desc');

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Drawer State
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [likelyPurchased, setLikelyPurchased] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<MediaType>('image');

  // --- 1. INIT & AUTH ---
  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    fetchReviews();
  }, [activeTab, sort]); // Refresh when tab/sort changes

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setCanEdit(roles.some(r => ADMIN_EDIT_ROLES.includes(r)));
  };

  // --- 2. DATA FETCHING ---
  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          product:products(id, title, model, slug, brand:brands(name)),
          reviewer:profiles(full_name, email, phone),
          media:review_media(*)
        `)
        .eq('status', activeTab);

      // Apply Sort
      const [field, dir] = sort.split('-');
      query = query.order(field, { ascending: dir === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      // Ensure media is sorted
      const formatted = (data || []).map((r: any) => ({
        ...r,
        media: r.media?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []
      }));

      setReviews(formatted);
      setSelectedIds([]); // Clear selection on tab change
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FILTERING ---
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        r.product?.title.toLowerCase().includes(q) || 
        r.product?.model.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q) ||
        r.reviewer?.full_name.toLowerCase().includes(q) ||
        r.reviewer?.email.toLowerCase().includes(q);

      // Rating
      const matchesRating = ratingFilter === 'all' || r.rating === parseInt(ratingFilter);

      // Verified
      const matchesVerified = verifiedFilter === 'all' 
        ? true 
        : verifiedFilter === 'yes' ? r.is_verified 
        : !r.is_verified;

      // Media
      const matchesMedia = mediaFilter === 'all' 
        ? true 
        : mediaFilter === 'yes' ? r.media.length > 0 
        : r.media.length === 0;

      return matchesSearch && matchesRating && matchesVerified && matchesMedia;
    });
  }, [reviews, searchQuery, ratingFilter, verifiedFilter, mediaFilter]);

  // --- 4. BULK ACTIONS ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredReviews.map(r => r.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkStatus = async (status: ReviewStatus) => {
    if (!canEdit || selectedIds.length === 0) return;
    if (!window.confirm(`Mark ${selectedIds.length} reviews as ${status}?`)) return;

    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status })
        .in('id', selectedIds);

      if (error) throw error;
      await fetchReviews();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // --- 5. DRAWER LOGIC ---
  const openDrawer = async (review: Review) => {
    setSelectedReview(review);
    setLikelyPurchased(false);
    
    // Check "Likely Purchased" if user exists
    if (review.user_id) {
      // Logic: Does this user have a delivered order containing this product?
      // Need complex join or sequential check.
      // Simplify: Find orders for user, then check order_items.
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', review.user_id)
        .in('status', ['delivered', 'shipped', 'completed']);
      
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('variant_id, variant:product_variants(product_id)')
          .in('order_id', orderIds);
        
        // Check if any variant belongs to reviewed product
        const match = items?.some((item: any) => item.variant?.product_id === review.product_id);
        if (match) setLikelyPurchased(true);
      }
    }
  };

  const closeDrawer = () => {
    setSelectedReview(null);
    setNewMediaUrl('');
  };

  const handleSingleStatus = async (status: ReviewStatus) => {
    if (!selectedReview || !canEdit) return;
    setDrawerLoading(true);
    try {
      await supabase.from('reviews').update({ status }).eq('id', selectedReview.id);
      
      // Update local state or refresh
      // Since tab filters by status, item will disappear from current view
      setReviews(prev => prev.filter(r => r.id !== selectedReview.id));
      closeDrawer();
    } catch (err) {
      alert('Update failed');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleToggleVerified = async () => {
    if (!selectedReview || !canEdit) return;
    const newVal = !selectedReview.is_verified;
    try {
      await supabase.from('reviews').update({ is_verified: newVal }).eq('id', selectedReview.id);
      setSelectedReview({ ...selectedReview, is_verified: newVal });
      // Update list state too
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? { ...r, is_verified: newVal } : r));
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleAddMedia = async () => {
    if (!selectedReview || !newMediaUrl || !canEdit) return;
    try {
      const { data, error } = await supabase.from('review_media').insert({
        review_id: selectedReview.id,
        media_type: newMediaType,
        url: newMediaUrl,
        sort_order: (selectedReview.media.length || 0) + 1
      }).select().single();

      if (error || !data) throw error;

      const updatedMedia = [...selectedReview.media, data];
      setSelectedReview({ ...selectedReview, media: updatedMedia });
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? { ...r, media: updatedMedia } : r));
      setNewMediaUrl('');
    } catch (err: any) {
      alert(`Add failed: ${err.message}`);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!selectedReview || !canEdit) return;
    if (!confirm('Delete this media?')) return;
    try {
      await supabase.from('review_media').delete().eq('id', mediaId);
      const updatedMedia = selectedReview.media.filter(m => m.id !== mediaId);
      setSelectedReview({ ...selectedReview, media: updatedMedia });
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? { ...r, media: updatedMedia } : r));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleExport = () => {
    const headers = ['Created', 'Status', 'Product', 'Reviewer', 'Rating', 'Verified', 'Media Count', 'Title', 'Body'];
    const rows = filteredReviews.map(r => [
      formatDate(r.created_at),
      r.status,
      `"${r.product?.title || 'Unknown'}"`,
      `"${r.reviewer?.full_name || 'Guest'}"`,
      r.rating,
      r.is_verified ? 'Yes' : 'No',
      r.media.length,
      `"${r.title?.replace(/"/g, '""') || ''}"`,
      `"${r.body?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reviews_${activeTab}_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER HELPERS ---
  const getRatingStars = (rating: number) => {
    return (
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Icon key={i} icon={FiStar} size={12} className={i < rating ? "fill-current" : "text-slate-200"} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reviews</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Moderate feedback • {filteredReviews.length} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReviews} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-1 mb-6 border-b border-slate-200 gap-8">
        {(['pending', 'approved', 'rejected'] as ReviewStatus[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-grow w-full md:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search reviews..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900">
            <option value="all">All Ratings</option>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
          </select>
          <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900">
            <option value="all">Verification</option>
            <option value="yes">Verified Only</option>
            <option value="no">Unverified</option>
          </select>
          <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900">
            <option value="all">Media</option>
            <option value="yes">With Media</option>
            <option value="no">Text Only</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900">
            <option value="created_at-desc">Newest</option>
            <option value="created_at-asc">Oldest</option>
            <option value="rating-desc">Highest Rated</option>
            <option value="rating-asc">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* BULK ACTIONS */}
      {selectedIds.length > 0 && canEdit && (
        <div className="bg-slate-900 text-white px-6 py-3 rounded-sm mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <span className="text-xs font-bold uppercase tracking-widest">{selectedIds.length} Selected</span>
          <div className="flex gap-4">
            <button disabled={bulkLoading} onClick={() => handleBulkStatus('approved')} className="text-[10px] font-bold uppercase tracking-widest hover:text-green-400 flex items-center"><Icon icon={FiCheck} className="mr-2"/> Approve</button>
            <button disabled={bulkLoading} onClick={() => handleBulkStatus('rejected')} className="text-[10px] font-bold uppercase tracking-widest hover:text-red-400 flex items-center"><Icon icon={FiX} className="mr-2"/> Reject</button>
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
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filteredReviews.length && filteredReviews.length > 0} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"/>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Reviewer</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rating</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Verified</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Media</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4].map(i => <tr key={i}><td colSpan={8} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td></tr>)
              ) : filteredReviews.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs">No reviews found.</td></tr>
              ) : (
                filteredReviews.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(r.id)} 
                        onChange={() => handleSelectRow(r.id)} 
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900 max-w-[200px] truncate">{r.product?.title || 'Unknown Product'}</p>
                      <Link to={`/p/${r.product?.slug}`} target="_blank" className="text-[10px] text-slate-400 hover:text-slate-900 flex items-center mt-0.5">
                        {r.product?.model} <Icon icon={FiExternalLink} size={8} className="ml-1"/>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-900">{r.reviewer?.full_name || 'Guest'}</div>
                      <div className="text-[10px] text-slate-400">{r.reviewer?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4">{getRatingStars(r.rating)}</td>
                    <td className="px-6 py-4 text-center">
                      {r.is_verified && <Icon icon={FiCheck} size={14} className="text-green-500 mx-auto" />}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.media.length > 0 && (
                        <div className="inline-flex items-center bg-slate-100 px-2 py-1 rounded-sm text-[10px] font-bold text-slate-600">
                          <Icon icon={FiImage} size={10} className="mr-1"/> {r.media.length}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDrawer(r)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all">
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

      {/* --- DRAWER (Sheet) --- */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={closeDrawer}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Review Details</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                    selectedReview.status === 'approved' ? 'bg-green-100 text-green-700' :
                    selectedReview.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>{selectedReview.status}</span>
                  <span className="text-xs text-slate-400">ID: {selectedReview.id.substring(0, 8)}</span>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 text-slate-400 hover:text-slate-900"><Icon icon={FiX} size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Product & User Info */}
              <div className="bg-slate-50 rounded-sm p-4 border border-slate-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product</p>
                    <Link to={`/p/${selectedReview.product?.slug}`} target="_blank" className="text-sm font-bold text-slate-900 hover:underline flex items-center">
                      {selectedReview.product?.title} <Icon icon={FiExternalLink} size={12} className="ml-1 text-slate-400"/>
                    </Link>
                    <p className="text-xs text-slate-500">{selectedReview.product?.brand?.name} • {selectedReview.product?.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviewer</p>
                    <p className="text-sm font-bold text-slate-900">{selectedReview.reviewer?.full_name || 'Guest'}</p>
                    <p className="text-xs text-slate-500">{selectedReview.reviewer?.email}</p>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  {getRatingStars(selectedReview.rating)}
                  <span className="text-[10px] text-slate-400">{formatDate(selectedReview.created_at)}</span>
                </div>
                {selectedReview.title && <h3 className="font-bold text-slate-900 mb-2">{selectedReview.title}</h3>}
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-sm border border-slate-100">
                  {selectedReview.body || <span className="italic text-slate-400">No written review</span>}
                </p>
              </div>

              {/* Verified Badge Toggle */}
              <div className="flex items-center justify-between py-4 border-y border-slate-100">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${selectedReview.is_verified ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'}`}>
                    <Icon icon={FiCheck} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Verified Purchase</p>
                    {likelyPurchased && !selectedReview.is_verified && <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">System Match: Likely Purchased</p>}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={handleToggleVerified} className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800">
                    {selectedReview.is_verified ? 'Unverify' : 'Mark Verified'}
                  </button>
                )}
              </div>

              {/* Media Gallery */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center justify-between">
                  <span>Media ({selectedReview.media.length})</span>
                </h4>
                
                {selectedReview.media.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReview.media.map(m => (
                      <div key={m.id} className="relative group aspect-square bg-slate-100 rounded-sm overflow-hidden border border-slate-200">
                        {m.media_type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                            <Icon icon={FiVideo} size={24} />
                            <video src={m.url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                          </div>
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                        {canEdit && (
                          <button 
                            onClick={() => handleDeleteMedia(m.id)}
                            className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                          >
                            <Icon icon={FiTrash2} size={14} />
                          </button>
                        )}
                        <a href={m.url} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 p-2 bg-white/90 text-slate-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm">
                          <Icon icon={FiExternalLink} size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No media attached.</p>
                )}

                {canEdit && (
                  <div className="mt-4 flex gap-2">
                    <select 
                      value={newMediaType} 
                      onChange={e => setNewMediaType(e.target.value as MediaType)}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-sm p-2 outline-none"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                    <input 
                      value={newMediaUrl}
                      onChange={e => setNewMediaUrl(e.target.value)}
                      placeholder="Add media URL..."
                      className="flex-grow bg-slate-50 border border-slate-200 text-xs rounded-sm p-2 outline-none focus:border-slate-900"
                    />
                    <button onClick={handleAddMedia} disabled={!newMediaUrl} className="px-3 bg-slate-200 text-slate-700 rounded-sm hover:bg-slate-300 disabled:opacity-50">
                      <Icon icon={FiPlus} />
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Footer Actions */}
            {canEdit && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => handleSingleStatus('rejected')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${selectedReview.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600'}`}
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleSingleStatus('approved')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${selectedReview.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}
                >
                  Approve
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

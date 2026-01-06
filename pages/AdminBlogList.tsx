
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { 
  FiPlus, FiDownload, FiSearch, FiEdit3, FiCopy, 
  FiTrash2, FiToggleLeft, FiToggleRight, FiExternalLink, 
  FiRefreshCcw, FiFilter, FiCheck, FiX, FiFileText
} from 'react-icons/fi';

// --- TYPES ---

interface Page {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  updated_at: string;
  created_at: string;
  content: {
    excerpt?: string;
    cover_image?: string;
    tags?: string[];
    featured?: boolean;
    author_name?: string;
  };
}

const ADMIN_EDIT_ROLES = ['super_admin', 'content_manager'];

export const AdminBlogList: React.FC = () => {
  const { user } = useAuth();
  
  // Data State
  const [posts, setPosts] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured'>('all');
  const [sort, setSort] = useState('created_at-desc');
  
  // Pagination (Simple client-side for now as blog counts are usually < 1000)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    checkPermissions();
    fetchPosts();
  }, [user]);

  const checkPermissions = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id);
    const roles = data?.map((r: any) => r.role?.name) || [];
    setUserRoles(roles);
    setCanEdit(roles.some(r => ADMIN_EDIT_ROLES.includes(r)));
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Fetch pages where slug starts with 'blog/'
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .ilike('slug', 'blog/%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ACTIONS ---

  const handleTogglePublish = async (post: Page) => {
    if (!canEdit) return;
    try {
      const newVal = !post.is_published;
      const { error } = await supabase.from('pages').update({ is_published: newVal }).eq('id', post.id);
      if (error) throw error;
      
      // Optimistic update
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_published: newVal } : p));
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleDuplicate = async (post: Page) => {
    if (!canEdit) return;
    try {
      const newSlug = `${post.slug}-copy-${Math.floor(Math.random() * 1000)}`;
      const { error } = await supabase.from('pages').insert({
        title: `${post.title} (Copy)`,
        slug: newSlug,
        content: post.content,
        is_published: false // Default to draft
      });
      
      if (error) throw error;
      await fetchPosts();
    } catch (err: any) {
      alert(`Error duplicating post: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userRoles.includes('super_admin')) {
      alert('Only Super Admins can delete posts.');
      return;
    }
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    try {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error deleting post: ${err.message}`);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Title', 'Slug', 'Status', 'Featured', 'Tags', 'Created', 'Updated'];
    const rows = filteredPosts.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.slug,
      p.is_published ? 'Published' : 'Draft',
      p.content.featured ? 'Yes' : 'No',
      `"${(p.content.tags || []).join(', ')}"`,
      formatDate(p.created_at),
      formatDate(p.updated_at)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blog_posts_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 3. FILTERING & SORTING ---

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.slug.toLowerCase().includes(q) ||
        p.content.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      const isPub = statusFilter === 'published';
      result = result.filter(p => p.is_published === isPub);
    }

    // Featured Filter
    if (featuredFilter === 'featured') {
      result = result.filter(p => p.content.featured === true);
    }

    // Sort
    result.sort((a, b) => {
      const [field, dir] = sort.split('-');
      const valA = field === 'title' ? a.title : field === 'updated_at' ? a.updated_at : a.created_at;
      const valB = field === 'title' ? b.title : field === 'updated_at' ? b.updated_at : b.created_at;
      
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [posts, searchQuery, statusFilter, featuredFilter, sort]);

  // Pagination Slice
  const paginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredPosts.length / pageSize);

  // --- RENDER ---

  if (!canEdit && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Icon icon={FiFileText} size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-slate-500">You do not have permission to manage blog content.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Blog Posts</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">
            Manage editorial content • {filteredPosts.length} entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPosts} className="p-2 bg-white border border-slate-200 rounded-sm hover:bg-slate-50 text-slate-600 transition-all">
            <Icon icon={FiRefreshCcw} size={16} />
          </button>
          <button onClick={handleExport} className="hidden sm:flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-50 transition-all">
            <Icon icon={FiDownload} className="mr-2" /> Export
          </button>
          <Link to="/admin/content/blog/new" className="flex items-center px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-slate-800 transition-all shadow-sm">
            <Icon icon={FiPlus} className="mr-2" /> New Post
          </Link>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 p-4 rounded-sm mb-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-grow w-full md:w-auto">
          <Icon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Search posts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-sm text-sm focus:border-slate-900 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select 
            value={featuredFilter} 
            onChange={(e) => setFeaturedFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="all">All Posts</option>
            <option value="featured">Featured Only</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-xs font-bold uppercase text-slate-600 outline-none focus:border-slate-900"
          >
            <option value="created_at-desc">Newest</option>
            <option value="created_at-asc">Oldest</option>
            <option value="title-asc">A-Z</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Post</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Slug</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Featured</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Updated</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}><td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td></tr>
                ))
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">No blog posts found.</td></tr>
              ) : (
                paginatedPosts.map(post => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-sm overflow-hidden flex-shrink-0 border border-slate-200">
                          {post.content.cover_image ? (
                            <img src={post.content.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><Icon icon={FiFileText} /></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{post.title}</p>
                          <p className="text-[10px] text-slate-400">{post.content.author_name || 'Unknown Author'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 truncate max-w-[200px]">
                      {post.slug}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleTogglePublish(post)} title="Toggle Status">
                        {post.is_published ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                            Draft
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {post.content.featured ? (
                        <Icon icon={FiCheck} className="text-blue-500 inline-block" size={16} />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[10px] text-slate-400">
                      {formatDate(post.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/admin/content/blog/${post.id}`} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="Edit">
                          <Icon icon={FiEdit3} size={14} />
                        </Link>
                        <button onClick={() => handleDuplicate(post)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="Duplicate">
                          <Icon icon={FiCopy} size={14} />
                        </button>
                        {/* Only show public link if published, or assume preview logic handles draft */}
                        <a href={`#/blog/${post.slug.replace('blog/', '')}`} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all" title="View Public">
                          <Icon icon={FiExternalLink} size={14} />
                        </a>
                        {userRoles.includes('super_admin') && (
                          <button onClick={() => handleDelete(post.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete">
                            <Icon icon={FiTrash2} size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-sm text-xs font-bold disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page >= totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded-sm text-xs font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

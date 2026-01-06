
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { 
  FiSave, FiArrowLeft, FiImage, FiTag, FiGlobe, FiEye, FiCheck, FiX, FiFileText, FiExternalLink
} from 'react-icons/fi';

interface BlogPostForm {
  title: string;
  slug: string; // The part AFTER "blog/"
  excerpt: string;
  body_markdown: string;
  cover_image: string;
  author_name: string;
  tags: string; // Comma separated for input
  featured: boolean;
  is_published: boolean;
  meta_title: string;
  meta_description: string;
  og_image: string;
}

export const AdminBlogPost: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState<BlogPostForm>({
    title: '',
    slug: '',
    excerpt: '',
    body_markdown: '',
    cover_image: '',
    author_name: 'Ruiz Editorial Team',
    tags: '',
    featured: false,
    is_published: false,
    meta_title: '',
    meta_description: '',
    og_image: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pages').select('*').eq('id', id).single();
      if (error) throw error;
      if (!data) throw new Error('Post not found');

      const c = data.content || {};
      
      // Parse slug: remove "blog/" prefix for the input field
      const slugPart = data.slug.startsWith('blog/') ? data.slug.substring(5) : data.slug;

      setFormData({
        title: data.title,
        slug: slugPart,
        is_published: data.is_published,
        excerpt: c.excerpt || '',
        body_markdown: c.body_markdown || '',
        cover_image: c.cover_image || '',
        author_name: c.author_name || 'Ruiz Editorial Team',
        tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
        featured: c.featured || false,
        meta_title: c.seo?.meta_title || '',
        meta_description: c.seo?.meta_description || '',
        og_image: c.seo?.og_image || ''
      });
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Could not load post.');
      navigate('/admin/content/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Checkbox handling
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      
      // Auto-slugify if creating new and user hasn't manually edited slug yet (or slug matches title logic)
      if (!isEditMode && name === 'title' && !prev.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return next;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrs: Record<string, string> = {};
    if (!formData.title.trim()) newErrs.title = 'Title is required';
    if (!formData.slug.trim()) newErrs.slug = 'Slug is required';
    if (!formData.excerpt.trim()) newErrs.excerpt = 'Excerpt is required';
    if (!formData.body_markdown.trim()) newErrs.body_markdown = 'Body content is required';
    
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      alert('Please fix errors.');
      return;
    }
    setSaving(true);

    try {
      // Construct full slug
      const fullSlug = `blog/${formData.slug.trim()}`;

      // Construct JSONB content
      const contentPayload = {
        excerpt: formData.excerpt,
        body_markdown: formData.body_markdown,
        cover_image: formData.cover_image,
        author_name: formData.author_name,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        featured: formData.featured,
        seo: {
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          og_image: formData.og_image
        },
        // Set published_at if publishing for first time? 
        // For simplicity, update on every publish or keep existing if handled by logic.
        // We'll just set it to now if published.
        published_at: formData.is_published ? new Date().toISOString() : null
      };

      const payload = {
        title: formData.title,
        slug: fullSlug,
        is_published: formData.is_published,
        content: contentPayload,
        updated_at: new Date().toISOString()
      };

      if (isEditMode) {
        const { error } = await supabase.from('pages').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pages').insert(payload);
        if (error) throw error;
      }

      alert('Post saved successfully.');
      navigate('/admin/content/blog');

    } catch (err: any) {
      console.error('Save error:', err);
      if (err.message?.includes('duplicate key')) {
        alert('Slug already exists. Please choose a unique slug.');
      } else {
        alert(`Error saving post: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse">Loading Editor...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/content/blog')} className="p-2 hover:bg-white rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <Icon icon={FiArrowLeft} size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEditMode ? 'Edit Post' : 'New Post'}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {formData.title || 'Untitled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${previewMode ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center bg-slate-900 text-white px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-sm"
          >
            <Icon icon={FiSave} className="mr-2" /> {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="bg-white p-8 md:p-12 border border-slate-200 rounded-sm shadow-sm max-w-3xl mx-auto">
           {formData.cover_image && <img src={formData.cover_image} alt="Cover" className="w-full h-64 object-cover mb-8 rounded-sm" />}
           <h1 className="text-4xl font-bold mb-4">{formData.title}</h1>
           <div className="prose prose-slate max-w-none whitespace-pre-wrap">
             {formData.body_markdown}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Post Title <span className="text-red-500">*</span></label>
                <input 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 ${errors.title ? 'border-red-300' : 'border-slate-100'}`}
                  placeholder="Enter a catchy title..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Slug <span className="text-red-500">*</span></label>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-sm overflow-hidden">
                  <span className="px-3 text-xs text-slate-400 font-mono bg-slate-100 border-r border-slate-200 py-3">blog/</span>
                  <input 
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className={`flex-grow bg-transparent p-3 text-sm outline-none font-mono text-slate-600 ${errors.slug ? 'text-red-500' : ''}`}
                    placeholder="post-url-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Excerpt (Summary) <span className="text-red-500">*</span></label>
                <textarea 
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 ${errors.excerpt ? 'border-red-300' : 'border-slate-100'}`}
                  placeholder="Brief summary for card display (~160 chars)..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Body Content (Markdown) <span className="text-red-500">*</span></label>
                <textarea 
                  name="body_markdown"
                  value={formData.body_markdown}
                  onChange={handleChange}
                  rows={20}
                  className={`w-full bg-slate-50 border p-3 text-sm font-mono rounded-sm outline-none focus:border-slate-900 leading-relaxed ${errors.body_markdown ? 'border-red-300' : 'border-slate-100'}`}
                  placeholder="# Heading&#10;&#10;Write your story here..."
                />
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm space-y-6">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center mb-4"><Icon icon={FiImage} className="mr-2"/> Media & Meta</h3>
               
               <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cover Image URL</label>
                  <input 
                    name="cover_image"
                    value={formData.cover_image}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                    placeholder="https://..."
                  />
                  {formData.cover_image && (
                    <div className="mt-2 relative h-32 w-full bg-slate-100 rounded-sm overflow-hidden">
                       <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover opacity-80" />
                    </div>
                  )}
               </div>

               <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tags (Comma separated)</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-sm focus-within:border-slate-900">
                     <Icon icon={FiTag} className="text-slate-400" />
                     <input 
                       name="tags"
                       value={formData.tags}
                       onChange={handleChange}
                       className="flex-grow bg-transparent text-sm outline-none"
                       placeholder="e.g. Guides, Style, New Arrivals"
                     />
                  </div>
               </div>
            </section>
          </div>

          {/* RIGHT COLUMN (Settings) */}
          <div className="space-y-8">
            
            {/* Publishing */}
            <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Icon icon={FiGlobe} className="mr-2 text-slate-400" /> Publishing
              </h3>
              
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-700">Publish Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="is_published" checked={formData.is_published} onChange={handleChange} className="sr-only peer"/>
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-700">Featured Post</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} className="sr-only peer"/>
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {formData.is_published && (
                <div className="pt-4 border-t border-slate-100">
                   <a 
                     href={`#/blog/${formData.slug}`} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="flex items-center justify-center w-full py-2 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 border border-slate-200 rounded-sm"
                   >
                     Open Public Post <Icon icon={FiExternalLink} className="ml-2" />
                   </a>
                </div>
              )}
            </section>

            {/* SEO */}
            <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Icon icon={FiEye} className="mr-2 text-slate-400" /> SEO Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Meta Title</label>
                  <input 
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-100 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                    placeholder={formData.title}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Meta Description</label>
                  <textarea 
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-100 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                    placeholder={formData.excerpt}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Author Name</label>
                  <input 
                    name="author_name"
                    value={formData.author_name}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-100 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </section>

          </div>
        </div>
      )}
    </div>
  );
};

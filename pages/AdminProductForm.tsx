
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { 
  FiSave, FiArrowLeft, FiPlus, FiTrash2, FiImage, FiMoreVertical, 
  FiCheck, FiX, FiAlertCircle, FiCamera, FiBox, FiTag, FiLayers, FiGlobe 
} from 'react-icons/fi';

// --- TYPES ---
interface Variant {
  id?: string;
  sku: string;
  title: string; // REQUIRED
  price_bdt: number; // REQUIRED
  compare_at_bdt?: number;
  stock_qty: number;
  is_active: boolean;
  warranty_months?: number;
  specs: Record<string, string>;
}

interface ProductImage {
  id?: string;
  url: string;
  is_primary: boolean;
}

interface ProductFormData {
  title: string;
  slug: string;
  brand_id: string;
  watch_type: string;
  model: string; // REQUIRED
  short_description: string; // stored in products
  highlights: string; // stored in products as array, input as comma-sep string
  is_active: boolean;
  // Content stored in 'pages' table
  description: string; 
  meta_title: string;
  meta_description: string;
}

export const AdminProductForm: React.FC = () => {
  const { id } = useParams(); // If id exists, we are editing
  const navigate = useNavigate();
  const isEditMode = !!id;

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  
  // Form Data
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    slug: '',
    brand_id: '',
    watch_type: 'classic',
    model: '',
    short_description: '',
    highlights: '',
    is_active: false,
    description: '',
    meta_title: '',
    meta_description: ''
  });

  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  
  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newImageUrl, setNewImageUrl] = useState('');

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchMeta();
    if (isEditMode) {
      fetchProduct();
    } else {
      // Default variant for new product
      setVariants([{
        sku: '',
        title: 'Standard',
        price_bdt: 0,
        stock_qty: 10,
        is_active: true,
        specs: {}
      }]);
    }
  }, [id]);

  const fetchMeta = async () => {
    const { data: b } = await supabase.from('brands').select('id, name').order('name');
    const { data: c } = await supabase.from('collections').select('id, name').order('name');
    if (b) setBrands(b);
    if (c) setCollections(c);
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      // 1. Fetch Core Product Data
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*),
          images:product_images(*),
          prod_cols:product_collections(collection_id)
        `)
        .eq('id', id)
        .single();

      if (error || !product) throw error;

      // 2. Fetch Extended Content from Pages table
      // We assume a convention: slug = "product/[product_slug]"
      const pageSlug = `product/${product.slug}`;
      const { data: pageData } = await supabase
        .from('pages')
        .select('content')
        .eq('slug', pageSlug)
        .single();

      const content = pageData?.content || {};

      setFormData({
        title: product.title,
        slug: product.slug,
        brand_id: product.brand_id,
        watch_type: product.watch_type,
        model: product.model || '',
        short_description: product.short_description || '',
        highlights: Array.isArray(product.highlights) ? product.highlights.join(', ') : '',
        is_active: product.is_active,
        // Extended
        description: content.long_description || '',
        meta_title: content.seo?.meta_title || '',
        meta_description: content.seo?.meta_description || ''
      });

      setVariants(product.variants || []);
      setImages(product.images?.sort((a: any, b: any) => (b.is_primary === a.is_primary) ? 0 : b.is_primary ? 1 : -1) || []);
      setSelectedCollections(product.prod_cols?.map((pc: any) => pc.collection_id) || []);

    } catch (err) {
      console.error('Error fetching product:', err);
      alert('Failed to load product data');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // Auto-generate slug from title if empty (only on create)
    if (name === 'title' && !isEditMode && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, {
      sku: '',
      title: variants.length > 0 ? `Option ${variants.length + 1}` : 'Standard',
      price_bdt: variants[0]?.price_bdt || 0,
      stock_qty: 0,
      is_active: true,
      specs: {}
    }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      alert('You must have at least one variant.');
      return;
    }
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
  };

  const addImage = () => {
    if (!newImageUrl) return;
    setImages([...images, { url: newImageUrl, is_primary: images.length === 0 }]);
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (newImages.length > 0 && !newImages.some(i => i.is_primary)) {
      newImages[0].is_primary = true;
    }
    setImages(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({ ...img, is_primary: i === index }));
    setImages(newImages);
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollections(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  // --- VALIDATION & SAVE ---

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (!formData.brand_id) newErrors.brand_id = 'Brand is required';
    
    // Variant Validation
    if (variants.length === 0) newErrors.variants = 'At least one variant is required';
    variants.forEach((v, i) => {
        if (!v.sku.trim()) newErrors.variants = `Variant #${i+1} needs a SKU`;
        if (!v.title.trim()) newErrors.variants = `Variant #${i+1} needs a Title`;
        if (v.price_bdt < 0) newErrors.variants = `Variant #${i+1} price cannot be negative`;
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      alert('Please fix errors before saving.');
      return;
    }
    setSaving(true);

    try {
      // 1. Upsert Core Product
      const productPayload = {
        title: formData.title,
        slug: formData.slug,
        brand_id: formData.brand_id,
        watch_type: formData.watch_type,
        model: formData.model,
        short_description: formData.short_description,
        highlights: formData.highlights ? formData.highlights.split(',').map(s => s.trim()).filter(Boolean) : [],
        is_active: formData.is_active,
        // default_warranty_months is optional in schema, can set if we had a field
      };

      let productId = id;

      if (isEditMode) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: newProd, error } = await supabase.from('products').insert(productPayload).select().single();
        if (error) throw error;
        productId = newProd.id;
      }

      if (!productId) throw new Error('Product ID missing');

      // 2. Upsert Extended Content (Pages)
      const pageSlug = `product/${formData.slug}`;
      const pageContent = {
        long_description: formData.description,
        seo: {
          meta_title: formData.meta_title,
          meta_description: formData.meta_description
        }
      };
      
      const { error: pageError } = await supabase.from('pages').upsert({
        slug: pageSlug,
        title: formData.title,
        content: pageContent,
        is_published: formData.is_active // Sync active state
      }, { onConflict: 'slug' });

      if (pageError) console.error('Page content save warning:', pageError);

      // 3. Sync Variants
      const variantsPayload = variants.map(v => ({
        ...v,
        product_id: productId,
        title: v.title || 'Standard', // Safe fallback
        price_bdt: Number(v.price_bdt),
        compare_at_bdt: v.compare_at_bdt ? Number(v.compare_at_bdt) : null,
        stock_qty: Number(v.stock_qty),
        specs: v.specs || {}
      }));

      const { error: varError } = await supabase.from('product_variants').upsert(variantsPayload);
      if (varError) throw varError;

      // 4. Sync Images (Re-insert strategy)
      await supabase.from('product_images').delete().eq('product_id', productId);
      if (images.length > 0) {
        const imagesPayload = images.map((img, idx) => ({
          product_id: productId,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: idx
        }));
        await supabase.from('product_images').insert(imagesPayload);
      }

      // 5. Sync Collections
      await supabase.from('product_collections').delete().eq('product_id', productId);
      if (selectedCollections.length > 0) {
        const colPayload = selectedCollections.map(cId => ({
          product_id: productId,
          collection_id: cId
        }));
        await supabase.from('product_collections').insert(colPayload);
      }

      navigate('/admin/products');

    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Error saving product: ${err.message}`);
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
          <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-white rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <Icon icon={FiArrowLeft} size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEditMode ? 'Edit Product' : 'New Product'}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {formData.title || 'Untitled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setFormData(p => ({...p, is_active: !p.is_active}))}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${formData.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
          >
            {formData.is_active ? 'Active' : 'Draft'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center bg-slate-900 text-white px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-sm"
          >
            <Icon icon={FiSave} className="mr-2" /> {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Main) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* A) Basic Info */}
          <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <Icon icon={FiBox} className="mr-2 text-slate-400" /> Basic Information
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Product Title <span className="text-red-500">*</span></label>
                  <input 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 ${errors.title ? 'border-red-300' : 'border-slate-100'}`}
                    placeholder="e.g. Ruiz Classic Chronograph"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Model Number <span className="text-red-500">*</span></label>
                  <input 
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 ${errors.model ? 'border-red-300' : 'border-slate-100'}`}
                    placeholder="e.g. RZ-1001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Brand <span className="text-red-500">*</span></label>
                  <select 
                    name="brand_id"
                    value={formData.brand_id}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 ${errors.brand_id ? 'border-red-300' : 'border-slate-100'}`}
                  >
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Type <span className="text-red-500">*</span></label>
                  <select 
                    name="watch_type"
                    value={formData.watch_type}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  >
                    <option value="classic">Classic Watch</option>
                    <option value="smartwatch">Smart Watch</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Slug (URL) <span className="text-red-500">*</span></label>
                <input 
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className={`w-full bg-slate-50 border p-3 text-sm rounded-sm outline-none focus:border-slate-900 font-mono text-slate-600 ${errors.slug ? 'border-red-300' : 'border-slate-100'}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Short Description</label>
                <textarea 
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  placeholder="Brief summary for listings..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Long Description (Rich Content)</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  placeholder="Detailed product info (saved to pages)..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Highlights (Comma Separated)</label>
                <input 
                  name="highlights"
                  value={formData.highlights}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-100 p-3 text-sm rounded-sm outline-none focus:border-slate-900"
                  placeholder="e.g. Sapphire Glass, 5ATM Waterproof, 2 Year Warranty"
                />
              </div>
            </div>
          </section>

          {/* B) Media */}
          <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <Icon icon={FiCamera} className="mr-2 text-slate-400" /> Media Gallery
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input 
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste Image URL..."
                className="flex-grow bg-slate-50 border border-slate-100 p-2 text-sm rounded-sm outline-none focus:border-slate-900"
              />
              <button onClick={addImage} type="button" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-sm">Add</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className={`relative group aspect-square border rounded-sm overflow-hidden ${img.is_primary ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setPrimaryImage(idx)} title="Set Primary" className="p-2 bg-white rounded-full hover:text-green-600"><Icon icon={FiCheck} size={14}/></button>
                    <button onClick={() => removeImage(idx)} title="Remove" className="p-2 bg-white rounded-full hover:text-red-600"><Icon icon={FiTrash2} size={14}/></button>
                  </div>
                  {img.is_primary && <span className="absolute top-1 left-1 bg-slate-900 text-white text-[8px] uppercase font-bold px-2 py-0.5">Primary</span>}
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-sm">
                  No images added.
                </div>
              )}
            </div>
          </section>

          {/* C) Variants */}
          <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center">
                <Icon icon={FiLayers} className="mr-2 text-slate-400" /> Variants (SKUs)
              </h2>
              <button onClick={addVariant} className="text-xs font-bold uppercase tracking-widest text-slate-900 hover:underline">+ Add Variant</button>
            </div>

            {errors.variants && <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 border border-red-100 rounded-sm flex items-center"><Icon icon={FiAlertCircle} className="mr-2"/> {errors.variants}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-3 w-1/4">SKU <span className="text-red-500">*</span></th>
                    <th className="p-3 w-1/4">Title/Color <span className="text-red-500">*</span></th>
                    <th className="p-3">Price (BDT) <span className="text-red-500">*</span></th>
                    <th className="p-3">Stock</th>
                    <th className="p-3 text-center">Active</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {variants.map((variant, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input 
                          value={variant.sku} 
                          onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                          placeholder="SKU-123"
                          className="w-full bg-white border border-slate-200 p-2 rounded-sm text-xs font-mono focus:border-slate-900 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          value={variant.title} 
                          onChange={(e) => handleVariantChange(idx, 'title', e.target.value)}
                          placeholder="e.g. Silver / Black"
                          className="w-full bg-white border border-slate-200 p-2 rounded-sm text-xs focus:border-slate-900 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number"
                          value={variant.price_bdt} 
                          onChange={(e) => handleVariantChange(idx, 'price_bdt', e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2 rounded-sm text-xs focus:border-slate-900 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number"
                          value={variant.stock_qty} 
                          onChange={(e) => handleVariantChange(idx, 'stock_qty', e.target.value)}
                          className={`w-20 bg-white border p-2 rounded-sm text-xs focus:border-slate-900 outline-none ${variant.stock_qty < 5 ? 'border-orange-200 bg-orange-50' : 'border-slate-200'}`}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input 
                          type="checkbox"
                          checked={variant.is_active}
                          onChange={(e) => handleVariantChange(idx, 'is_active', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <button onClick={() => removeVariant(idx)} className="text-slate-400 hover:text-red-500">
                          <Icon icon={FiTrash2} size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-8">
          
          {/* D) Collections */}
          <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center">
              <Icon icon={FiTag} className="mr-2 text-slate-400" /> Collections
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {collections.map(col => (
                <label key={col.id} className="flex items-center space-x-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer p-1">
                  <input 
                    type="checkbox" 
                    checked={selectedCollections.includes(col.id)}
                    onChange={() => toggleCollection(col.id)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" 
                  />
                  <span>{col.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* E) SEO (Saved to Pages) */}
          <section className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center">
              <Icon icon={FiGlobe} className="mr-2 text-slate-400" /> SEO (Page)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Meta Title</label>
                <input 
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-100 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  placeholder={formData.title}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Meta Description</label>
                <textarea 
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 p-2 text-xs rounded-sm outline-none focus:border-slate-900"
                  placeholder={formData.short_description}
                />
              </div>
            </div>
          </section>

          {/* F) Info */}
          <section className="bg-slate-50 border border-slate-100 rounded-sm p-6 text-xs text-slate-500 space-y-2">
            <p><strong className="text-slate-900">Total Stock:</strong> {variants.reduce((a,b) => a + Number(b.stock_qty), 0)} units</p>
            <p><strong className="text-slate-900">Variant Count:</strong> {variants.length}</p>
            {isEditMode && <p><strong className="text-slate-900">ID:</strong> {id}</p>}
          </section>

        </div>
      </div>
    </div>
  );
};

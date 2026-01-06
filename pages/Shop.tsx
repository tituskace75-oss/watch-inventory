
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { supabase } from '../lib/supabase';

export const Shop: React.FC = () => {
  const { collectionSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const q = searchParams.get('q');
  
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFilterData() {
      const { data: brandData } = await supabase.from('brands').select('id, name');
      if (brandData) setBrands(brandData);
    }
    fetchFilterData();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        let selectStr = `
          id, title, slug,
          brand:brands(name, id),
          variants:product_variants(id, price_bdt, compare_at_bdt, stock_qty, strap),
          images:product_images(url, is_primary)
        `;

        if (collectionSlug) {
          selectStr += `,
            product_collections!inner(
              collection:collections!inner(slug)
            )
          `;
        }

        let query = supabase
          .from('products')
          .select(selectStr);

        if (q) {
          query = query.or(`title.ilike.%${q}%, model.ilike.%${q}%`);
        }

        if (collectionSlug) {
          query = query.eq('product_collections.collection.slug', collectionSlug);
        }

        if (selectedBrands.length > 0) {
          query = query.in('brand_id', selectedBrands);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          let formatted = data.map((p: any) => {
            const primaryVariant = p.variants?.[0];
            const primaryImage = p.images?.find((img: any) => img.is_primary) || p.images?.[0];
            const brandInfo = Array.isArray(p.brand) ? p.brand[0] : p.brand;
            
            return {
              id: p.id,
              slug: p.slug,
              title: p.title,
              brand: brandInfo?.name || 'Ruiz',
              price: primaryVariant?.price_bdt || 0,
              compareAt: primaryVariant?.compare_at_bdt,
              image: primaryImage?.url || `https://picsum.photos/400/500?random=${p.id}`,
              type: primaryVariant?.strap
            };
          });

          if (sortBy === 'price-low') formatted.sort((a, b) => a.price - b.price);
          if (sortBy === 'price-high') formatted.sort((a, b) => b.price - a.price);

          setProducts(formatted);
        }
      } catch (err: any) {
        console.error('Error fetching products:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [collectionSlug, q, sortBy, selectedBrands]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tighter">
          {q ? `Search results for "${q}"` : collectionSlug ? collectionSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Collection'}
        </h1>
        <p className="text-slate-500 mt-2 uppercase text-[10px] tracking-[0.4em] font-bold">Showing premium timepieces</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <aside className="w-full lg:w-64 space-y-10 flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-5 border-b pb-3">Sort By</h3>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 text-sm rounded-sm font-medium outline-none">
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-5 border-b pb-3">Brands</h3>
            <div className="space-y-3">
              {brands.map(brand => (
                <label key={brand.id} className="flex items-center space-x-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer">
                  <input type="checkbox" checked={selectedBrands.includes(brand.id)} onChange={() => setSelectedBrands(prev => prev.includes(brand.id) ? prev.filter(b => b !== brand.id) : [...prev, brand.id])} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"/>
                  <span>{brand.name}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-grow">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-sm"/>)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {products.map(product => <ProductCard key={product.id} {...product} />)}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-sm">
              <p className="text-slate-500 font-medium">No products found matches your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

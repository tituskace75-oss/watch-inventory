
import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const BlogPost: React.FC = () => {
  const { slug } = useParams();

  // In a real app, fetch content based on slug.
  const post = {
    title: 'How to Choose the Perfect Smartwatch for Your Lifestyle',
    date: 'Oct 12, 2024',
    category: 'Guides',
    author: 'Ruiz Editorial Team',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop',
    content: `
      <p class="mb-6">In today's fast-paced world, a smartwatch is more than just a timepiece; it's a personal assistant, a fitness trainer, and a fashion statement wrapped around your wrist. With countless options flooding the market, finding the "perfect" one can feel overwhelming. But don't worry—we're here to break it down.</p>
      
      <h3 class="text-xl font-bold text-slate-900 mt-8 mb-4">1. Define Your Primary Use Case</h3>
      <p class="mb-6">Are you a fitness enthusiast tracking every calorie, or a business professional who needs to stay connected during meetings?
      <br/><br/>
      <strong>For the Fitness Buff:</strong> Look for advanced health metrics like SpO2 monitoring, ECG, and dedicated workout modes. Durable straps (silicone or nylon) are a must.
      <br/>
      <strong>For the Professional:</strong> Prioritize notifications, calendar integration, and a sleek design with metal or leather straps.</p>

      <h3 class="text-xl font-bold text-slate-900 mt-8 mb-4">2. Battery Life Matters</h3>
      <p class="mb-6">There's nothing worse than a dead watch by 5 PM. If you don't mind charging daily, an Apple Watch or Galaxy Watch offers the most features. However, if you prefer multi-day battery life, look towards brands like Amazfit or Huawei, which often balance functionality with efficiency.</p>

      <h3 class="text-xl font-bold text-slate-900 mt-8 mb-4">3. Compatibility is Key</h3>
      <p class="mb-6">Ensure the watch plays nicely with your phone. While most watches work with both Android and iOS, some features might be limited depending on your ecosystem.</p>

      <div class="bg-slate-50 p-6 border-l-4 border-slate-900 my-8 italic text-slate-600">
        "The best smartwatch is the one you actually wear. Choose a style that fits your wardrobe as much as your workout."
      </div>

      <h3 class="text-xl font-bold text-slate-900 mt-8 mb-4">Final Thoughts</h3>
      <p class="mb-6">At Ruiz, we curate smartwatches that hit the sweet spot between performance and price. Browse our collection to find your next digital companion.</p>
    `
  };

  return (
    <article>
      {/* Hero */}
      <div className="w-full h-[50vh] relative overflow-hidden bg-slate-100">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white">
           <div className="max-w-4xl mx-auto">
             <div className="flex items-center space-x-4 mb-4 text-[10px] font-bold uppercase tracking-widest">
               <span className="bg-white text-slate-900 px-3 py-1 rounded-sm">{post.category}</span>
               <span>{post.date}</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-bold tracking-tighter leading-tight mb-4">{post.title}</h1>
             <p className="text-xs uppercase tracking-widest opacity-80">By {post.author}</p>
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div 
          className="prose prose-slate prose-lg max-w-none font-light leading-relaxed text-slate-600 first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px] first-letter:text-slate-900"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center">
          <Link to="/blog" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">← Back to Journal</Link>
          <div className="flex space-x-4">
             <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Share:</span>
             <button className="text-slate-400 hover:text-slate-900">FB</button>
             <button className="text-slate-400 hover:text-slate-900">TW</button>
             <button className="text-slate-400 hover:text-slate-900">LN</button>
          </div>
        </div>
      </div>

      {/* Related CTA */}
      <div className="bg-slate-900 text-white py-20 text-center px-4">
        <h2 className="text-3xl font-bold tracking-tighter mb-4">Ready to find your match?</h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">Explore our curated collection of premium smart and classic watches.</p>
        <Link to="/shop" className="bg-white text-slate-900 px-10 py-4 font-bold tracking-widest uppercase hover:bg-slate-100 transition-colors inline-block">Shop Collection</Link>
      </div>
    </article>
  );
};

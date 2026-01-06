
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { FiCheck, FiAward, FiUsers, FiClock, FiShield } from 'react-icons/fi';

export const About: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative py-24 bg-slate-50 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-4 block animate-in fade-in slide-in-from-bottom-2">Our Story</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900 mb-8 animate-in fade-in slide-in-from-bottom-4 delay-100">
            Redefining Time <br/> in Bangladesh.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 delay-200">
            Ruiz was born from a simple belief: A watch isn't just a tool to tell time; it's a statement of character. We bridge the gap between premium global brands and the Bangladeshi wrist.
          </p>
        </div>
      </section>

      {/* Image Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-[4/5] md:aspect-square bg-slate-100 rounded-sm overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1596568359553-a56de6970068?q=80&w=1000&auto=format&fit=crop" 
              alt="Watch Craftsmanship" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Authenticity, Guaranteed.</h2>
            <div className="space-y-6 text-slate-600 font-light leading-loose">
              <p>
                In a market flooded with replicas, Ruiz stands as a fortress of authenticity. Every smartwatch and classic timepiece in our collection is sourced directly from authorized distributors or the brands themselves.
              </p>
              <p>
                We started in 2024 with a small collection and a big promise: <strong>No fakes, no hidden fees, just genuine style.</strong> Today, we serve thousands of customers across 64 districts of Bangladesh with the same promise.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              {[
                { icon: FiShield, title: 'Official Warranty', text: 'Brand coverage on all items.' },
                { icon: FiClock, title: 'Fast Delivery', text: '12h in Dhaka, 24h Nationwide.' },
                { icon: FiUsers, title: 'Expert Support', text: 'Real humans, not bots.' },
                { icon: FiAward, title: 'Curated Quality', text: 'Only the best models selected.' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 flex-shrink-0">
                    <Icon icon={item.icon} size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-800">
            {[
              { val: '2000+', label: 'Happy Customers' },
              { val: '64', label: 'Districts Covered' },
              { val: '100%', label: 'Authentic Products' },
              { val: '4.9', label: 'Average Rating' },
            ].map((stat, i) => (
              <div key={i} className="p-4">
                <div className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">{stat.val}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4">
        <h2 className="text-3xl font-bold tracking-tighter mb-6">Join the Ruiz Lifestyle</h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-10 font-light">
          Whether you need a smartwatch for fitness or a classic piece for the boardroom, we have something for you.
        </p>
        <Link to="/shop" className="bg-slate-900 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all">
          Explore Collection
        </Link>
      </section>
    </div>
  );
};

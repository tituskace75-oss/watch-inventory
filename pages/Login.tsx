
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { FiMail, FiLock, FiArrowRight, FiCheckCircle, FiShield, FiTruck, FiAlertCircle } from 'react-icons/fi';

const ADMIN_ROLES = ['super_admin', 'catalog_manager', 'order_manager', 'content_manager'];

export const Login: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      checkRoleAndRedirect(user.id);
    }
  }, [user]);

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      // Fetch roles for the user
      // Assuming 'user_roles' table maps user_id to role_id, and 'roles' table has the name
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          role:roles (name)
        `)
        .eq('user_id', userId);

      // Flatten roles array
      const roleNames = userRoles?.map((r: any) => r.role?.name) || [];
      
      // Check if user has any admin role
      const isAdmin = roleNames.some((r: string) => ADMIN_ROLES.includes(r));

      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/account');
      }
    } catch (err) {
      // Fallback to customer account if role check fails
      navigate('/account');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Redirect logic handled by useEffect, but we call it here for faster response
        await checkRoleAndRedirect(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  if (user) return null; // Prevent flash while redirecting

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-slate-900 block mb-2">RUIZ</Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Sign in to manage orders & account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 flex items-start space-x-3 rounded-sm">
                <Icon icon={FiAlertCircle} className="text-red-500 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon icon={FiMail} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  placeholder="Email address"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon icon={FiLock} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-500 font-medium">
                  Remember me
                </label>
              </div>

              <div className="text-xs">
                {/* Stub for now, can be implemented later */}
                <a href="#" className="font-bold text-slate-900 hover:text-slate-700 hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-bold uppercase tracking-[0.2em] rounded-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && (
                  <span className="absolute right-4 flex items-center">
                    <Icon icon={FiArrowRight} />
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-500 mb-4">Don't have an account?</p>
             <Link 
               to="/register" 
               className="inline-block w-full text-center py-3 border border-slate-200 rounded-sm text-xs font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-colors"
             >
               Create Account
             </Link>
          </div>
        </div>
        
        {/* Trust Strip */}
        <div className="flex justify-center space-x-6 text-slate-400">
           <div className="flex items-center text-[10px] font-bold uppercase tracking-wider">
              <Icon icon={FiShield} className="mr-2" size={14} /> Secure
           </div>
           <div className="flex items-center text-[10px] font-bold uppercase tracking-wider">
              <Icon icon={FiTruck} className="mr-2" size={14} /> Fast
           </div>
           <div className="flex items-center text-[10px] font-bold uppercase tracking-wider">
              <Icon icon={FiCheckCircle} className="mr-2" size={14} /> Genuine
           </div>
        </div>
      </div>
    </div>
  );
};

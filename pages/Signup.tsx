
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';
import { FiUser, FiMail, FiPhone, FiLock, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';

export const Signup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    if (!formData.fullName.trim()) return 'Full Name is required.';
    if (!formData.email.trim()) return 'Email is required.';
    if (!formData.phone.trim()) return 'Phone number is required.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (!formData.acceptTerms) return 'You must accept the Terms & Conditions.';
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create Profile
        // Note: Supabase trigger might handle this, but explicit insert is safer for data completeness
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            phone: formData.phone,
          });

        if (profileError) {
           console.error('Profile creation warning:', profileError);
           // Non-blocking, continue
        }

        // 3. Handle Success
        // If email confirmation is off, user is logged in automatically.
        // If on, session is null.
        if (authData.session) {
           navigate('/account');
        } else {
           alert('Account created successfully! Please check your email to confirm your account.');
           navigate('/login');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-slate-900 block mb-2">RUIZ</Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Join the Ruiz lifestyle
          </p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-200">
          <form className="space-y-5" onSubmit={handleSignup}>
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 flex items-start space-x-3 rounded-sm">
                <Icon icon={FiAlertCircle} className="text-red-500 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon={FiUser} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                placeholder="Full Name"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon={FiMail} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                placeholder="Email Address"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon={FiPhone} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                placeholder="Phone Number (01XXXXXXXXX)"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon={FiLock} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                placeholder="Create Password (min 6 chars)"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon={FiCheck} className="text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none rounded-sm relative block w-full pl-10 px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                placeholder="Confirm Password"
              />
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  required
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded cursor-pointer"
                />
              </div>
              <div className="ml-2 text-xs text-slate-500">
                <label htmlFor="acceptTerms">I agree to the <Link to="/legal/terms" className="text-slate-900 underline font-bold">Terms of Service</Link> and <Link to="/legal/privacy" className="text-slate-900 underline font-bold">Privacy Policy</Link>.</label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-bold uppercase tracking-[0.2em] rounded-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Creating Account...' : 'Register'}
              {!loading && (
                <span className="absolute right-4 flex items-center">
                  <Icon icon={FiArrowRight} />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-500 mb-4">Already have an account?</p>
             <Link 
               to="/login" 
               className="inline-block w-full text-center py-3 border border-slate-200 rounded-sm text-xs font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-colors"
             >
               Sign In
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

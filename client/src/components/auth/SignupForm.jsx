import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiUser,
  HiEnvelope,
  HiLockClosed,
  HiEye,
  HiEyeSlash,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';

const SignupForm = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Must be at least 6 characters';
    else if (!/\d/.test(form.password)) errs.password = 'Must contain at least one number';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    await register(form.name.trim(), form.email, form.password);
    setLoading(false);
  };

  const inputClass = (field) =>
    `w-full pl-11 pr-4 py-3 theme-bg-input border rounded-xl theme-text
     placeholder:theme-text-muted focus:outline-none input-glow transition-all
     ${errors[field] ? 'border-red-500' : 'theme-border focus:border-primary-500'}`;

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-4"
      id="signup-form"
    >
      {/* Name */}
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
          <input
            id="signup-name"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="John Doe"
            className={inputClass('name')}
          />
        </div>
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            id="signup-email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="you@example.com"
            className={inputClass('email')}
          />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Password
        </label>
        <div className="relative">
          <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange('password')}
            placeholder="Min 6 characters with a number"
            className={`${inputClass('password')} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text"
          >
            {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="signup-confirm" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            id="signup-confirm"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Repeat your password"
            className={inputClass('confirmPassword')}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        id="signup-submit"
        className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 
          hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl
          shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40
          disabled:opacity-50 disabled:cursor-not-allowed
          transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Login link */}
        <p className="text-center text-sm theme-text-tertiary">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </motion.form>
  );
};

export default SignupForm;

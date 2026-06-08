import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiEnvelope, HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';

const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-5"
      id="login-form"
    >
      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`w-full pl-11 pr-4 py-3 theme-bg-input border rounded-xl theme-text
              placeholder:theme-text-muted focus:outline-none input-glow transition-all
              ${errors.email ? 'border-red-500' : 'theme-border focus:border-primary-500'}`}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium theme-text-secondary mb-1.5">
          Password
        </label>
        <div className="relative">
          <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className={`w-full pl-11 pr-12 py-3 theme-bg-input border rounded-xl theme-text
              placeholder:theme-text-muted focus:outline-none input-glow transition-all
              ${errors.password ? 'border-red-500' : 'theme-border focus:border-primary-500'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text"
          >
            {showPassword ? (
              <HiEyeSlash className="w-5 h-5" />
            ) : (
              <HiEye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        id="login-submit"
        className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 
          hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl
          shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40
          disabled:opacity-50 disabled:cursor-not-allowed
          transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-sm theme-text-tertiary">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </motion.form>
  );
};

export default LoginForm;

import { motion } from 'framer-motion';
import LoginForm from '../components/auth/LoginForm';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { Toaster } from 'react-hot-toast';

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center theme-bg p-4">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
            bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 mb-4">
            <HiChatBubbleLeftRight className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">ChatterBox</h1>
          <p className="theme-text-tertiary mt-2">Sign in to continue chatting</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-6">
          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

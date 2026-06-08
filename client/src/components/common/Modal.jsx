import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';

/**
 * Reusable modal component with backdrop blur and animations.
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${sizeClasses[size]} glass rounded-2xl overflow-hidden`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b theme-border-subtle">
                <h2 className="text-lg font-semibold theme-text">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg theme-bg-hover theme-text-muted 
                    transition-colors"
                >
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

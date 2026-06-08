import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiArrowDownTray } from 'react-icons/hi2';
import { downloadBase64File } from '../../utils/fileHelpers';

/**
 * Full-screen image lightbox with download button.
 * Opens when user clicks on an image message.
 */
const ImageLightbox = ({ isOpen, imageUrl, fileName, onClose }) => {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadBase64File(imageUrl, fileName || 'image.png');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <p className="text-white/70 text-sm truncate max-w-xs">
              {fileName || 'Image'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <HiArrowDownTray className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={imageUrl}
            alt={fileName || 'Full size image'}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightbox;

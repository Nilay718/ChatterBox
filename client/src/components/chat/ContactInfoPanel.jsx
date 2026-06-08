import { useState } from 'react';
import {
  HiXMark,
  HiEnvelope,
  HiClock,
  HiInformationCircle,
} from 'react-icons/hi2';
import ImageLightbox from './ImageLightbox';
import { useSocket } from '../../context/SocketContext';
import { formatLastSeen } from '../../utils/helpers';

/**
 * WhatsApp-style contact info panel.
 * Shows the other user's avatar (click to enlarge), name, bio, email, and status.
 */
const ContactInfoPanel = ({ isOpen, onClose, user: contactUser }) => {
  const { isUserOnline } = useSocket();
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);

  if (!contactUser || !isOpen) return null;

  const isOnline = isUserOnline(contactUser._id);

  return (
    <>
      <div
        className="w-[350px] h-full border-l theme-border-subtle theme-bg-secondary overflow-y-auto shrink-0"
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b theme-border-subtle shrink-0 sticky top-0 theme-bg-secondary z-10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-bg-hover theme-text-muted transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
          <h3 className="font-semibold theme-text">Contact Info</h3>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center py-8 px-4">
          <button
            onClick={() => contactUser.avatar && setShowAvatarLightbox(true)}
            className="relative group cursor-pointer"
          >
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary-500/20 
              group-hover:ring-primary-500/40 transition-all shadow-xl">
              {contactUser.avatar ? (
                <img
                  src={contactUser.avatar}
                  alt={contactUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 
                  flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {contactUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            {/* Online indicator */}
            {isOnline && (
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-accent-500 
                border-[3px] border-gray-800 shadow" />
            )}
            {/* Hover overlay */}
            {contactUser.avatar && (
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 
                transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 
                  transition-opacity">
                  View Photo
                </span>
              </div>
            )}
          </button>

          {/* Name */}
          <h2 className="text-xl font-bold theme-text mt-4">{contactUser.name}</h2>

          {/* Status */}
          <p className={`text-sm mt-1 ${isOnline ? 'text-accent-400' : 'theme-text-muted'}`}>
            {isOnline ? '● Online' : contactUser.lastSeen 
              ? `Last seen ${formatLastSeen(contactUser.lastSeen)}`
              : 'Offline'
            }
          </p>
        </div>

        {/* Info Cards */}
        <div className="px-4 space-y-2">
          {/* Bio */}
          <div className="p-4 rounded-xl theme-bg-tertiary">
            <div className="flex items-center gap-2 mb-2">
              <HiInformationCircle className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-medium theme-text-muted uppercase tracking-wider">
                About
              </span>
            </div>
            <p className="text-sm theme-text leading-relaxed">
              {contactUser.bio || 'Hey there! I am using ChatterBox.'}
            </p>
          </div>

          {/* Email */}
          <div className="p-4 rounded-xl theme-bg-tertiary">
            <div className="flex items-center gap-2 mb-2">
              <HiEnvelope className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-medium theme-text-muted uppercase tracking-wider">
                Email
              </span>
            </div>
            <p className="text-sm text-primary-400">{contactUser.email}</p>
          </div>

          {/* Member since */}
          <div className="p-4 rounded-xl theme-bg-tertiary">
            <div className="flex items-center gap-2 mb-2">
              <HiClock className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-medium theme-text-muted uppercase tracking-wider">
                Joined
              </span>
            </div>
            <p className="text-sm theme-text">
              {contactUser.createdAt
                ? new Date(contactUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'
              }
            </p>
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-6 shrink-0" />
      </div>

      {/* Avatar Lightbox */}
      {contactUser.avatar && (
        <ImageLightbox
          isOpen={showAvatarLightbox}
          imageUrl={contactUser.avatar}
          fileName={`${contactUser.name}_avatar`}
          onClose={() => setShowAvatarLightbox(false)}
        />
      )}
    </>
  );
};

export default ContactInfoPanel;

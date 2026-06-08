import { getInitials } from '../../utils/helpers';

/**
 * Avatar component with image fallback to initials.
 * Shows online indicator when specified.
 */
const Avatar = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  showStatus = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const statusSizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const initials = getInitials(name);

  // Generate a consistent color from the name
  const colorIndex = name
    ? name.charCodeAt(0) % 6
    : 0;
  const bgColors = [
    'from-primary-500 to-primary-700',
    'from-accent-500 to-accent-700',
    'from-rose-500 to-rose-700',
    'from-amber-500 to-amber-700',
    'from-cyan-500 to-cyan-700',
    'from-violet-500 to-violet-700',
  ];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${bgColors[colorIndex]} 
            flex items-center justify-center font-semibold text-white ring-2 ring-black/10 dark:ring-white/10`}
        >
          {initials}
        </div>
      )}

      {/* Online status indicator */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} rounded-full border-2
            ${isOnline ? 'bg-accent-400' : 'bg-dark-500 dark:bg-dark-500'}`}
          style={{ borderColor: 'var(--bg-secondary)' }}
        />
      )}
    </div>
  );
};

export default Avatar;

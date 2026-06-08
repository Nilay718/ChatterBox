/**
 * Notification badge component.
 * Shows a count (caps at 99+) or a simple dot indicator.
 */
const Badge = ({ count = 0, dot = false, className = '' }) => {
  if (!dot && count <= 0) return null;

  if (dot) {
    return (
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full bg-primary-500 ${className}`}
      />
    );
  }

  const displayCount = count > 99 ? '99+' : count;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 
        text-xs font-bold text-white bg-primary-500 rounded-full shadow-lg 
        shadow-primary-500/30 ${className}`}
    >
      {displayCount}
    </span>
  );
};

export default Badge;

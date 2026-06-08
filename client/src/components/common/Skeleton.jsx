/**
 * Skeleton loading components for placeholder UI.
 */

export const SkeletonLine = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`skeleton ${width} ${height} ${className}`} />
);

export const SkeletonCircle = ({ size = 'w-11 h-11', className = '' }) => (
  <div className={`skeleton ${size} rounded-full ${className}`} />
);

/**
 * Chat list item skeleton.
 */
export const ChatSkeleton = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <SkeletonCircle />
    <div className="flex-1 space-y-2">
      <SkeletonLine width="w-1/3" />
      <SkeletonLine width="w-2/3" height="h-3" />
    </div>
    <SkeletonLine width="w-10" height="h-3" />
  </div>
);

/**
 * Message bubble skeleton.
 */
export const MessageSkeleton = ({ isOwn = false }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-pulse`}>
    {!isOwn && <SkeletonCircle size="w-8 h-8" className="mr-2 mt-1" />}
    <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
      <SkeletonLine width={isOwn ? 'w-48' : 'w-56'} height="h-12" className="rounded-2xl" />
      <SkeletonLine width="w-12" height="h-2" />
    </div>
  </div>
);

/**
 * Full chat list skeleton (multiple items).
 */
export const ChatListSkeleton = ({ count = 8 }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <ChatSkeleton key={i} />
    ))}
  </div>
);

/**
 * Messages area skeleton.
 */
export const MessageListSkeleton = ({ count = 6 }) => (
  <div className="p-4 space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} isOwn={i % 3 === 0} />
    ))}
  </div>
);

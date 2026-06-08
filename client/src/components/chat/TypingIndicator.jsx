/**
 * Animated typing indicator with bouncing dots.
 */
const TypingIndicator = ({ users = [] }) => {
  if (users.length === 0) return null;

  const names = users.map((u) => u.name?.split(' ')[0]).join(', ');
  const verb = users.length > 1 ? 'are' : 'is';

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 animate-fade-in">
      <div className="flex items-center gap-1 p-2 theme-bg-tertiary rounded-2xl rounded-bl-md border theme-border-subtle">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
      <span className="text-xs theme-text-muted">
        {names} {verb} typing
      </span>
    </div>
  );
};

export default TypingIndicator;

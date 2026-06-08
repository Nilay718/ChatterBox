import { HiMagnifyingGlass, HiXMark } from 'react-icons/hi2';

const SearchBar = ({ value, onChange, placeholder = 'Search chats...' }) => {
  return (
    <div className="relative">
      <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 theme-bg-input border theme-border-subtle rounded-lg
          text-sm theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500/50
          input-glow transition-all"
        id="sidebar-search"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text-secondary"
        >
          <HiXMark className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;

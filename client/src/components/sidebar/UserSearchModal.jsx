import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useChat } from '../../context/ChatContext';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { SkeletonLine, SkeletonCircle } from '../common/Skeleton';
import api from '../../api/axios';
import { HiMagnifyingGlass } from 'react-icons/hi2';

const UserSearchModal = ({ isOpen, onClose }) => {
  const { accessOrCreateChat } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  // Search users when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/users/search', {
          params: { q: debouncedQuery },
        });
        setResults(data.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    searchUsers();
  }, [debouncedQuery]);

  const handleSelectUser = async (userId) => {
    try {
      await accessOrCreateChat(userId);
      onClose();
      setQuery('');
      setResults([]);
    } catch {
      // Error handled in context
    }
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Chat" size="md">
      {/* Search input */}
      <div className="relative mb-4">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-10 pr-4 py-3 theme-bg-input border theme-border rounded-xl
            theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500
            input-glow transition-all"
          autoFocus
          id="user-search-input"
        />
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto space-y-1">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <SkeletonCircle size="w-10 h-10" />
                <div className="space-y-1.5 flex-1">
                  <SkeletonLine width="w-1/3" height="h-3" />
                  <SkeletonLine width="w-1/2" height="h-2.5" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 && debouncedQuery ? (
          <div className="py-8 text-center">
            <p className="theme-text-tertiary">No users found</p>
            <p className="theme-text-muted text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          results.map((resultUser) => (
            <button
              key={resultUser._id}
              onClick={() => handleSelectUser(resultUser._id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl theme-bg-hover
                transition-colors text-left group"
            >
              <Avatar
                src={resultUser.avatar}
                name={resultUser.name}
                size="sm"
                isOnline={resultUser.isOnline}
                showStatus
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium theme-text group-hover:text-primary-400 transition-colors truncate">
                  {resultUser.name}
                </p>
                <p className="text-xs theme-text-muted truncate">{resultUser.email}</p>
              </div>
            </button>
          ))
        )}

        {!debouncedQuery && (
          <div className="py-8 text-center">
            <p className="theme-text-muted text-sm">
              Type a name or email to find someone
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserSearchModal;

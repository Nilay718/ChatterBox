import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { useChat } from '../../context/ChatContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api/axios';
import { HiMagnifyingGlass, HiXMark, HiUserPlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { createGroup } = useChat();

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 400);

  // Search users
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/users/search', {
          params: { q: debouncedQuery },
        });
        // Filter out already-selected users
        const filtered = data.data.filter(
          (u) => !selectedUsers.some((s) => s._id === u._id)
        );
        setSearchResults(filtered);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, selectedUsers]);

  const addUser = (user) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
    setSearchQuery('');
  };

  const removeUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error('Select at least 2 members');
      return;
    }

    setCreating(true);
    try {
      await createGroup(
        groupName.trim(),
        selectedUsers.map((u) => u._id)
      );
      handleClose();
    } catch {
      // Error handled in context
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setGroupName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Group Chat" size="md">
      {/* Group name */}
      <div className="mb-4">
        <label className="block text-sm font-medium theme-text-secondary mb-1.5">
          Group Name
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name..."
          className="w-full px-4 py-2.5 theme-bg-input border theme-border rounded-xl
            theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500
            input-glow transition-all text-sm"
          id="group-name-input"
        />
      </div>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedUsers.map((u) => (
            <span
              key={u._id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-500/20 
                text-primary-300 rounded-full text-xs font-medium"
            >
              {u.name}
              <button
                onClick={() => removeUser(u._id)}
                className="hover:text-primary-100 transition-colors"
              >
                <HiXMark className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search users to add */}
      <div className="mb-4">
        <label className="block text-sm font-medium theme-text-secondary mb-1.5">
          Add Members ({selectedUsers.length} selected)
        </label>
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2.5 theme-bg-input border theme-border rounded-xl
              theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500
              input-glow transition-all text-sm"
          />
        </div>
      </div>

      {/* Search results */}
      <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
        {loading ? (
          <p className="text-center theme-text-muted py-4 text-sm">Searching...</p>
        ) : searchResults.length > 0 ? (
          searchResults.map((user) => (
            <button
              key={user._id}
              onClick={() => addUser(user)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg theme-bg-hover
                transition-colors text-left group"
            >
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium theme-text truncate">{user.name}</p>
                <p className="text-xs theme-text-muted truncate">{user.email}</p>
              </div>
              <HiUserPlus className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
            </button>
          ))
        ) : (
          debouncedQuery && (
            <p className="text-center theme-text-muted py-4 text-sm">No users found</p>
          )
        )}
      </div>

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={creating || !groupName.trim() || selectedUsers.length < 2}
        className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 
          hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl
          shadow-lg shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed
          transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm"
        id="create-group-submit"
      >
        {creating ? 'Creating...' : `Create Group (${selectedUsers.length + 1} members)`}
      </button>
    </Modal>
  );
};

export default CreateGroupModal;

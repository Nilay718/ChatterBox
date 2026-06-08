import { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { HiCamera, HiCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';

// 8 predefined avatar URLs using DiceBear Adventurer style (free, no signup needed)
const PREDEFINED_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=d1f4d9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco&backgroundColor=fde2e4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=bde0fe',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nala&backgroundColor=e2ece9',
];

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile, updateProfileJson } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setSelectedAvatar(null);
    }
  }, [isOpen, user]);

  // Handle predefined avatar selection
  const handleAvatarSelect = (url) => {
    setSelectedAvatar(url === selectedAvatar ? null : url);
  };

  // Handle custom image upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('name', name.trim() || user?.name);
      formData.append('bio', bio.trim());
      await updateProfile(formData);
      setSelectedAvatar(null);
      onClose();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save profile changes (name, bio, predefined avatar)
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const updates = { name: trimmedName, bio: bio.trim() };
      if (selectedAvatar) {
        updates.avatar = selectedAvatar;
      }
      await updateProfileJson(updates);
      onClose();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Current display avatar: selected predefined > current user avatar > null (initials)
  const displayAvatar = selectedAvatar || user?.avatar;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
      <div className="space-y-6">
        {/* Current avatar display */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <Avatar
              src={displayAvatar}
              name={user?.name}
              size="xl"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 
                transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <HiCamera className="w-6 h-6 text-white" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs theme-text-muted mt-2">
            {uploading ? 'Uploading...' : 'Click avatar to upload custom photo'}
          </p>
        </div>

        {/* Predefined avatars grid */}
        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-2">
            Or Choose an Avatar
          </label>
          <div className="grid grid-cols-4 gap-3">
            {PREDEFINED_AVATARS.map((url, index) => (
              <button
                key={index}
                onClick={() => handleAvatarSelect(url)}
                className={`relative rounded-xl p-1 transition-all duration-200 
                  ${selectedAvatar === url
                    ? 'ring-2 ring-primary-500 bg-primary-500/10 scale-105'
                    : 'theme-bg-hover ring-1 ring-transparent hover:ring-primary-500/30'
                  }`}
              >
                <img
                  src={url}
                  alt={`Avatar ${index + 1}`}
                  className="w-full aspect-square rounded-lg object-cover"
                  loading="lazy"
                />
                {selectedAvatar === url && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 
                    flex items-center justify-center">
                    <HiCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-2.5 theme-bg-input border theme-border rounded-xl
              theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500
              input-glow transition-all text-sm"
            placeholder="Your name"
          />
        </div>

        {/* Bio input */}
        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={2}
            className="w-full px-4 py-2.5 theme-bg-input border theme-border rounded-xl
              theme-text placeholder:theme-text-muted focus:outline-none focus:border-primary-500
              input-glow transition-all text-sm resize-none"
            placeholder="Tell something about yourself..."
          />
          <p className="text-xs theme-text-muted mt-1 text-right">{bio.length}/200</p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-1.5">
            Email
          </label>
          <p className="text-sm theme-text-muted px-4 py-2.5">{user?.email}</p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 
            hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl
            shadow-lg shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed
            transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
};

export default ProfileModal;

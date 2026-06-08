import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      const { user: userData, accessToken, refreshToken } = data.data;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(userData);
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });

      const { user: userData, accessToken, refreshToken } = data.data;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — logout should always succeed client-side
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      toast.success('Logged out successfully');
    }
  }, []);

  const updateProfile = useCallback(async (formData) => {
    try {
      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = data.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed.';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  // JSON-based profile update (for predefined avatars, name, bio without file upload)
  const updateProfileJson = useCallback(async (updates) => {
    try {
      const { data } = await api.put('/users/profile', updates);

      const updatedUser = data.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed.';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    updateProfileJson,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

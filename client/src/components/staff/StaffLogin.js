import React, { useState } from 'react';
import staffAuthService from '../../utils/staffAuthService';

const StaffLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  // Get target path from URL params (where user was trying to go)
  const getTargetPath = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect') || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await staffAuthService.login(credentials.username, credentials.password);
      
      if (result.success) {
        // Role-based redirect after successful login
        if (result.user && result.user.role) {
          const role = result.user.role.toLowerCase();
          const targetPath = getTargetPath();
          
          switch (role) {
            case 'manager':
              window.location.href = targetPath || '/admin';
              break;
            case 'chef':
            case 'waiter':
              window.location.href = targetPath || '/staff';
              break;
            case 'cashier':
              window.location.href = targetPath || '/reception';
              break;
            default:
              window.location.href = targetPath || '/admin';
          }
        } else {
          window.location.href = getTargetPath() || '/admin';
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Predefined staff credentials for quick login (using database credentials)
  const staffAccounts = [
    { username: 'manager', password: 'Staff2024!', role: 'Manager', color: 'bg-purple-600' },
    { username: 'chef', password: 'Staff2024!', role: 'Chef', color: 'bg-orange-600' },
    { username: 'waiter', password: 'Staff2024!', role: 'Waiter', color: 'bg-blue-600' },
    { username: 'cashier', password: 'Staff2024!', role: 'Cashier', color: 'bg-green-600' }
  ];

  const quickLogin = (account) => {
    setCredentials({
      username: account.username,
      password: account.password
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">👥</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Staff Login</h1>
          <p className="text-slate-600">Access your staff dashboard</p>
        </div>

        {/* Quick Login Buttons */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Quick Login:</p>
          <div className="grid grid-cols-2 gap-2">
            {staffAccounts.map((account) => (
              <button
                key={account.username}
                onClick={() => quickLogin(account)}
                className={`${account.color} text-white text-xs py-2 px-3 rounded-lg hover:opacity-90 transition-opacity`}
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Staff Credentials Info */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-2">Default Staff Credentials:</p>
          <div className="space-y-1 text-xs text-slate-600">
            <div>Manager: manager / Staff2024!</div>
            <div>Chef: chef / Staff2024!</div>
            <div>Waiter: waiter / Staff2024!</div>
            <div>Cashier: cashier / Staff2024!</div>
          </div>
        </div>

        {/* Back to Admin */}
        <div className="mt-4 text-center">
          <a
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Admin Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;

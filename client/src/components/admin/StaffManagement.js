import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../services/apiService';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'Waiter'
  });
  const [showPasswordField, setShowPasswordField] = useState(false);

  const roles = ['Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper'];

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get('/api/admin/staff');
      if (response.success) {
        setStaff(response.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      alert('Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      if (editingStaff) {
        // Update existing staff
        const updateData = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        };
        
        // Include password only if it's being changed
        if (showPasswordField && formData.password) {
          updateData.password = formData.password;
        }
        
        response = await fetchApi.put(`/api/admin/staff/${editingStaff.id}`, updateData);
      } else {
        // Add new staff
        response = await fetchApi.post('/api/admin/staff', formData);
      }

      if (response.success) {
        alert(response.message);
        setShowModal(false);
        setEditingStaff(null);
        setFormData({
          username: '',
          password: '',
          fullName: '',
          email: '',
          phone: '',
          role: 'Waiter'
        });
        setShowPasswordField(false);
        fetchStaff();
      } else {
        alert(response.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      username: staffMember.username,
      password: '',
      fullName: staffMember.full_name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role
    });
    setShowPasswordField(false);
    setShowModal(true);
  };

  const handleDelete = async (staffId, username) => {
    if (window.confirm(`Are you sure you want to delete staff member "${username}"?`)) {
      try {
        const response = await fetchApi.delete(`/api/admin/staff/${staffId}`);
        if (response.success) {
          alert('Staff member deleted successfully');
          fetchStaff();
        } else {
          alert(response.message || 'Delete failed');
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Failed to delete staff member');
      }
    }
  };

  const handleResetPassword = async (staffId, username) => {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (newPassword) {
      try {
        const response = await fetchApi.post(`/api/admin/staff/${staffId}/reset-password`, {
          newPassword
        });
        if (response.success) {
          alert('Password reset successfully');
        } else {
          alert(response.message || 'Password reset failed');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password');
      }
    }
  };

  const toggleStatus = async (staffId, currentStatus) => {
    try {
      const response = await fetchApi.put(`/api/admin/staff/${staffId}`, {
        isActive: !currentStatus
      });
      if (response.success) {
        fetchStaff();
      } else {
        alert(response.message || 'Status update failed');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Manager': 'bg-purple-100 text-purple-700',
      'Chef': 'bg-orange-100 text-orange-700',
      'Waiter': 'bg-blue-100 text-blue-700',
      'Cashier': 'bg-green-100 text-green-700',
      'Kitchen Helper': 'bg-yellow-100 text-yellow-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-600 mt-2">Manage restaurant staff members and their roles</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({
              username: '',
              password: '',
              fullName: '',
              email: '',
              phone: '',
              role: 'Waiter'
            });
            setShowPasswordField(false);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-500">Loading staff members...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Staff Member</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Role</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Contact</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900">{member.full_name}</div>
                        <div className="text-sm text-slate-500">@{member.username}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {member.email && <div className="text-slate-900">{member.email}</div>}
                        {member.phone && <div className="text-slate-500">{member.phone}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleStatus(member.id, member.is_active)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          member.is_active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } transition-colors`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetPassword(member.id, member.username)}
                          className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, member.username)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {editingStaff && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Change Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordField(!showPasswordField);
                        if (!showPasswordField) {
                          setFormData(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showPasswordField ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>
                  {showPasswordField && (
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingStaff ? 'Update' : 'Add'} Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../services/apiService';
import MenuItemModal from './MenuItemModal';
import CategoryManagementModal from './CategoryManagementModal';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image_url: '',
    preparation_time: '',
    is_vegetarian: false,
    is_spicy: false
  });

  // Load real data from API
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get('/api/menu');
      const items = Array.isArray(response) ? response : [];
      setMenuItems(items);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(items.map(item => item.category))];
      const categoryData = [{ id: 'all', name: 'All Categories', count: items.length }];
      uniqueCategories.forEach(cat => {
        categoryData.push({
          id: cat,
          name: cat,
          count: items.filter(item => item.category === cat).length
        });
      });
      setCategories(categoryData);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuItems([]);
      setCategories([{ id: 'all', name: 'All Categories', count: 0 }]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAvailability = async (itemId) => {
    try {
      await fetchApi.patch(`/api/menu/${itemId}/toggle`);
      // Update local state immediately for instant UI feedback
      setMenuItems(items =>
        items.map(item =>
          item.id === itemId ? { ...item, is_available: !item.is_available } : item
        )
      );
      // Refresh from server to ensure consistency
      await fetchMenuItems();
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('❌ Error toggling availability: ' + error.message);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting menu item:', itemId);
      const response = await fetchApi.delete(`/api/menu/${itemId}`);
      console.log('📥 Delete response:', response);
      
      if (response.success) {
        if (response.markedUnavailable) {
          // Item was marked unavailable instead of deleted
          alert(`⚠️ ${response.message}\n\nThe item has been marked as unavailable instead.`);
        } else {
          // Item was successfully deleted
          alert('✅ Menu item deleted successfully!');
        }
        
        console.log('✅ Menu item operation completed');
        
        // Force refresh from server to get updated list
        await fetchMenuItems();
      } else {
        alert('❌ Failed to delete menu item');
      }
    } catch (error) {
      console.error('❌ Error deleting menu item:', error);
      alert('❌ Error deleting menu item: ' + error.message);
      // Still try to refresh in case the delete actually worked
      await fetchMenuItems();
    }
  };

  const handleAddItem = async () => {
    try {
      console.log('📝 Adding menu item:', formData);
      
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        available: true,
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        is_vegetarian: formData.is_vegetarian || false,
        is_spicy: formData.is_spicy || false,
        image_url: formData.image_url.trim() || null
      };

      console.log('📤 Sending data to API:', itemData);
      const response = await fetchApi.post('/api/menu', itemData);
      console.log('📥 API Response:', response);
      
      if (response.success || response.id) {
        console.log('✅ Menu item added successfully');
        alert('✅ Menu item added successfully!');
        setShowAddModal(false);
        // Reset form
        setFormData({
          name: '',
          price: '',
          category: '',
          description: '',
          image_url: '',
          preparation_time: '',
          is_vegetarian: false,
          is_spicy: false
        });
        // Refresh menu items
        await fetchMenuItems();
      } else {
        alert('❌ Failed to add menu item. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error adding menu item:', error);
      alert('❌ Error adding menu item: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateItem = async () => {
    try {
      console.log('📝 Updating menu item:', editingItem.id, formData);
      
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        is_vegetarian: formData.is_vegetarian || false,
        is_spicy: formData.is_spicy || false,
        image_url: formData.image_url.trim() || null
      };

      console.log('📤 Sending update to API:', itemData);
      const response = await fetchApi.put(`/api/menu/${editingItem.id}`, itemData);
      console.log('📥 API Response:', response);
      
      if (response.success) {
        console.log('✅ Menu item updated successfully');
        alert('✅ Menu item updated successfully!');
        setShowEditModal(false);
        setEditingItem(null);
        // Reset form
        setFormData({
          name: '',
          price: '',
          category: '',
          description: '',
          image_url: '',
          preparation_time: '',
          is_vegetarian: false,
          is_spicy: false
        });
        // Refresh menu items
        await fetchMenuItems();
      } else {
        alert('❌ Failed to update menu item. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error updating menu item:', error);
      alert('❌ Error updating menu item: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || '',
      image_url: item.image_url || '',
      preparation_time: item.preparation_time || '',
      is_vegetarian: item.is_vegetarian || false,
      is_spicy: item.is_spicy || false
    });
    setShowEditModal(true);
  };

  const handleCategoryManagement = async (action) => {
    try {
      console.log('📂 Category management action:', action);

      if (action.action === 'add') {
        // Just close the modal - category will be created when first item is added
        alert(`✅ Category "${action.categoryName}" will be available when you add items to it`);
        setShowCategoryModal(false);
        await fetchMenuItems();
      } else if (action.action === 'edit') {
        // Rename category for all items
        const itemsToUpdate = menuItems.filter(item => item.category === action.oldName);
        
        if (itemsToUpdate.length === 0) {
          alert('No items found in this category');
          return;
        }

        console.log(`📝 Updating ${itemsToUpdate.length} items from "${action.oldName}" to "${action.newName}"`);
        
        // Update each item
        for (const item of itemsToUpdate) {
          await fetchApi.put(`/api/menu/${item.id}`, {
            ...item,
            category: action.newName
          });
        }
        
        alert(`✅ Category renamed successfully! ${itemsToUpdate.length} items updated.`);
        await fetchMenuItems();
      } else if (action.action === 'delete') {
        // Remove category from all items (set to 'Uncategorized')
        const itemsToUpdate = menuItems.filter(item => item.category === action.categoryName);
        
        if (itemsToUpdate.length > 0) {
          console.log(`🗑️ Removing category from ${itemsToUpdate.length} items`);
          
          for (const item of itemsToUpdate) {
            await fetchApi.put(`/api/menu/${item.id}`, {
              ...item,
              category: 'Uncategorized'
            });
          }
          
          alert(`✅ Category deleted! ${itemsToUpdate.length} items moved to "Uncategorized".`);
        } else {
          alert('✅ Category deleted!');
        }
        
        await fetchMenuItems();
      }
    } catch (error) {
      console.error('❌ Error managing category:', error);
      alert('❌ Error managing category: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Menu Management</h1>
            <p className="text-slate-600 mt-2">Manage your restaurant's menu items and categories</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">📂</span>
              Manage Categories
            </button>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  price: '',
                  category: '',
                  description: '',
                  image_url: '',
                  preparation_time: '',
                  is_vegetarian: false,
                  is_spicy: false
                });
                setShowAddModal(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">➕</span>
              Add New Item
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {category.name}
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                selectedCategory === category.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-3 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-200"></div>
              <div className="p-6">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded mb-4"></div>
                <div className="h-8 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Menu Items Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onToggleAvailability={toggleAvailability}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <span className="text-6xl mb-4 block opacity-50">🍽️</span>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No menu items found</h3>
          <p className="text-slate-600 mb-6">Try adjusting your search or category filter</p>
          <button
            onClick={() => {
              setFormData({
                name: '',
                price: '',
                category: '',
                description: '',
                image_url: '',
                preparation_time: '',
                is_vegetarian: false,
                is_spicy: false
              });
              setShowAddModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            ➕ Add First Item
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <MenuItemModal
          isOpen={showAddModal || showEditModal}
          isEdit={showEditModal}
          formData={formData}
          setFormData={setFormData}
          existingCategories={categories.map(cat => cat.name).filter(name => name !== 'All Categories')}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={showEditModal ? handleUpdateItem : handleAddItem}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModal
          isOpen={showCategoryModal}
          categories={categories}
          menuItems={menuItems}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleCategoryManagement}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Items</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{menuItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Available</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {menuItems.filter(item => item.is_available).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {menuItems.filter(item => !item.is_available).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Avg Price</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                NPR {menuItems.length > 0 ? Math.round(menuItems.reduce((sum, item) => sum + parseFloat(item.price), 0) / menuItems.length) : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Menu Item Card Component
const MenuItemCard = ({ item, onToggleAvailability, onEdit, onDelete }) => {
  const getCategoryIcon = (category) => {
    const icons = {
      appetizers: '🥟',
      mains: '🍽️',
      beverages: '🥤',
      desserts: '🍰'
    };
    return icons[category] || '🍴';
  };

  const getPopularityColor = (popularity) => {
    if (popularity >= 90) return 'text-green-600 bg-green-100';
    if (popularity >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-50">{getCategoryIcon(item.category)}</span>
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            item.is_available
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {item.is_available ? '✅ Available' : '❌ Out of Stock'}
          </span>
        </div>

        {/* Preparation Time Badge */}
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            ⏱️ {item.preparation_time}min
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h3>
            <p className="text-slate-600 text-sm line-clamp-2">{item.description}</p>
          </div>
          <div className="text-right ml-4">
            <p className="text-2xl font-bold text-slate-900">NPR {parseFloat(item.price).toFixed(0)}</p>
            <div className="flex gap-1 mt-1">
              {item.is_vegetarian && <span className="text-xs bg-green-100 text-green-600 px-1 rounded">🌱 Veg</span>}
              {item.is_spicy && <span className="text-xs bg-red-100 text-red-600 px-1 rounded">🌶️ Spicy</span>}
            </div>
          </div>
        </div>

        {/* Category & Details */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-md font-medium">
              {item.category}
            </span>
            <span className="text-xs text-slate-500">ID: {item.id}</span>
          </div>
          {item.allergens && (
            <div className="text-xs text-red-600">
              ⚠️ {item.allergens}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggleAvailability(item.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
              item.is_available
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {item.is_available ? '❌ Unavailable' : '✅ Available'}
          </button>
          
          <button
            onClick={() => onEdit(item)}
            className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
          >
            ✏️ Edit
          </button>
          
          <button
            onClick={() => onDelete(item.id)}
            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;

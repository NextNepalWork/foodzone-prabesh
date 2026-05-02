import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../services/apiService';
import MenuItemModal from './MenuItemModal';
import CategoryManagementModal from './CategoryManagementModal';

const MenuManagement = ({ refreshTrigger }) => {
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

  // Watch for refresh trigger from global refresh button
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchMenuItems();
    }
  }, [refreshTrigger]);

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
      console.log('📂 Category management action received:', action);

      if (action.action === 'add') {
        console.log('➕ Adding category:', action.categoryName);
        // Just close the modal - category will be created when first item is added
        alert(`✅ Category "${action.categoryName}" will be available when you add items to it`);
        setShowCategoryModal(false);
        await fetchMenuItems();
        console.log('✅ Add category completed');
      } else if (action.action === 'edit') {
        console.log('✏️ Editing category from', action.oldName, 'to', action.newName);
        // Rename category for all items
        const itemsToUpdate = menuItems.filter(item => item.category === action.oldName);
        
        if (itemsToUpdate.length === 0) {
          console.log('⚠️ No items found in category:', action.oldName);
          alert('No items found in this category');
          setShowCategoryModal(false);
          return;
        }

        console.log(`📝 Updating ${itemsToUpdate.length} items from "${action.oldName}" to "${action.newName}"`);
        
        // Update each item
        for (const item of itemsToUpdate) {
          console.log('Updating item:', item.id, item.name);
          await fetchApi.put(`/api/menu/${item.id}`, {
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: action.newName,
            available: item.is_available !== false,
            preparation_time: item.preparation_time || null,
            is_vegetarian: item.is_vegetarian || false,
            is_spicy: item.is_spicy || false,
            image_url: item.image_url || null
          });
        }
        
        alert(`✅ Category renamed successfully! ${itemsToUpdate.length} items updated.`);
        setShowCategoryModal(false);
        await fetchMenuItems();
        console.log('✅ Edit category completed');
      } else if (action.action === 'delete') {
        console.log('🗑️ Deleting category:', action.categoryName);
        // Remove category from all items (set to 'Uncategorized')
        const itemsToUpdate = menuItems.filter(item => item.category === action.categoryName);
        
        if (itemsToUpdate.length > 0) {
          console.log(`🗑️ Removing category from ${itemsToUpdate.length} items`);
          
          for (const item of itemsToUpdate) {
            console.log('Updating item:', item.id, item.name);
            await fetchApi.put(`/api/menu/${item.id}`, {
              name: item.name,
              description: item.description || '',
              price: parseFloat(item.price),
              category: 'Uncategorized',
              available: item.is_available !== false,
              preparation_time: item.preparation_time || null,
              is_vegetarian: item.is_vegetarian || false,
              is_spicy: item.is_spicy || false,
              image_url: item.image_url || null
            });
          }
          
          alert(`✅ Category deleted! ${itemsToUpdate.length} items moved to "Uncategorized".`);
        } else {
          alert('✅ Category deleted!');
        }
        
        setShowCategoryModal(false);
        await fetchMenuItems();
        console.log('✅ Delete category completed');
      }
    } catch (error) {
      console.error('❌ Error managing category:', error);
      alert('❌ Error managing category: ' + error.message);
      setShowCategoryModal(false);
    }
  };

  return (
    <div className="h-[calc(100vh-52px-32px)] flex flex-col overflow-hidden">
      {/* Compact Header with Actions */}
      <div className="glass-card p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <span className="absolute left-2.5 top-2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-xs text-slate-600">
              <span className="font-semibold">{filteredItems.length}</span> items
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition flex items-center gap-1.5"
            >
              <span>📂</span>
              <span>Categories</span>
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
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Categories Left, Menu Right */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 mt-4">
        {/* Categories Sidebar (Left) */}
        <div className="col-span-3 flex flex-col min-h-0">
          <div className="glass-card flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-slate-200/60 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-700">📂 Categories</h3>
            </div>
            <div className="flex-1 overflow-y-auto fz-scroll p-3 space-y-1.5 min-h-0">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{category.name}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-md tabular-nums ${
                      selectedCategory === category.id
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {category.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Grid (Right) */}
        <div className="col-span-9 flex flex-col min-h-0">
          <div className="glass-card flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-slate-200/60 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-700">🍽️ Menu Items</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto fz-scroll p-4 min-h-0">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-slate-100 rounded-lg overflow-hidden animate-pulse">
                      <div className="h-32 bg-slate-200"></div>
                      <div className="p-3">
                        <div className="h-3 bg-slate-200 rounded mb-2"></div>
                        <div className="h-2 bg-slate-200 rounded mb-3"></div>
                        <div className="h-6 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className="text-5xl mb-3 block opacity-50">🍽️</span>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">No items found</h3>
                    <p className="text-xs text-slate-600 mb-4">Try adjusting your search or category</p>
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      ➕ Add First Item
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onToggleAvailability={toggleAvailability}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};

// Compact Menu Item Card Component
const MenuItemCard = ({ item, onToggleAvailability, onEdit, onDelete, compact }) => {
  const getCategoryIcon = (category) => {
    const icons = {
      appetizers: '🥟',
      mains: '🍽️',
      beverages: '🥤',
      desserts: '🍰'
    };
    return icons[category] || '🍴';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Compact Image */}
      <div className="relative h-24 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl opacity-50">{getCategoryIcon(item.category)}</span>
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
            item.is_available
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {item.is_available ? '✅' : '❌'}
          </span>
        </div>

        {/* Preparation Time Badge */}
        {item.preparation_time && (
          <div className="absolute top-1.5 right-1.5">
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-700">
              ⏱️ {item.preparation_time}m
            </span>
          </div>
        )}
      </div>

      {/* Compact Content */}
      <div className="p-3">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 mb-0.5 line-clamp-1">{item.name}</h3>
          <p className="text-[10px] text-slate-600 line-clamp-1">{item.description}</p>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded font-medium">
              {item.category}
            </span>
            {item.is_vegetarian && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded">🌱</span>}
            {item.is_spicy && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">🌶️</span>}
          </div>
          <p className="text-base font-bold text-slate-900">NPR {parseFloat(item.price).toFixed(0)}</p>
        </div>

        {/* Compact Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onToggleAvailability(item.id)}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all text-[10px] ${
              item.is_available
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {item.is_available ? '❌' : '✅'}
          </button>
          
          <button
            onClick={() => onEdit(item)}
            className="px-2 py-1.5 bg-blue-100 text-blue-600 rounded-md font-medium hover:bg-blue-200 transition-colors text-[10px]"
          >
            ✏️
          </button>
          
          <button
            onClick={() => onDelete(item.id)}
            className="px-2 py-1.5 bg-red-100 text-red-600 rounded-md font-medium hover:bg-red-200 transition-colors text-[10px]"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;

import React, { useState } from 'react';

const CategoryManagementModal = ({ isOpen, categories, menuItems, onClose, onSave }) => {
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editedName, setEditedName] = useState('');

  if (!isOpen) return null;

  // Filter out 'All Categories' and get actual categories with counts
  const actualCategories = categories
    .filter(cat => cat.id !== 'all')
    .map(cat => ({
      ...cat,
      itemCount: menuItems.filter(item => item.category === cat.name).length
    }));

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (actualCategories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert('This category already exists');
      return;
    }

    onSave({
      action: 'add',
      categoryName: newCategoryName.trim()
    });
    setNewCategoryName('');
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.name);
    setEditedName(category.name);
  };

  const handleSaveEdit = (oldName) => {
    if (!editedName.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (editedName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }

    if (actualCategories.some(cat => cat.name.toLowerCase() === editedName.trim().toLowerCase() && cat.name !== oldName)) {
      alert('This category name already exists');
      return;
    }

    onSave({
      action: 'edit',
      oldName: oldName,
      newName: editedName.trim()
    });
    setEditingCategory(null);
    setEditedName('');
  };

  const handleDeleteCategory = (categoryName, itemCount) => {
    if (itemCount > 0) {
      if (!window.confirm(`This category has ${itemCount} items. Deleting it will remove the category from all items. Continue?`)) {
        return;
      }
    }

    onSave({
      action: 'delete',
      categoryName: categoryName
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">📂 Manage Categories</h2>
              <p className="text-sm text-slate-600 mt-1">Add, edit, or delete menu categories</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Add New Category */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">➕ Add New Category</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Enter category name..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCategory}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Existing Categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              📋 Existing Categories ({actualCategories.length})
            </h3>
            
            {actualCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No categories yet. Add your first category above!</p>
              </div>
            ) : (
              actualCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  {editingCategory === category.name ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(category.name)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(category.name)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setEditedName('');
                        }}
                        className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📁</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-sm text-slate-600">
                            {category.itemCount} {category.itemCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.name, category.itemCount)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;

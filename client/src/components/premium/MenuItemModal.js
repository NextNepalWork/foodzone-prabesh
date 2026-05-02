import React from 'react';

const MenuItemModal = ({ isOpen, isEdit, formData, setFormData, onClose, onSave, existingCategories = [] }) => {
  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in all required fields (Name, Price, Category)');
      return;
    }
    
    if (parseFloat(formData.price) <= 0) {
      alert('Price must be greater than 0');
      return;
    }
    
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {isEdit ? '✏️ Edit Menu Item' : '➕ Add New Menu Item'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Chicken Chowmein"
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price (NPR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="110.00"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    list="category-suggestions"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Select or type new category"
                    required
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.filter(cat => cat !== 'all').map((cat, index) => (
                      <option key={index} value={cat} />
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Select from existing or type a new category name
                </p>
              </div>

              {/* Preparation Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  name="preparation_time"
                  value={formData.preparation_time}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="15"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the dish, ingredients, and what makes it special..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/images/dish-name.jpg"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_vegetarian"
                  checked={formData.is_vegetarian}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">🌱 Vegetarian</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_spicy"
                  checked={formData.is_spicy}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">🌶️ Spicy</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isEdit ? '💾 Update Item' : '➕ Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MenuItemModal;

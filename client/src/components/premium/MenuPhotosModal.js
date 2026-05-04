import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../services/apiService';

const MenuPhotosModal = ({ isOpen, onClose }) => {
  const [menuPhotos, setMenuPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMenuPhotos();
    }
  }, [isOpen]);

  const loadMenuPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get('/api/settings/menu-photos');
      setMenuPhotos(response.photos || []);
    } catch (error) {
      console.error('Error loading menu photos:', error);
      // Default to existing menu photos if API fails
      setMenuPhotos([
        '/menu/1.jpg',
        '/menu/2.jpeg',
        '/menu/3.jpeg',
        '/menu/4.jpg',
        '/menu/5.jpg',
        '/menu/6.jpeg',
        '/menu/7.jpeg',
        '/menu/8.jpeg',
        '/menu/9.jpeg',
        '/menu/10.jpeg'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) {
      alert('Please enter a photo URL');
      return;
    }

    try {
      setUploading(true);
      const updatedPhotos = [...menuPhotos, newPhotoUrl.trim()];
      await fetchApi.post('/api/settings/menu-photos', { photos: updatedPhotos });
      setMenuPhotos(updatedPhotos);
      setNewPhotoUrl('');
      alert('✅ Menu photo added successfully!');
    } catch (error) {
      console.error('Error adding menu photo:', error);
      alert('❌ Error adding menu photo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    if (!window.confirm('Are you sure you want to delete this menu photo?')) {
      return;
    }

    try {
      const updatedPhotos = menuPhotos.filter((_, i) => i !== index);
      await fetchApi.post('/api/settings/menu-photos', { photos: updatedPhotos });
      setMenuPhotos(updatedPhotos);
      alert('✅ Menu photo deleted successfully!');
    } catch (error) {
      console.error('Error deleting menu photo:', error);
      alert('❌ Error deleting menu photo: ' + error.message);
    }
  };

  const handleReorder = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= menuPhotos.length) return;

    const updatedPhotos = [...menuPhotos];
    [updatedPhotos[index], updatedPhotos[newIndex]] = [updatedPhotos[newIndex], updatedPhotos[index]];

    try {
      await fetchApi.post('/api/settings/menu-photos', { photos: updatedPhotos });
      setMenuPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error reordering menu photos:', error);
      alert('❌ Error reordering menu photos: ' + error.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/upload/menu-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Add the uploaded photo URL to the list
      const updatedPhotos = [...menuPhotos, data.url];
      await fetchApi.post('/api/settings/menu-photos', { photos: updatedPhotos });
      setMenuPhotos(updatedPhotos);
      
      alert('✅ Menu photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading menu photo:', error);
      alert('❌ Error uploading menu photo: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">📸 Menu Photos</h2>
              <p className="text-sm text-slate-600 mt-1">
                Manage the menu photos shown to customers at tables
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <p className="text-slate-600">Loading menu photos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Add Photo Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">➕ Add New Menu Photo</h3>
                
                {/* File Upload */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Image File
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-700
                      file:cursor-pointer cursor-pointer
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended: High-quality images, max 5MB
                  </p>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-300"></div>
                  <span className="text-xs text-slate-500 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-300"></div>
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Enter image URL (e.g., /menu/new-page.jpg)"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    onClick={handleAddPhoto}
                    disabled={uploading || !newPhotoUrl.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? '⏳' : '➕ Add'}
                  </button>
                </div>
              </div>

              {/* Menu Photos List */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  📋 Current Menu Photos ({menuPhotos.length})
                </h3>
                
                {menuPhotos.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <span className="text-5xl mb-3 block opacity-50">📸</span>
                    <p className="text-slate-600">No menu photos yet</p>
                    <p className="text-sm text-slate-500">Add your first menu photo above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuPhotos.map((photo, index) => (
                      <div
                        key={index}
                        className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Image Preview */}
                        <div className="relative h-48 bg-slate-100">
                          <img
                            src={photo}
                            alt={`Menu Page ${index + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            Page {index + 1}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-3 bg-slate-50">
                          <p className="text-xs text-slate-600 mb-2 truncate" title={photo}>
                            {photo}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReorder(index, 'up')}
                              disabled={index === 0}
                              className="flex-1 px-2 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              ⬆️
                            </button>
                            <button
                              onClick={() => handleReorder(index, 'down')}
                              disabled={index === menuPhotos.length - 1}
                              className="flex-1 px-2 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              ⬇️
                            </button>
                            <button
                              onClick={() => handleDeletePhoto(index)}
                              className="flex-1 px-2 py-1.5 bg-red-100 text-red-600 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                              title="Delete"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPhotosModal;

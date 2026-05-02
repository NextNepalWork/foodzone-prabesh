import React, { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../services/apiService';

const PaymentQRModal = ({ 
  isOpen, 
  onClose, 
  paymentMethod: initialPaymentMethod, 
  amount, 
  tableId, 
  orderIds, 
  qrCodes: qrCodesProp, 
  onPaymentComplete 
}) => {
  const [step, setStep] = useState('qr'); // 'qr' or 'receipt' or 'success'
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod || 'esewa');
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [qrCodes, setQrCodes] = useState(qrCodesProp || []);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch QR codes if not provided as prop
  useEffect(() => {
    if (!qrCodesProp || qrCodesProp.length === 0) {
      fetchQRCodes();
    }
  }, [qrCodesProp]);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const codes = await fetchApi.get('/api/payment-qr-codes');
      setQrCodes(codes || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      setQrCodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Get QR code for selected payment method
  const selectedQRCode = (qrCodes || []).find(qr => 
    qr.payment_method.toLowerCase() === paymentMethod.toLowerCase()
  );

  const compressImage = (file, maxSizeKB = 30) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/webp', quality);
        };
        
        tryCompress();
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file);
      setReceiptFile(compressedFile);
    } catch (error) {
      alert('Failed to process image. Please try again.');
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      setUploadError('Please select a receipt image');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('tableId', tableId);
      formData.append('orderIds', JSON.stringify(orderIds));
      formData.append('paymentMethod', paymentMethod);
      formData.append('totalAmount', amount);
      formData.append('customerName', customerInfo.name || 'Guest');
      formData.append('customerPhone', customerInfo.phone || '');

      const response = await fetch('/api/payment-qr/receipts', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setTimeout(() => {
          onPaymentComplete();
        }, 3000);
      } else {
        throw new Error(data.error || `Upload failed (HTTP ${response.status})`);
      }
    } catch (error) {
      // Stay on the receipt step so the user can retry: keep file or pick a new one.
      setUploadError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetReceiptSelection = () => {
    setReceiptFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Payment Options
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Rs. {amount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Payment Method Selection in Header */}
          {step === 'qr' && (
            <div className="grid grid-cols-3 gap-2">
              {['esewa', 'khalti', 'fonepay'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    paymentMethod === method
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          
          {/* Step 1: QR Code Display */}
          {step === 'qr' && (
            <div className="flex flex-col h-full">
              {/* QR Code Display - Center */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                    <p className="text-sm text-gray-600">Loading QR code...</p>
                  </div>
                ) : selectedQRCode && selectedQRCode.qr_image_url ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-lg">
                      <img
                        src={selectedQRCode.qr_image_url}
                        alt={`${paymentMethod} QR Code`}
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                    {selectedQRCode.account_name && (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedQRCode.account_name}
                        </p>
                        {selectedQRCode.account_number && (
                          <p className="text-xs text-gray-600 mt-1">
                            {selectedQRCode.account_number}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No QR code available</p>
                    <p className="text-sm text-gray-500 mt-2">for {paymentMethod}</p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="px-4 pb-4 border-t border-gray-100">
                {selectedQRCode && selectedQRCode.qr_image_url && (
                  <button
                    onClick={() => setStep('receipt')}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    ✓ I've Paid - Upload Receipt
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Receipt Upload */}
          {step === 'receipt' && (
            <div className="flex flex-col h-full">
              <div className="px-4 py-4 flex-1 overflow-y-auto space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Upload a screenshot of your payment confirmation
                  </p>
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {receiptFile ? (
                    <div className="space-y-2">
                      <svg className="w-10 h-10 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-600 font-medium text-sm">Receipt Selected</p>
                      <p className="text-xs text-gray-500">
                        {(receiptFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptFile(null);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Choose Different Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 font-medium text-sm">Click to upload receipt</p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP up to 2MB
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {uploadError && (
                  <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start justify-between gap-3">
                    <span>⚠️ {uploadError}</span>
                    <button
                      type="button"
                      onClick={resetReceiptSelection}
                      className="underline hover:no-underline whitespace-nowrap"
                    >
                      Pick different image
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setStep('qr')}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleReceiptUpload}
                  disabled={!receiptFile || isUploading}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                    !receiptFile || isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : (uploadError ? 'Retry Submit' : 'Submit Receipt')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Submitted!</h3>
                <p className="text-sm text-gray-600">
                  Your receipt has been submitted. Staff will verify it shortly.
                </p>
              </div>
              <div className="text-3xl">🙏</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentQRModal;

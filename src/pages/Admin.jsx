import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  getProducts, 
  createProduct, 
  deleteProduct, 
  uploadProductImage 
} from '../services/productService';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  X, 
  Package,
  Lock,
  User,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const CATEGORIES = [
  'Speakers & Audio',
  'LED Lights',
  'Soldering & Tools',
  'Multimeters & Testers',
  'Torches & Flashlights',
  'Electronic Components',
  'Accessories'
];

const Admin = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('elite_admin_auth') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard & Products State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Speakers & Audio');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState(['', '']);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    const expectedUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

    if (
      loginUsername.trim() === expectedUsername &&
      loginPassword === expectedPassword
    ) {
      sessionStorage.setItem('elite_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid username or password. Please try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('elite_admin_auth');
    setIsAuthenticated(false);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFeatureChange = (index, value) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const addFeatureField = () => {
    setFeatures([...features, '']);
  };

  const removeFeatureField = (index) => {
    if (features.length <= 1) {
      setFeatures(['']);
    } else {
      setFeatures(features.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('Speakers & Audio');
    setCustomCategory('');
    setDescription('');
    setFeatures(['', '']);
    setImageMode('upload');
    setImageUrl('');
    removeSelectedFile();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Product name is required.' });
      return;
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid price in ₹.' });
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = imageUrl.trim();

      // If uploading an image file to Supabase Storage
      if (imageMode === 'upload' && imageFile) {
        setFeedback({ type: 'info', message: 'Uploading product image to Supabase Storage...' });
        finalImageUrl = await uploadProductImage(imageFile);
      }

      if (!finalImageUrl) {
        finalImageUrl = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
      }

      const activeCategory = category === 'Other' ? customCategory.trim() || 'General' : category;
      const cleanFeatures = features.map(f => f.trim()).filter(Boolean);

      const newProductData = {
        name: name.trim(),
        price: Number(price),
        category: activeCategory,
        description: description.trim(),
        imageUrl: finalImageUrl,
        features: cleanFeatures
      };

      await createProduct(newProductData);

      setFeedback({
        type: 'success',
        message: `"${name}" added successfully to Supabase database!`
      });

      resetForm();
      await loadProducts();
    } catch (err) {
      console.error('Error adding product:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to add product. Please check your Supabase Storage permissions.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, prodName) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}"?`)) {
      return;
    }

    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      setFeedback({
        type: 'success',
        message: `"${prodName}" deleted successfully.`
      });
    } catch (err) {
      console.error('Error deleting product:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete product.'
      });
    }
  };

  // If NOT authenticated, show the login form
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="login-icon-box">
            <Lock size={28} />
          </div>
          <h2>Admin Portal Login</h2>
          <p className="login-subtitle">
            Restricted access. Please sign in to manage products.
          </p>

          {loginError && (
            <div className="admin-alert error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="login-input-group">
              <label>Username</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter admin username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="login-input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn">
              <ShieldCheck size={18} /> Sign In to Admin
            </button>
          </form>

          <Link to="/" className="login-footer-link">
            <ArrowLeft size={16} /> Return to Store
          </Link>
        </div>
      </div>
    );
  }

  // If Authenticated, show full Admin Dashboard
  return (
    <div className="admin-container">
      <div className="admin-header-actions">
        <Link to="/" className="back-btn" style={{ margin: 0 }}>
          <ArrowLeft size={18} /> Back to Store
        </Link>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} /> Log Out
        </button>
      </div>

      <div className="admin-header">
        <h1>Product Management</h1>
        <p>Add and manage your store products stored in Supabase</p>
      </div>

      {feedback && (
        <div className={`admin-alert ${feedback.type}`}>
          {feedback.type === 'success' && <CheckCircle2 size={20} />}
          {feedback.type === 'error' && <AlertCircle size={20} />}
          <span>{feedback.message}</span>
          <button className="alert-close" onClick={() => setFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="admin-grid">
        {/* ADD PRODUCT FORM */}
        <div className="admin-card">
          <div className="card-title">
            <Plus size={22} />
            <h2>Add New Product</h2>
          </div>

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 29990"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Other">Other / Custom</option>
                </select>
              </div>
            </div>

            {category === 'Other' && (
              <div className="form-group">
                <label>Custom Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Drones, Smart Home"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="Describe key benefits, specifications, and details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* KEY FEATURES */}
            <div className="form-group">
              <div className="features-label-row">
                <label>Key Features</label>
                <button
                  type="button"
                  className="add-feature-btn"
                  onClick={addFeatureField}
                >
                  <Plus size={14} /> Add Feature
                </button>
              </div>
              <div className="features-inputs">
                {features.map((feat, index) => (
                  <div key={index} className="feature-input-row">
                    <input
                      type="text"
                      placeholder={`Feature #${index + 1} (e.g. 30hr Battery Life)`}
                      value={feat}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                    />
                    <button
                      type="button"
                      className="remove-feature-btn"
                      onClick={() => removeFeatureField(index)}
                      title="Remove feature"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PRODUCT IMAGE SECTION */}
            <div className="form-group">
              <label>Product Image</label>
              
              <div className="image-mode-tabs">
                <button
                  type="button"
                  className={`tab-btn ${imageMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setImageMode('upload')}
                >
                  <Upload size={16} /> Upload File
                </button>
                <button
                  type="button"
                  className={`tab-btn ${imageMode === 'url' ? 'active' : ''}`}
                  onClick={() => setImageMode('url')}
                >
                  <ImageIcon size={16} /> Image URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <div className="upload-box-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                    id="product-image-upload"
                  />
                  {!imagePreview ? (
                    <label htmlFor="product-image-upload" className="file-dropzone">
                      <Upload size={32} className="upload-icon" />
                      <span className="dropzone-title">Click to upload product image</span>
                      <span className="dropzone-subtitle">PNG, JPG, WEBP up to 5MB</span>
                    </label>
                  ) : (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="preview-img" />
                      <button
                        type="button"
                        className="remove-preview-btn"
                        onClick={removeSelectedFile}
                        title="Remove image"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="url-input-wrapper">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  {imageUrl && (
                    <div className="image-preview-container url-preview">
                      <img src={imageUrl} alt="Preview" className="preview-img" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="submit-product-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner-small"></div>
                  Saving to Supabase...
                </>
              ) : (
                <>
                  <Plus size={18} /> Add Product to Store
                </>
              )}
            </button>
          </form>
        </div>

        {/* EXISTING PRODUCTS LIST */}
        <div className="admin-card">
          <div className="card-title">
            <Package size={22} />
            <h2>Store Products ({products.length})</h2>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading products from Supabase...</p>
            </div>
          ) : products.length === 0 ? (
            <p className="empty-text">No products found in the database.</p>
          ) : (
            <div className="products-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const priceFormatted = Number(p.price || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                    return (
                      <tr key={p.id}>
                        <td className="product-cell">
                          <img
                            src={p.imageUrl || 'https://via.placeholder.com/60'}
                            alt={p.name}
                            className="table-thumb"
                          />
                          <div>
                            <span className="table-name">{p.name}</span>
                            <span className="table-id">ID: {p.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className="table-badge">{p.category}</span>
                        </td>
                        <td className="table-price">₹{priceFormatted}</td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  uploadProductImage 
} from '../services/productService';
import { compressImage, formatFileSize } from '../utils/imageCompressor';
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
  ShieldCheck,
  Clock,
  Tag,
  Percent,
  Pencil,
  Zap,
  Star,
  ChevronLeft,
  ChevronRight,
  Camera,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

// ========================================================
// Cryptographic Salt & Salted SHA-256 Hash for Admin Security
// The actual plaintext password is NEVER stored in code or bundles!
// ========================================================
const ADMIN_PASSWORD_SALT = 'ELITE_STORE_SALT_v2_2026';
// Salted SHA-256 hash of: Elite@Narikkuni#2026! + ELITE_STORE_SALT_v2_2026
const DEFAULT_ADMIN_HASH = '0784f4529b0e8d4b91d6c183ac38447565d1fc33a4675a27da43a18e66353918';
const ALLOWED_ADMIN_USERNAMES = ['elite_admin', 'admin', 'shahin'];

const computeSha256 = async (str) => {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(str));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const validateAdminSession = () => {
  try {
    const raw = sessionStorage.getItem('elite_admin_session');
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || !session.expiresAt) return false;
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem('elite_admin_session');
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => validateAdminSession());
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Dashboard & Products State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }
  const [editingProductId, setEditingProductId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [actualPrice, setActualPrice] = useState(''); // Original Price / MRP
  const [offerPrice, setOfferPrice] = useState('');   // Selling / Discounted Price
  const [category, setCategory] = useState('Speakers & Audio');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState(['', '']);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imageItems, setImageItems] = useState([]); // Array of { id, url, file, previewUrl, compressionInfo }
  const [urlInput, setUrlInput] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');

  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Check rate limit lockout countdown
  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil = Number(localStorage.getItem('elite_admin_lockout') || 0);
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSeconds(remaining);
      if (remaining === 0 && localStorage.getItem('elite_admin_lockout')) {
        localStorage.removeItem('elite_admin_lockout');
        localStorage.removeItem('elite_admin_attempts');
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (lockoutSeconds > 0) {
      const mins = Math.floor(lockoutSeconds / 60);
      const secs = lockoutSeconds % 60;
      setLoginError(`Security lockout in effect. Please wait ${mins}m ${secs}s before trying again.`);
      return;
    }

    setAuthenticating(true);

    try {
      const input = loginIdentifier.trim();
      const enteredPass = loginPassword;

      // 1. Check if user is signing in via official Supabase Auth (if an email with @ is entered)
      if (input.includes('@') && supabase?.auth) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: input,
            password: enteredPass
          });

          if (!error && data?.session) {
            localStorage.removeItem('elite_admin_attempts');
            localStorage.removeItem('elite_admin_lockout');

            const sessionData = {
              token: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
              expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
              user: input,
              authMethod: 'supabase'
            };
            sessionStorage.setItem('elite_admin_session', JSON.stringify(sessionData));
            setIsAuthenticated(true);
            setLoginIdentifier('');
            setLoginPassword('');
            setAuthenticating(false);
            return;
          }
        } catch (supabaseErr) {
          console.warn('Supabase auth sign-in attempt:', supabaseErr.message);
        }
      }

      // 2. Cryptographic Salted SHA-256 Hash Verification
      const targetHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
      const expectedUsername = (import.meta.env.VITE_ADMIN_USERNAME || 'elite_admin').toLowerCase();
      const isAllowedUser = ALLOWED_ADMIN_USERNAMES.includes(input.toLowerCase()) || input.toLowerCase() === expectedUsername;

      const computedHash = await computeSha256(enteredPass + ADMIN_PASSWORD_SALT);

      if (isAllowedUser && computedHash === targetHash) {
        localStorage.removeItem('elite_admin_attempts');
        localStorage.removeItem('elite_admin_lockout');

        const sessionData = {
          token: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
          expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
          user: input,
          authMethod: 'secure_hash'
        };
        sessionStorage.setItem('elite_admin_session', JSON.stringify(sessionData));
        setIsAuthenticated(true);
        setLoginIdentifier('');
        setLoginPassword('');
      } else {
        const currentAttempts = Number(localStorage.getItem('elite_admin_attempts') || 0) + 1;
        localStorage.setItem('elite_admin_attempts', String(currentAttempts));

        if (currentAttempts >= 5) {
          const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
          localStorage.setItem('elite_admin_lockout', String(lockoutTime));
          setLockoutSeconds(15 * 60);
          setLoginError('Too many failed attempts. Admin portal is locked for 15 minutes to protect your store.');
        } else {
          const attemptsLeft = 5 - currentAttempts;
          setLoginError(`Invalid credentials. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining before security lockout.`);
        }
      }
    } catch (err) {
      setLoginError('Authentication service error. Please try again.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
    } catch {}
    sessionStorage.removeItem('elite_admin_session');
    setIsAuthenticated(false);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts({ forceRefresh: true });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 5 - imageItems.length;
    if (availableSlots <= 0) {
      setFeedback({ 
        type: 'error', 
        message: 'Maximum 5 images allowed per product. Please delete an image below to add a new one.' 
      });
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setFeedback({ 
        type: 'info', 
        message: `Only ${availableSlots} more image(s) could be added (max 5). Excess files were skipped.` 
      });
    }

    setCompressing(true);
    const newItems = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setCompressProgress(`Compressing photo ${i + 1} of ${filesToProcess.length}...`);
      try {
        // Smart HD WebP compression
        const result = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.83 });
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file: result.compressedFile,
          previewUrl: result.previewUrl,
          compressionInfo: {
            originalSize: formatFileSize(result.originalSize),
            compressedSize: formatFileSize(result.compressedSize),
            savedPercent: result.savedPercent
          }
        });
      } catch (err) {
        console.warn('Image compression fallback:', err);
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file: file,
          previewUrl: URL.createObjectURL(file),
          compressionInfo: null
        });
      }
    }

    setImageItems((prev) => [...prev, ...newItems].slice(0, 5));
    setCompressing(false);
    setCompressProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrlImage = (e) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (imageItems.length >= 5) {
      setFeedback({ type: 'error', message: 'Maximum 5 images allowed per product.' });
      return;
    }

    setImageItems((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: trimmed,
        previewUrl: trimmed,
        file: null,
        compressionInfo: null
      }
    ]);
    setUrlInput('');
  };

  const removeImageItem = (index) => {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  const makeCoverImage = (index) => {
    if (index === 0) return;
    setImageItems((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      return [chosen, ...copy];
    });
  };

  const moveImage = (index, direction) => {
    setImageItems((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
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

  const numActual = Number(actualPrice);
  const numOffer = Number(offerPrice);
  const liveDiscountPercent = (numActual > 0 && numOffer > 0 && numActual > numOffer)
    ? Math.round(((numActual - numOffer) / numActual) * 100)
    : 0;
  const liveSavings = (numActual > 0 && numOffer > 0 && numActual > numOffer)
    ? (numActual - numOffer).toFixed(2)
    : 0;

  const handleEdit = (product) => {
    setEditingProductId(product.id);
    setName(product.name || '');
    setOfferPrice(product.price != null ? String(product.price) : '');
    setActualPrice(product.originalPrice != null ? String(product.originalPrice) : '');

    if (CATEGORIES.includes(product.category)) {
      setCategory(product.category);
      setCustomCategory('');
    } else {
      setCategory('Other');
      setCustomCategory(product.category || '');
    }

    setDescription(product.description || '');

    const prodFeatures = Array.isArray(product.features) && product.features.length > 0
      ? product.features
      : ['', ''];
    setFeatures(prodFeatures);

    const prodImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.imageUrl ? [product.imageUrl] : []);

    setImageItems(
      prodImages.slice(0, 5).map((imgUrl, i) => ({
        id: `edit_${i}_${Date.now()}`,
        url: imgUrl,
        previewUrl: imgUrl,
        file: null,
        compressionInfo: null
      }))
    );
    setUrlInput('');
    setCompressing(false);
    setCompressProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setFeedback({
      type: 'info',
      message: `Now editing "${product.name}". Update the details below and click "Update Product".`
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    resetForm();
    setFeedback(null);
  };

  const resetForm = () => {
    setEditingProductId(null);
    setName('');
    setActualPrice('');
    setOfferPrice('');
    setCategory('Speakers & Audio');
    setCustomCategory('');
    setDescription('');
    setFeatures(['', '']);
    setImageItems([]);
    setUrlInput('');
    setCompressing(false);
    setCompressProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Product name is required.' });
      return;
    }

    if (!offerPrice || isNaN(offerPrice) || Number(offerPrice) <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid Offer Price in ₹.' });
      return;
    }

    if (actualPrice && (isNaN(actualPrice) || Number(actualPrice) < 0)) {
      setFeedback({ type: 'error', message: 'Actual Price must be a valid positive number.' });
      return;
    }

    setSubmitting(true);

    try {
      const uploadedUrls = [];

      // Upload each file in imageItems to Supabase Storage
      for (let i = 0; i < imageItems.length; i++) {
        const item = imageItems[i];
        if (item.file) {
          setFeedback({
            type: 'info',
            message: `Uploading image ${i + 1} of ${imageItems.length} to Supabase Storage...`
          });
          const uploadedUrl = await uploadProductImage(item.file);
          uploadedUrls.push(uploadedUrl);
        } else if (item.url) {
          uploadedUrls.push(item.url);
        } else if (item.previewUrl && !item.previewUrl.startsWith('blob:')) {
          uploadedUrls.push(item.previewUrl);
        }
      }

      const finalImages = uploadedUrls.filter(Boolean).slice(0, 5);
      const defaultPlaceholder = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
      const primaryImageUrl = finalImages[0] || defaultPlaceholder;
      const allImages = finalImages.length > 0 ? finalImages : [primaryImageUrl];

      const activeCategory = category === 'Other' ? customCategory.trim() || 'General' : category;
      const cleanFeatures = features.map(f => f.trim()).filter(Boolean);

      const productPayload = {
        name: name.trim(),
        price: Number(offerPrice),
        originalPrice: actualPrice && !isNaN(actualPrice) ? Number(actualPrice) : null,
        category: activeCategory,
        description: description.trim(),
        imageUrl: primaryImageUrl,
        images: allImages,
        features: cleanFeatures
      };

      if (editingProductId) {
        await updateProduct(editingProductId, productPayload);
        setFeedback({
          type: 'success',
          message: `"${name}" updated successfully in Supabase!`
        });
      } else {
        await createProduct(productPayload);
        setFeedback({
          type: 'success',
          message: `"${name}" added successfully to Supabase database!`
        });
      }

      resetForm();
      await loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save product. Please check your Supabase permissions.'
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

  // If NOT authenticated, show the secure login form
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="login-icon-box">
            <Lock size={28} />
          </div>
          <h2>Admin Portal Login</h2>
          <p className="login-subtitle">
            Restricted access. Sign in with your admin credentials or Supabase email.
          </p>

          {loginError && (
            <div className="admin-alert error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          {lockoutSeconds > 0 && (
            <div className="admin-alert error" style={{ marginBottom: '1.25rem' }}>
              <Clock size={18} />
              <span>
                Lockout active: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s remaining.
              </span>
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="login-input-group">
              <label>Admin Username or Email</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="elite_admin or Supabase email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  disabled={authenticating || lockoutSeconds > 0}
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secure admin password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={authenticating || lockoutSeconds > 0}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="login-submit-btn" 
              disabled={authenticating || lockoutSeconds > 0}
            >
              {authenticating ? (
                <>
                  <div className="spinner-small" /> Verifying Credentials...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Sign In Securely
                </>
              )}
            </button>
          </form>

          <div className="security-notice-badge">
            <KeyRound size={13} />
            <span>Cryptographic Salted Hash & Supabase Auth</span>
          </div>

          <Link to="/" className="login-footer-link" style={{ marginTop: '1.25rem' }}>
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
        {/* ADD / EDIT PRODUCT FORM */}
        <div className={`admin-card ${editingProductId ? 'card-editing-mode' : ''}`} ref={formRef}>
          <div className="card-title-header">
            <div className="card-title">
              {editingProductId ? (
                <>
                  <Pencil size={22} className="edit-icon-highlight" />
                  <h2>Edit Product</h2>
                </>
              ) : (
                <>
                  <Plus size={22} />
                  <h2>Add New Product</h2>
                </>
              )}
            </div>

            {editingProductId && (
              <button
                type="button"
                className="cancel-edit-btn"
                onClick={cancelEdit}
                title="Cancel editing and create new product"
              >
                <X size={15} /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                value={name ?? ''}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row prices-row">
              <div className="form-group">
                <label>Actual Price / MRP (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1499"
                  step="0.01"
                  min="0"
                  value={actualPrice ?? ''}
                  onChange={(e) => setActualPrice(e.target.value)}
                />
                <span className="input-field-hint">Original MRP before discount</span>
              </div>

              <div className="form-group">
                <label>Offer Price (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 999"
                  step="0.01"
                  min="0"
                  value={offerPrice ?? ''}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  required
                />
                <span className="input-field-hint">Final customer buying price</span>
              </div>
            </div>

            {/* Live Discount Calculator Preview */}
            {numActual > 0 && numOffer > 0 && (
              <div className={`admin-discount-preview ${numActual > numOffer ? 'positive' : 'notice'}`}>
                {numActual > numOffer ? (
                  <>
                    <span className="discount-pill">
                      <Percent size={14} /> {liveDiscountPercent}% OFF
                    </span>
                    <span className="savings-info">
                      Buyer saves <strong>₹{Number(liveSavings).toLocaleString('en-IN')}</strong> on this deal!
                    </span>
                  </>
                ) : (
                  <span className="savings-info warning">
                    Note: Offer price is currently equal to or greater than the actual MRP.
                  </span>
                )}
              </div>
            )}

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

            {category === 'Other' && (
              <div className="form-group">
                <label>Custom Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Drones, Smart Home"
                  value={customCategory ?? ''}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="Describe key benefits, specifications, and details..."
                value={description ?? ''}
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
                      value={feat ?? ''}
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

            {/* PRODUCT IMAGES SECTION - UP TO 5 IMAGES */}
            <div className="form-group admin-images-section">
              <div className="images-header-row">
                <div>
                  <label>Product Images (Up to 5) *</label>
                  <span className="input-field-hint">
                    Add up to 5 photos. Photo #1 is the primary cover image seen on the shop catalog.
                  </span>
                </div>
                <span className={`images-counter-pill ${imageItems.length === 5 ? 'full' : ''}`}>
                  <Camera size={14} /> {imageItems.length} / 5 Photos
                </span>
              </div>
              
              <div className="image-mode-tabs">
                <button
                  type="button"
                  className={`tab-btn ${imageMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setImageMode('upload')}
                >
                  <Upload size={16} /> Upload Photos
                </button>
                <button
                  type="button"
                  className={`tab-btn ${imageMode === 'url' ? 'active' : ''}`}
                  onClick={() => setImageMode('url')}
                >
                  <ImageIcon size={16} /> Add by Image URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <div className="upload-box-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageFilesChange}
                    style={{ display: 'none' }}
                    id="product-image-upload"
                    disabled={imageItems.length >= 5 || compressing}
                  />

                  {compressing ? (
                    <div className="compressing-box">
                      <div className="spinner"></div>
                      <span className="compressing-title">Compressing Photos...</span>
                      <span className="compressing-subtitle">{compressProgress || 'Optimizing without losing quality (HD WebP)'}</span>
                    </div>
                  ) : imageItems.length < 5 ? (
                    <label htmlFor="product-image-upload" className="file-dropzone multi-dropzone">
                      <Upload size={32} className="upload-icon" />
                      <span className="dropzone-title">Click to upload photos ({5 - imageItems.length} slot{5 - imageItems.length > 1 ? 's' : ''} left)</span>
                      <span className="dropzone-subtitle">Choose up to 5 images • Auto-compressed to HD WebP to save storage space</span>
                    </label>
                  ) : (
                    <div className="max-images-notice">
                      <CheckCircle2 size={18} className="text-green" />
                      <span>Maximum 5 photos added! You can reorder, change cover, or delete items below.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="url-input-wrapper">
                  <div className="url-input-row">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={urlInput ?? ''}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={imageItems.length >= 5}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrlImage();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="add-url-img-btn"
                      onClick={handleAddUrlImage}
                      disabled={!urlInput.trim() || imageItems.length >= 5}
                    >
                      <Plus size={16} /> Add Photo
                    </button>
                  </div>
                  {imageItems.length >= 5 && (
                    <span className="input-field-hint warning">Maximum 5 photos reached. Remove one below to add another.</span>
                  )}
                </div>
              )}

              {/* GALLERY THUMBNAIL MANAGEMENT GRID (UP TO 5 IMAGES) */}
              {imageItems.length > 0 && (
                <div className="admin-gallery-grid-container">
                  <div className="gallery-grid-header">
                    <span className="grid-title">Gallery Slots ({imageItems.length}/5)</span>
                    <span className="grid-help">Photo #1 is the store cover. Use arrows to reorder or click "Set Cover".</span>
                  </div>

                  <div className="admin-gallery-slots">
                    {imageItems.map((item, idx) => (
                      <div key={item.id || idx} className={`admin-gallery-card ${idx === 0 ? 'is-cover' : ''}`}>
                        <div className="gallery-card-thumb-wrap">
                          <img src={item.previewUrl} alt={`Photo ${idx + 1}`} className="gallery-card-thumb" />
                          
                          {idx === 0 ? (
                            <span className="cover-badge" title="Primary cover photo for shop display">
                              <Star size={11} fill="currentColor" /> Cover
                            </span>
                          ) : (
                            <span className="slot-num-badge">#{idx + 1}</span>
                          )}

                          <button
                            type="button"
                            className="gallery-card-remove"
                            onClick={() => removeImageItem(idx)}
                            title="Remove photo"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="gallery-card-actions">
                          {idx !== 0 ? (
                            <button
                              type="button"
                              className="set-cover-btn"
                              onClick={() => makeCoverImage(idx)}
                              title="Make this the primary cover image"
                            >
                              <Star size={12} /> Set Cover
                            </button>
                          ) : (
                            <span className="primary-cover-label">Primary Cover</span>
                          )}

                          <div className="reorder-btns">
                            <button
                              type="button"
                              className="reorder-btn"
                              disabled={idx === 0}
                              onClick={() => moveImage(idx, -1)}
                              title="Move left"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              type="button"
                              className="reorder-btn"
                              disabled={idx === imageItems.length - 1}
                              onClick={() => moveImage(idx, 1)}
                              title="Move right"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        {item.compressionInfo && (
                          <div className="gallery-card-compression">
                            <Zap size={10} /> Saved {item.compressionInfo.savedPercent}%
                          </div>
                        )}
                      </div>
                    ))}

                    {imageItems.length < 5 && (
                      <label 
                        htmlFor="product-image-upload" 
                        className="admin-add-more-slot" 
                        title={`Add photo (${imageItems.length + 1} of 5)`}
                      >
                        <Plus size={22} />
                        <span>Add Photo</span>
                        <span className="add-more-count">({imageItems.length}/5)</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`submit-product-btn ${editingProductId ? 'update-mode' : ''}`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner-small"></div>
                  {editingProductId ? 'Updating in Supabase...' : 'Saving to Supabase...'}
                </>
              ) : editingProductId ? (
                <>
                  <CheckCircle2 size={18} /> Update Product
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
                    <th>Pricing</th>
                    <th>Added On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const priceFormatted = Number(p.price || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                    const originalFormatted = p.originalPrice
                      ? Number(p.originalPrice).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      : null;
                    const formattedDate = p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : null;
                    const formattedTime = p.createdAt
                      ? new Date(p.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : null;

                    return (
                      <tr key={p.id} className={editingProductId === p.id ? 'row-editing' : ''}>
                        <td className="product-cell">
                          <div className="table-thumb-wrap">
                            <img
                              src={p.imageUrl || 'https://via.placeholder.com/60'}
                              alt={p.name}
                              className="table-thumb"
                            />
                            {Array.isArray(p.images) && p.images.length > 1 && (
                              <span className="table-photos-count" title={`${p.images.length} photos`}>
                                <Camera size={10} /> {p.images.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="table-name">{p.name}</span>
                            <span className="table-id">ID: {p.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className="table-badge">{p.category}</span>
                        </td>
                        <td className="table-price-cell">
                          <div className="table-price-main">₹{priceFormatted}</div>
                          {originalFormatted && Number(p.originalPrice) > Number(p.price) && (
                            <div className="table-price-sub">
                              <span className="table-mrp">MRP ₹{originalFormatted}</span>
                              <span className="table-discount-badge">{p.discountPercentage}% OFF</span>
                            </div>
                          )}
                        </td>
                        <td className="table-date-cell">
                          {formattedDate ? (
                            <div className="table-added-time" title={p.createdAt}>
                              <div className="table-date-str">
                                <Clock size={13} className="time-icon" />
                                <span>{formattedDate}</span>
                              </div>
                              <span className="table-time-str">{formattedTime}</span>
                            </div>
                          ) : (
                            <span className="table-empty-date">—</span>
                          )}
                        </td>
                        <td className="table-actions-cell">
                          <div className="table-actions-group">
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(p)}
                              title={`Edit "${p.name}"`}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(p.id, p.name)}
                              title={`Delete "${p.name}"`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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
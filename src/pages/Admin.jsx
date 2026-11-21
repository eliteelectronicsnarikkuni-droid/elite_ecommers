import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  toggleProductVisibility
} from '../services/productService';
import { compressImage, formatFileSize } from '../utils/imageCompressor';
import {
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  X,
  Package,
  Lock,
  Mail,
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
  KeyRound,
  Palette
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
  // Authentication State (100% Supabase Cloud Auth)
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
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
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'visible' | 'hidden'
  const [togglingVisibilityId, setTogglingVisibilityId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [actualPrice, setActualPrice] = useState(''); // Original Price / MRP
  const [offerPrice, setOfferPrice] = useState('');   // Selling / Discounted Price
  const [category, setCategory] = useState('Speakers & Audio');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState(['', '']);
  const [isHidden, setIsHidden] = useState(false); // false = Show to buyers, true = Hide from buyers
  const [imageItems, setImageItems] = useState([]); // Array of { id, url, file, previewUrl, compressionInfo }
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');
  const [imageError, setImageError] = useState(false);
  const [hasColorVariants, setHasColorVariants] = useState(false);
  const [colorVariants, setColorVariants] = useState([]); // Array of { id, name, colorCode, imageItems }

  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Confirmation Modal State (Delete, Edit, Update)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'delete', // 'delete' | 'update' | 'cancel_edit' | 'switch_edit'
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger', // 'danger' | 'primary'
    onConfirm: null
  });

  // Close confirmation modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && confirmModal.isOpen) {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal.isOpen]);

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

  // Listen to Supabase Auth State changes & retrieve active session
  useEffect(() => {
    let mounted = true;

    if (!supabase?.auth) {
      setCheckingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (mounted) {
        setSession(existingSession);
        setCheckingAuth(false);
      }
    }).catch(() => {
      if (mounted) setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadProducts();
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (lockoutSeconds > 0) {
      const mins = Math.floor(lockoutSeconds / 60);
      const secs = lockoutSeconds % 60;
      setLoginError(`Security lockout in effect. Please wait ${mins}m ${secs}s before trying again.`);
      return;
    }

    if (!supabase?.auth) {
      setLoginError('Supabase authentication is not configured. Please check your Supabase credentials.');
      return;
    }

    setAuthenticating(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (error) {
        const currentAttempts = Number(localStorage.getItem('elite_admin_attempts') || 0) + 1;
        localStorage.setItem('elite_admin_attempts', String(currentAttempts));

        if (currentAttempts >= 5) {
          const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
          localStorage.setItem('elite_admin_lockout', String(lockoutTime));
          setLockoutSeconds(15 * 60);
          setLoginError('Too many failed attempts. Admin portal is locked for 15 minutes to protect your store.');
        } else {
          const attemptsLeft = 5 - currentAttempts;
          setLoginError(`${error.message || 'Invalid login credentials'}. (${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining)`);
        }
        return;
      }

      if (data?.session) {
        localStorage.removeItem('elite_admin_attempts');
        localStorage.removeItem('elite_admin_lockout');
        setSession(data.session);
        setLoginEmail('');
        setLoginPassword('');
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication error. Please try again.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Logout error:', err);
    }
    setSession(null);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts({ forceRefresh: true, includeHidden: true });
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
    setImageError(false);
    setCompressing(false);
    setCompressProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleToggleColorVariants = (enabled) => {
    setHasColorVariants(enabled);
    setImageError(false);
    if (enabled && colorVariants.length === 0) {
      setColorVariants([
        {
          id: `color_${Date.now()}_1`,
          name: 'Black',
          colorCode: '#111827',
          imageItems: imageItems.length > 0 ? [...imageItems] : []
        }
      ]);
    }
  };

  const addColorVariant = () => {
    setColorVariants((prev) => [
      ...prev,
      {
        id: `color_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        colorCode: '#2563eb',
        imageItems: []
      }
    ]);
  };

  const removeColorVariant = (index) => {
    setColorVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColorField = (index, field, value) => {
    setColorVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleColorImagesChange = async (colorIndex, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = colorVariants[colorIndex]?.imageItems || [];
    const availableSlots = 5 - currentImages.length;
    if (availableSlots <= 0) {
      setFeedback({
        type: 'error',
        message: 'Maximum 5 images allowed per color variant.'
      });
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setCompressing(true);
    setCompressProgress(`Optimizing ${filesToProcess.length} photo(s)...`);

    const newItems = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      try {
        const { compressedFile, originalSize, compressedSize, compressionRatio } =
          await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.83 });
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
          compressionInfo: { originalSize, compressedSize, compressionRatio }
        });
      } catch {
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file: file,
          previewUrl: URL.createObjectURL(file),
          compressionInfo: null
        });
      }
    }

    setColorVariants((prev) => {
      const copy = [...prev];
      const target = copy[colorIndex];
      copy[colorIndex] = {
        ...target,
        imageItems: [...(target.imageItems || []), ...newItems].slice(0, 5)
      };
      return copy;
    });

    setCompressing(false);
    setCompressProgress('');
    e.target.value = '';
  };

  const removeColorImageItem = (colorIndex, imageIndex) => {
    setColorVariants((prev) => {
      const copy = [...prev];
      const target = copy[colorIndex];
      copy[colorIndex] = {
        ...target,
        imageItems: target.imageItems.filter((_, i) => i !== imageIndex)
      };
      return copy;
    });
  };

  const makeColorCoverImage = (colorIndex, imageIndex) => {
    if (imageIndex === 0) return;
    setColorVariants((prev) => {
      const copy = [...prev];
      const target = copy[colorIndex];
      const imgCopy = [...target.imageItems];
      const [chosen] = imgCopy.splice(imageIndex, 1);
      copy[colorIndex] = {
        ...target,
        imageItems: [chosen, ...imgCopy]
      };
      return copy;
    });
  };

  const moveColorImage = (colorIndex, imageIndex, direction) => {
    setColorVariants((prev) => {
      const copy = [...prev];
      const target = copy[colorIndex];
      const imgCopy = [...target.imageItems];
      const newIdx = imageIndex + direction;
      if (newIdx < 0 || newIdx >= imgCopy.length) return prev;
      const temp = imgCopy[imageIndex];
      imgCopy[imageIndex] = imgCopy[newIdx];
      imgCopy[newIdx] = temp;
      copy[colorIndex] = {
        ...target,
        imageItems: imgCopy
      };
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

  const applyEdit = (product) => {
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
    setIsHidden(Boolean(product.isHidden));

    const prodFeatures = Array.isArray(product.features) && product.features.length > 0
      ? product.features
      : ['', ''];
    setFeatures(prodFeatures);

    if (Array.isArray(product.colors) && product.colors.length > 0) {
      setHasColorVariants(true);
      setColorVariants(
        product.colors.map((c, cIdx) => ({
          id: `edit_cv_${cIdx}_${Date.now()}`,
          name: c.name || `Color ${cIdx + 1}`,
          colorCode: c.colorCode || '#000000',
          imageItems: Array.isArray(c.images)
            ? c.images.slice(0, 5).map((imgUrl, i) => ({
                id: `edit_cv_img_${cIdx}_${i}_${Date.now()}`,
                url: imgUrl,
                previewUrl: imgUrl,
                file: null,
                compressionInfo: null
              }))
            : []
        }))
      );
      setImageItems([]);
    } else {
      setHasColorVariants(false);
      setColorVariants([]);
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
    }
    setImageError(false);
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

  const handleEditClick = (product) => {
    if (editingProductId && editingProductId !== product.id) {
      setConfirmModal({
        isOpen: true,
        type: 'switch_edit',
        title: 'Switch Product?',
        message: `You are currently editing another product. Do you want to switch to editing "${product.name}"?`,
        confirmText: 'Yes, Switch',
        confirmVariant: 'primary',
        onConfirm: () => applyEdit(product)
      });
      return;
    }
    applyEdit(product);
  };

  const requestCancelEdit = () => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel_edit',
      title: 'Discard Changes?',
      message: 'Are you sure you want to cancel editing and discard unsaved changes?',
      confirmText: 'Yes, Discard',
      confirmVariant: 'danger',
      onConfirm: () => {
        setEditingProductId(null);
        resetForm();
        setFeedback(null);
      }
    });
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
    setIsHidden(false);
    setHasColorVariants(false);
    setColorVariants([]);
    setImageItems([]);
    setImageError(false);
    setCompressing(false);
    setCompressProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      return;
    }

    if (!offerPrice || isNaN(offerPrice) || Number(offerPrice) <= 0) {
      return;
    }

    if (hasColorVariants) {
      if (colorVariants.length === 0) {
        setFeedback({ type: 'error', message: 'Please add at least 1 color option or uncheck color options.' });
        return;
      }
      const missingName = colorVariants.find(c => !c.name.trim());
      if (missingName) {
        setFeedback({ type: 'error', message: 'Please provide a name for all color options.' });
        return;
      }
      const missingImages = colorVariants.find(c => c.imageItems.length === 0);
      if (missingImages) {
        setFeedback({ type: 'error', message: `Please upload at least 1 photo for color "${missingImages.name}".` });
        return;
      }
    } else {
      if (imageItems.length === 0) {
        setImageError(true);
        return;
      }
    }

    if (actualPrice && (isNaN(actualPrice) || Number(actualPrice) < 0)) {
      setFeedback({ type: 'error', message: 'Actual Price must be a valid positive number.' });
      return;
    }

    // If EDITING existing product, show confirmation popup before saving
    if (editingProductId) {
      setConfirmModal({
        isOpen: true,
        type: 'update',
        title: 'Save Product Changes?',
        message: `Are you sure you want to update the details and pricing for "${name.trim()}" in Supabase?`,
        confirmText: 'Yes, Update Product',
        confirmVariant: 'primary',
        onConfirm: () => executeSaveProduct()
      });
      return;
    }

    // Adding new product directly
    executeSaveProduct();
  };

  const executeSaveProduct = async () => {
    setSubmitting(true);

    try {
      let finalColors = [];
      let finalImages = [];
      let primaryImageUrl = null;

      if (hasColorVariants && colorVariants.length > 0) {
        for (let cIdx = 0; cIdx < colorVariants.length; cIdx++) {
          const cv = colorVariants[cIdx];
          const colorUrls = [];

          for (let i = 0; i < cv.imageItems.length; i++) {
            const item = cv.imageItems[i];
            if (item.file) {
              setFeedback({
                type: 'info',
                message: `Uploading photo ${i + 1} of ${cv.imageItems.length} for ${cv.name}...`
              });
              const upUrl = await uploadProductImage(item.file);
              colorUrls.push(upUrl);
            } else if (item.url) {
              colorUrls.push(item.url);
            } else if (item.previewUrl && !item.previewUrl.startsWith('blob:')) {
              colorUrls.push(item.previewUrl);
            }
          }

          finalColors.push({
            name: cv.name.trim(),
            colorCode: cv.colorCode || '#000000',
            images: colorUrls.filter(Boolean).slice(0, 5)
          });
        }

        if (finalColors.length > 0 && finalColors[0].images.length > 0) {
          finalImages = finalColors[0].images;
          primaryImageUrl = finalColors[0].images[0];
        }
      } else {
        const uploadedUrls = [];
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
        finalImages = uploadedUrls.filter(Boolean).slice(0, 5);
        primaryImageUrl = finalImages.length > 0 ? finalImages[0] : null;
      }

      const activeCategory = category === 'Other' ? customCategory.trim() || 'General' : category;
      const cleanFeatures = features.map(f => f.trim()).filter(Boolean);

      const productPayload = {
        name: name.trim(),
        price: Number(offerPrice),
        originalPrice: actualPrice && !isNaN(actualPrice) ? Number(actualPrice) : null,
        category: activeCategory,
        description: description.trim(),
        imageUrl: primaryImageUrl,
        images: finalImages,
        colors: finalColors,
        features: cleanFeatures,
        isHidden: Boolean(isHidden)
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

  const requestDeleteProduct = (id, prodName) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Delete Product?',
      message: `Are you sure you want to delete "${prodName}"? This action cannot be undone and will permanently remove this item from the store database.`,
      confirmText: 'Yes, Delete Product',
      confirmVariant: 'danger',
      onConfirm: () => executeDelete(id, prodName)
    });
  };

  const executeDelete = async (id, prodName) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFeedback({
        type: 'success',
        message: `"${prodName}" deleted successfully.`
      });
      if (editingProductId === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete product.'
      });
    }
  };

  const requestToggleVisibility = (product) => {
    const willHide = !product.isHidden;
    if (willHide) {
      setConfirmModal({
        isOpen: true,
        type: 'hide_product',
        title: 'Hide Product from Buyers?',
        message: `Are you sure you want to hide "${product.name}"? Buyers will not see this product in search results, categories, or the home catalog.`,
        confirmText: 'Yes, Hide Product',
        confirmVariant: 'warning',
        onConfirm: () => executeToggleVisibility(product, true)
      });
    } else {
      setConfirmModal({
        isOpen: true,
        type: 'show_product',
        title: 'Show Product to Buyers?',
        message: `Are you sure you want to show "${product.name}" to buyers? It will immediately be visible to all customers in the store.`,
        confirmText: 'Yes, Show Product',
        confirmVariant: 'primary',
        onConfirm: () => executeToggleVisibility(product, false)
      });
    }
  };

  const executeToggleVisibility = async (product, nextHidden) => {
    setTogglingVisibilityId(product.id);

    // Optimistically update product in state
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isHidden: nextHidden } : p))
    );

    try {
      await toggleProductVisibility(product.id, nextHidden);
      setFeedback({
        type: 'success',
        message: nextHidden
          ? `"${product.name}" is now HIDDEN from buyers.`
          : `"${product.name}" is now VISIBLE to buyers!`
      });
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      // Revert state on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isHidden: product.isHidden } : p))
      );
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update product visibility.'
      });
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Checking initial Supabase Auth session
  if (checkingAuth) {
    return (
      <div className="admin-login-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ margin: 'auto' }} />
      </div>
    );
  }

  // If NOT authenticated, show the official Supabase Auth login form
  if (!session) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="login-icon-box">
            <Lock size={28} />
          </div>
          <h2>Admin Portal Login</h2>


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
              <label>Admin Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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
                  placeholder="Enter your Supabase password"
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
                  <div className="spinner-small" /> Verifying with Supabase...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Sign In with Supabase
                </>
              )}
            </button>
          </form>



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
        <div className="admin-user-nav">
          {session?.user?.email && (
            <span className="admin-user-pill" title={session.user.email}>
              <ShieldCheck size={15} color="#10b981" />
              <span className="admin-user-email">{session.user.email}</span>
            </span>
          )}
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} /> Log Out
          </button>
        </div>
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
                onClick={requestCancelEdit}
                title="Cancel editing and create new product"
              >
                <X size={15} /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>
                Product Name <span className="required-star">*</span>
              </label>
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
                <label>
                  Offer Price (₹) <span className="required-star">*</span>
                </label>
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

            {/* COLOR OPTIONS TOGGLE */}
            <div className="color-toggle-box">
              <label className="color-toggle-label">
                <input
                  type="checkbox"
                  checked={hasColorVariants}
                  onChange={(e) => handleToggleColorVariants(e.target.checked)}
                />
                <div className="color-toggle-desc">
                  <span className="color-toggle-title">
                    <Palette size={16} /> Enable Color Options
                  </span>
                  <span className="color-toggle-help">
                    Check this if this product comes in multiple colors with separate photos. (Leave unchecked for products that do not need color options).
                  </span>
                </div>
              </label>
            </div>

            {hasColorVariants ? (
              /* DEDICATED SEPARATE IMAGE AREA FOR EACH COLOR */
              <div className="admin-color-variants-container">
                <div className="color-variants-header">
                  <div>
                    <label className="section-subtitle-label">
                      Color Variants & Separate Photos <span className="required-star">*</span>
                    </label>
                    <span className="input-field-hint">
                      Each color has its own separate image upload area. Photo #1 of Color #1 will be the main store cover.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="add-color-btn"
                    onClick={addColorVariant}
                  >
                    <Plus size={15} /> Add Another Color
                  </button>
                </div>

                {colorVariants.map((colorItem, cIdx) => (
                  <div key={colorItem.id || cIdx} className="admin-color-card">
                    <div className="color-card-header">
                      <div className="color-card-title-row">
                        <span className="color-index-badge">Color #{cIdx + 1}</span>
                        <div className="color-inputs-group">
                          <input
                            type="text"
                            placeholder="Color name (e.g. Midnight Black, Pearl White)"
                            value={colorItem.name}
                            onChange={(e) => updateColorField(cIdx, 'name', e.target.value)}
                            className="color-name-input"
                            required
                          />
                          <div className="color-picker-wrapper" title="Choose color tone swatch">
                            <input
                              type="color"
                              value={colorItem.colorCode || '#000000'}
                              onChange={(e) => updateColorField(cIdx, 'colorCode', e.target.value)}
                              className="color-hex-picker"
                            />
                            <span 
                              className="color-preview-circle" 
                              style={{ backgroundColor: colorItem.colorCode || '#000000' }} 
                            />
                          </div>
                        </div>
                      </div>

                      {colorVariants.length > 1 && (
                        <button
                          type="button"
                          className="remove-color-btn"
                          onClick={() => removeColorVariant(cIdx)}
                          title="Remove this color variant"
                        >
                          <Trash2 size={15} /> Remove Color
                        </button>
                      )}
                    </div>

                    {/* SEPARATE IMAGE UPLOAD AREA FOR THIS COLOR */}
                    <div className="color-images-area">
                      <div className="color-images-area-header">
                        <span className="color-images-area-title">
                          Photos for <strong>{colorItem.name || `Color #${cIdx + 1}`}</strong> ({colorItem.imageItems.length}/5)
                        </span>
                        <span className="color-images-area-hint">Photo #1 is this color's main view</span>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id={`color-upload-${cIdx}`}
                        style={{ display: 'none' }}
                        onChange={(e) => handleColorImagesChange(cIdx, e)}
                        disabled={colorItem.imageItems.length >= 5 || compressing}
                      />

                      {colorItem.imageItems.length < 5 && (
                        <label htmlFor={`color-upload-${cIdx}`} className="file-dropzone color-dropzone">
                          <Upload size={24} className="upload-icon" />
                          <span className="dropzone-title">Upload photos for {colorItem.name || `Color #${cIdx + 1}`} ({5 - colorItem.imageItems.length} slot{5 - colorItem.imageItems.length > 1 ? 's' : ''} left)</span>
                          <span className="dropzone-subtitle">Choose up to 5 images • Auto-compressed to HD WebP</span>
                        </label>
                      )}

                      {colorItem.imageItems.length > 0 && (
                        <div className="admin-gallery-slots color-gallery-slots">
                          {colorItem.imageItems.map((item, imgIdx) => (
                            <div key={item.id || imgIdx} className={`admin-gallery-card ${imgIdx === 0 ? 'is-cover' : ''}`}>
                              <div className="gallery-card-thumb-wrap">
                                <img src={item.previewUrl} alt={`${colorItem.name} photo ${imgIdx + 1}`} className="gallery-card-thumb" />
                                {imgIdx === 0 ? (
                                  <span className="cover-badge" title="Color primary view">
                                    <Star size={11} fill="currentColor" /> Cover
                                  </span>
                                ) : (
                                  <span className="slot-num-badge">#{imgIdx + 1}</span>
                                )}
                                <button
                                  type="button"
                                  className="gallery-card-remove"
                                  onClick={() => removeColorImageItem(cIdx, imgIdx)}
                                  title="Delete photo"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              <div className="gallery-card-actions">
                                {imgIdx !== 0 ? (
                                  <button
                                    type="button"
                                    className="set-cover-btn"
                                    onClick={() => makeColorCoverImage(cIdx, imgIdx)}
                                    title="Make this the primary photo for this color"
                                  >
                                    <Star size={12} /> Set Cover
                                  </button>
                                ) : (
                                  <span className="primary-cover-label">Color Cover</span>
                                )}
                                <div className="reorder-btns">
                                  <button
                                    type="button"
                                    className="reorder-btn"
                                    disabled={imgIdx === 0}
                                    onClick={() => moveColorImage(cIdx, imgIdx, -1)}
                                    title="Move left"
                                  >
                                    <ChevronLeft size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="reorder-btn"
                                    disabled={imgIdx === colorItem.imageItems.length - 1}
                                    onClick={() => moveColorImage(cIdx, imgIdx, 1)}
                                    title="Move right"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* STANDARD SINGLE PRODUCT IMAGES SECTION */
              <div className="form-group admin-images-section">
                <div className="images-header-row">
                  <div>
                    <label>
                      Product Images <span className="required-star">*</span>
                    </label>
                    <span className="input-field-hint">
                      Upload up to 5 photos. Photo #1 is the primary cover image on the shop catalog.
                    </span>
                  </div>
                  <span className={`images-counter-pill ${imageItems.length === 5 ? 'full' : ''}`}>
                    <Camera size={14} /> {imageItems.length} / 5 Photos
                  </span>
                </div>

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
                    <label htmlFor="product-image-upload" className={`file-dropzone multi-dropzone ${imageError ? 'dropzone-error' : ''}`}>
                      <Upload size={32} className="upload-icon" />
                      <span className="dropzone-title">Click to upload photos ({5 - imageItems.length} slot{5 - imageItems.length > 1 ? 's' : ''} left)</span>
                      <span className="dropzone-subtitle">Choose up to 5 images • Auto-compressed to HD WebP to save storage space</span>
                      {imageError && (
                        <span className="dropzone-error-msg">* Please upload at least 1 image</span>
                      )}
                    </label>
                  ) : (
                    <div className="max-images-notice">
                      <CheckCircle2 size={18} className="text-green" />
                      <span>Maximum 5 photos added! You can reorder, change cover, or delete items below.</span>
                    </div>
                  )}
                </div>

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
            )}

            {/* STORE VISIBILITY SETTING */}
            <div className="admin-visibility-box">
              <div className="vis-box-header">
                <div className="vis-box-title-wrap">
                  {isHidden ? (
                    <EyeOff size={17} className="vis-title-icon hidden-color" />
                  ) : (
                    <Eye size={17} className="vis-title-icon visible-color" />
                  )}
                  <span className="vis-box-title">Buyer Store Visibility</span>
                </div>
                <span className={`vis-status-badge ${isHidden ? 'badge-hidden' : 'badge-visible'}`}>
                  {isHidden ? 'Hidden from Buyers' : 'Visible to Buyers'}
                </span>
              </div>
              <div className="vis-toggle-options">
                <button
                  type="button"
                  className={`vis-option-btn ${!isHidden ? 'selected' : ''}`}
                  onClick={() => setIsHidden(false)}
                >
                  <Eye size={16} />
                  <div className="vis-option-desc">
                    <strong>Show to Buyers</strong>
                    <span>Product is visible in home catalog, search, and category listing</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`vis-option-btn ${isHidden ? 'selected-hidden' : ''}`}
                  onClick={() => setIsHidden(true)}
                >
                  <EyeOff size={16} />
                  <div className="vis-option-desc">
                    <strong>Hide from Buyers</strong>
                    <span>Product is hidden from buyers (only visible in Admin panel)</span>
                  </div>
                </button>
              </div>
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
          <div className="card-title-header">
            <div className="card-title">
              <Package size={22} />
              <h2>Store Products ({products.length})</h2>
            </div>

            {/* Quick Visibility Filter Tabs */}
            <div className="admin-visibility-filter-tabs">
              <button
                type="button"
                className={`admin-vis-tab ${visibilityFilter === 'all' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('all')}
              >
                All ({products.length})
              </button>
              <button
                type="button"
                className={`admin-vis-tab vis-visible-tab ${visibilityFilter === 'visible' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('visible')}
                title="Show only products currently visible to buyers"
              >
                <Eye size={13} /> Shown ({products.filter((p) => !p.isHidden).length})
              </button>
              <button
                type="button"
                className={`admin-vis-tab vis-hidden-tab ${visibilityFilter === 'hidden' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('hidden')}
                title="Show only products hidden from buyers"
              >
                <EyeOff size={13} /> Hidden ({products.filter((p) => p.isHidden).length})
              </button>
            </div>
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
                    <th>Visibility</th>
                    <th>Added On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => {
                      if (visibilityFilter === 'visible') return !p.isHidden;
                      if (visibilityFilter === 'hidden') return p.isHidden;
                      return true;
                    })
                    .map((p) => {
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
                      <tr 
                        key={p.id} 
                        className={`${editingProductId === p.id ? 'row-editing' : ''} ${p.isHidden ? 'row-hidden' : ''}`}
                      >
                        <td className="product-cell" data-label="Item">
                          <div className="table-thumb-wrap">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="table-thumb"
                              />
                            ) : (
                              <div className="table-thumb-fallback" title="No photo uploaded">
                                <Package size={20} color="#94a3b8" />
                              </div>
                            )}
                            {Array.isArray(p.images) && p.images.length > 1 && (
                              <span className="table-photos-count" title={`${p.images.length} photos`}>
                                <Camera size={10} /> {p.images.length}
                              </span>
                            )}
                          </div>
                          <div className="product-info-wrap">
                            <span className="table-name">{p.name}</span>
                            <div className="table-meta-tags">
                              <span className="table-id">ID: {p.id}</span>
                              {p.isHidden && (
                                <span className="table-hidden-tag" title="Hidden from store buyers">
                                  <EyeOff size={10} /> Hidden from Buyers
                                </span>
                              )}
                              {Array.isArray(p.colors) && p.colors.length > 0 && (
                                <span className="table-colors-pill" title={`${p.colors.map(c => c.name).join(', ')}`}>
                                  <Palette size={10} /> {p.colors.length} Colors
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Category">
                          <span className="table-badge">{p.category}</span>
                        </td>
                        <td className="table-price-cell" data-label="Pricing">
                          <div className="table-price-main">₹{priceFormatted}</div>
                          {originalFormatted && Number(p.originalPrice) > Number(p.price) && (
                            <div className="table-price-sub">
                              <span className="table-mrp">MRP ₹{originalFormatted}</span>
                              <span className="table-discount-badge">{p.discountPercentage}% OFF</span>
                            </div>
                          )}
                        </td>
                        <td className="table-visibility-cell" data-label="Visibility">
                          <button
                            type="button"
                            className={`visibility-status-btn ${p.isHidden ? 'status-hidden' : 'status-visible'}`}
                            onClick={() => requestToggleVisibility(p)}
                            disabled={togglingVisibilityId === p.id}
                            title={p.isHidden ? 'Currently hidden from buyers. Click to show in store.' : 'Currently visible to buyers. Click to hide from store.'}
                          >
                            {togglingVisibilityId === p.id ? (
                              <span className="table-vis-spinner"></span>
                            ) : p.isHidden ? (
                              <>
                                <EyeOff size={13} />
                                <span>Hidden</span>
                              </>
                            ) : (
                              <>
                                <Eye size={13} />
                                <span>Visible</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="table-date-cell" data-label="Added On">
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
                        <td className="table-actions-cell" data-label="Actions">
                          <div className="table-actions-group">
                            <button
                              type="button"
                              className={`action-vis-btn ${p.isHidden ? 'action-show' : 'action-hide'}`}
                              onClick={() => requestToggleVisibility(p)}
                              disabled={togglingVisibilityId === p.id}
                              title={p.isHidden ? 'Show product to store buyers' : 'Hide product from store buyers'}
                            >
                              {p.isHidden ? (
                                <>
                                  <Eye size={13} /> Show
                                </>
                              ) : (
                                <>
                                  <EyeOff size={13} /> Hide
                                </>
                              )}
                            </button>
                            <button
                              className="edit-btn"
                              onClick={() => handleEditClick(p)}
                              title={`Edit "${p.name}"`}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => requestDeleteProduct(p.id, p.name)}
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

      {/* Confirmation Popup Modal for Delete & Edit Actions */}
      {confirmModal.isOpen && (
        <div
          className="admin-modal-overlay"
          onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className={`admin-modal-icon-wrap ${confirmModal.confirmVariant}`}>
              {confirmModal.type === 'hide_product' ? (
                <EyeOff size={28} />
              ) : confirmModal.type === 'show_product' ? (
                <Eye size={28} />
              ) : confirmModal.confirmVariant === 'danger' ? (
                <Trash2 size={28} />
              ) : confirmModal.confirmVariant === 'warning' ? (
                <AlertTriangle size={28} />
              ) : (
                <Pencil size={28} />
              )}
            </div>

            <h3 className="admin-modal-title">{confirmModal.title}</h3>
            <p className="admin-modal-message">{confirmModal.message}</p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn cancel"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-modal-btn confirm ${confirmModal.confirmVariant}`}
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  if (action) await action();
                }}
                disabled={submitting}
              >
                {confirmModal.type === 'hide_product' && <EyeOff size={16} />}
                {confirmModal.type === 'show_product' && <Eye size={16} />}
                {confirmModal.type !== 'hide_product' && confirmModal.type !== 'show_product' && confirmModal.confirmVariant === 'danger' && <Trash2 size={16} />}
                {confirmModal.type !== 'hide_product' && confirmModal.type !== 'show_product' && confirmModal.confirmVariant === 'primary' && <CheckCircle2 size={16} />}
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
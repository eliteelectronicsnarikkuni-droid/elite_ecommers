import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';

const normalizeProduct = (row) => {
  if (!row) return null;

  let rawFeatures = [];
  let mrpFromFeatures = null;

  if (Array.isArray(row.features)) {
    rawFeatures = row.features;
  } else if (typeof row.features === 'string') {
    try {
      rawFeatures = JSON.parse(row.features);
    } catch {
      rawFeatures = row.features.split(',').map((f) => f.trim());
    }
  }

  // Extract __mrp__:, __images__:, __colors__:, __hidden__:, and __order__: metadata if stored in features
  const cleanFeatures = [];
  let imagesFromFeatures = [];
  let colorsFromFeatures = [];
  let hiddenFromFeatures = false;
  let orderFromFeatures = null;
  for (const f of rawFeatures) {
    if (typeof f === 'string' && f.startsWith('__mrp__:')) {
      const parsed = Number(f.replace('__mrp__:', '').trim());
      if (!isNaN(parsed) && parsed > 0) {
        mrpFromFeatures = parsed;
      }
    } else if (typeof f === 'string' && f.startsWith('__images__:')) {
      try {
        const parsed = JSON.parse(f.replace('__images__:', ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          imagesFromFeatures = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing __images__ from features:', e);
      }
    } else if (typeof f === 'string' && f.startsWith('__colors__:')) {
      try {
        const parsed = JSON.parse(f.replace('__colors__:', ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          colorsFromFeatures = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing __colors__ from features:', e);
      }
    } else if (typeof f === 'string' && f.startsWith('__hidden__:')) {
      const val = f.replace('__hidden__:', '').trim().toLowerCase();
      if (val === 'true' || val === '1') {
        hiddenFromFeatures = true;
      }
    } else if (typeof f === 'string' && f.startsWith('__order__:')) {
      const parsed = Number(f.replace('__order__:', '').trim());
      if (!isNaN(parsed) && parsed > 0) {
        orderFromFeatures = parsed;
      }
    } else {
      cleanFeatures.push(f);
    }
  }

  // Extract up to 5 images for gallery
  let imagesList = [];
  if (Array.isArray(row.images) && row.images.length > 0) {
    imagesList = row.images;
  } else if (imagesFromFeatures.length > 0) {
    imagesList = imagesFromFeatures;
  } else if (typeof row.images === 'string') {
    try {
      imagesList = JSON.parse(row.images);
    } catch {
      imagesList = row.images.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Check if row.image_url is a JSON array string
  if (imagesList.length === 0 && row.image_url) {
    if (typeof row.image_url === 'string' && row.image_url.trim().startsWith('[')) {
      try {
        imagesList = JSON.parse(row.image_url);
      } catch {
        imagesList = [row.image_url];
      }
    } else {
      imagesList = [row.image_url];
    }
  }

  // Extract colors
  let productColors = [];
  if (Array.isArray(row.colors) && row.colors.length > 0) {
    productColors = row.colors;
  } else if (typeof row.colors === 'string') {
    try {
      const parsed = JSON.parse(row.colors);
      if (Array.isArray(parsed)) productColors = parsed;
    } catch {}
  } else if (colorsFromFeatures.length > 0) {
    productColors = colorsFromFeatures;
  }

  // If imagesList is empty but product has colors, populate imagesList with the first color's images
  if (imagesList.length === 0 && productColors.length > 0) {
    const firstColorImages = productColors[0]?.images || [];
    if (Array.isArray(firstColorImages) && firstColorImages.length > 0) {
      imagesList = [...firstColorImages];
    }
  }

  // Sanitize and limit to 5 images
  imagesList = Array.from(new Set(imagesList.filter(Boolean))).slice(0, 5);
  const primaryImageUrl = imagesList[0] || row.image_url || row.imageUrl || '';
  if (imagesList.length === 0 && primaryImageUrl) {
    imagesList = [primaryImageUrl];
  }

  const offerPrice = Number(row.price) || 0;

  // Check row.original_price, then row.originalPrice, then mrpFromFeatures
  let originalPrice = row.original_price != null 
    ? Number(row.original_price) 
    : (row.originalPrice != null 
        ? Number(row.originalPrice) 
        : mrpFromFeatures);

  // If no originalPrice is set in database, compute an intelligent retail MRP (e.g. ~30% higher)
  // so buyers immediately see the Actual Price, Offer Price, and Discount % for every item
  if ((!originalPrice || originalPrice <= offerPrice) && offerPrice > 0) {
    const calculatedMrp = Math.round((offerPrice * 1.35) / 10) * 10 - 1;
    originalPrice = calculatedMrp > offerPrice ? calculatedMrp : Math.round(offerPrice * 1.3);
  }

  let discountPercentage = 0;
  if (originalPrice && originalPrice > offerPrice) {
    discountPercentage = Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
  }

  // Determine visibility status (Default: visible / not hidden)
  const isRowHidden = row.is_hidden === true || row.is_hidden === 'true' || row.is_hidden === 1 || row.is_hidden === '1';
  const isRowExplicitVisibleFalse = row.is_visible === false || row.is_visible === 'false' || row.is_visible === 0;
  const isHidden = Boolean(
    hiddenFromFeatures ||
    isRowHidden ||
    row.isHidden === true ||
    isRowExplicitVisibleFalse
  );

  let displayOrder = row.display_order ?? row.position ?? orderFromFeatures;
  if (displayOrder !== null && displayOrder !== undefined && !isNaN(Number(displayOrder))) {
    displayOrder = Number(displayOrder);
  } else {
    displayOrder = null;
  }

  return {
    id: String(row.id),
    name: row.name || '',
    price: offerPrice,
    originalPrice: originalPrice,
    discountPercentage: discountPercentage,
    description: row.description || '',
    category: row.category || 'General',
    imageUrl: primaryImageUrl,
    images: imagesList,
    colors: productColors,
    features: cleanFeatures,
    _rawFeatures: rawFeatures,
    isHidden: Boolean(isHidden),
    displayOrder: displayOrder,
    createdAt: row.created_at || row.createdAt || null
  };
};

/**
 * Sort products according to the admin-assigned display order:
 * 1. Explicit displayOrder (1, 2, 3...) comes first
 * 2. Fallback: newest added items first (createdAt descending, or id descending)
 */
export const sortProductsByDisplayOrder = (productList) => {
  if (!Array.isArray(productList)) return [];
  return [...productList].sort((a, b) => {
    const aOrder = a && a.displayOrder !== null && a.displayOrder !== undefined ? Number(a.displayOrder) : null;
    const bOrder = b && b.displayOrder !== null && b.displayOrder !== undefined ? Number(b.displayOrder) : null;

    if (aOrder !== null && bOrder !== null) {
      if (aOrder !== bOrder) return aOrder - bOrder;
    } else if (aOrder !== null) {
      return -1;
    } else if (bOrder !== null) {
      return 1;
    }

    // Fallback: If neither has explicit displayOrder, order by created_at descending (newest first)
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime && bTime && aTime !== bTime) {
      return bTime - aTime;
    }

    return Number(b?.id || 0) - Number(a?.id || 0);
  });
};

// Multi-Tier High Performance Cache
const CACHE_KEY = 'elite_products_cache_v4';

// Auto-purge any stale caches from previous schema versions
try {
  sessionStorage.removeItem('elite_products_cache');
  sessionStorage.removeItem('elite_products_cache_v2');
  sessionStorage.removeItem('elite_products_cache_v3');
} catch {}

let memoryCache = null; // { products: [...], timestamp: number }
let inflightPromise = null; // In-flight request deduplication
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes fresh cache

const getSessionCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0 && (Date.now() - parsed.timestamp < CACHE_TTL * 3)) {
      return parsed;
    }
  } catch {}
  return null;
};

const setSessionCache = (products) => {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      products,
      timestamp: Date.now()
    }));
  } catch {}
};

export const invalidateProductCache = () => {
  memoryCache = null;
  inflightPromise = null;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem('elite_products_cache');
    sessionStorage.removeItem('elite_products_cache_v2');
  } catch {}
};

export const getCachedProducts = ({ includeHidden = false } = {}) => {
  let list = null;
  if (memoryCache && Array.isArray(memoryCache.products) && memoryCache.products.length > 0) {
    list = memoryCache.products;
  } else {
    const sessionCache = getSessionCache();
    if (sessionCache && Array.isArray(sessionCache.products) && sessionCache.products.length > 0) {
      memoryCache = sessionCache;
      list = sessionCache.products;
    }
  }
  if (!list) return null;
  const sorted = sortProductsByDisplayOrder(list);
  if (includeHidden) return sorted;
  return sorted.filter((p) => {
    if (p.isHidden === true || p.is_hidden === true) return false;
    if (Array.isArray(p.features) && p.features.some((f) => typeof f === 'string' && f.startsWith('__hidden__:'))) return false;
    return true;
  });
};

export const getProducts = async ({ forceRefresh = false, includeHidden = false } = {}) => {
  const filterList = (list) => {
    if (!Array.isArray(list)) return [];
    const sorted = sortProductsByDisplayOrder(list);
    if (includeHidden) return sorted;
    return sorted.filter((p) => {
      if (p.isHidden === true || p.is_hidden === true) return false;
      if (Array.isArray(p.features) && p.features.some((f) => typeof f === 'string' && f.startsWith('__hidden__:'))) return false;
      return true;
    });
  };

  // If not forcing refresh, return instant cache if available and non-empty
  if (!forceRefresh) {
    if (memoryCache && Array.isArray(memoryCache.products) && memoryCache.products.length > 0 && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
      return {
        products: filterList(memoryCache.products),
        source: 'memory_cache'
      };
    }

    const sessionCache = getSessionCache();
    if (sessionCache && Array.isArray(sessionCache.products) && sessionCache.products.length > 0) {
      memoryCache = sessionCache;
      return {
        products: filterList(sessionCache.products),
        source: 'session_cache'
      };
    }
  }

  // Deduplicate concurrent network calls (e.g. Navbar & Home firing together)
  if (inflightPromise) {
    return inflightPromise;
  }

  if (!isSupabaseConfigured) {
    return {
      products: [],
      source: 'local'
    };
  }

  inflightPromise = (async () => {
    try {
      const fetchPromise = supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      // 8s timeout prevents free Supabase cold-start from freezing user interface
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase response timed out')), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.warn('Error fetching products from Supabase:', error.message);
        if (memoryCache?.products?.length) {
          return { products: filterList(memoryCache.products), source: 'stale_cache' };
        }
        return {
          products: [],
          source: 'error',
          error: error.message
        };
      }

      const normalized = (data || []).map(normalizeProduct);
      const sorted = sortProductsByDisplayOrder(normalized);
      if (sorted.length > 0) {
        memoryCache = { products: sorted, timestamp: Date.now() };
        setSessionCache(sorted);
      }

      return {
        products: filterList(sorted),
        source: 'supabase'
      };
    } catch (err) {
      console.warn('Network or cold-start issue fetching products:', err.message);
      if (memoryCache?.products?.length) {
        return { products: filterList(memoryCache.products), source: 'stale_cache' };
      }
      const sessionCache = getSessionCache();
      if (sessionCache?.products?.length) {
        memoryCache = sessionCache;
        return { products: filterList(sessionCache.products), source: 'session_cache' };
      }
      return {
        products: [],
        source: 'error',
        error: err.message
      };
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
};

export const getProductById = async (id) => {
  // 1. Instant Memory Cache Lookup (0ms!)
  if (memoryCache && Array.isArray(memoryCache.products)) {
    const found = memoryCache.products.find((p) => String(p.id) === String(id));
    if (found) {
      return {
        product: found,
        source: 'memory_cache'
      };
    }
  }

  // 2. Instant Session Storage Cache Lookup (0ms!)
  const sessionCache = getSessionCache();
  if (sessionCache && Array.isArray(sessionCache.products)) {
    const found = sessionCache.products.find((p) => String(p.id) === String(id));
    if (found) {
      return {
        product: found,
        source: 'session_cache'
      };
    }
  }

  if (!isSupabaseConfigured) {
    return {
      product: null,
      source: 'local'
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching product ${id} from Supabase:`, error.message);
      return {
        product: null,
        source: 'error',
        error: error.message
      };
    }

    if (!data) {
      return {
        product: null,
        source: 'not_found'
      };
    }

    return {
      product: normalizeProduct(data),
      source: 'supabase'
    };
  } catch (err) {
    console.error('Unexpected error fetching product:', err);
    return {
      product: null,
      source: 'error',
      error: err.message
    };
  }
};

export const uploadProductImage = async (file) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  // Ensure file is compressed to save space without losing visual quality
  let fileToUpload = file;
  try {
    const { compressedFile } = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.83 });
    fileToUpload = compressedFile;
  } catch (err) {
    console.warn('Image compression fallback, uploading original:', err);
  }

  const fileExt = fileToUpload.name.split('.').pop() || 'webp';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, fileToUpload, {
      cacheControl: '31536000',
      upsert: false,
      contentType: fileToUpload.type || 'image/webp'
    });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
};

export const uploadProductImages = async (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  return Promise.all(files.slice(0, 5).map((file) => uploadProductImage(file)));
};

export const createProduct = async (productData) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const offerPrice = Number(productData.price || productData.offerPrice) || 0;
  const originalPrice = productData.originalPrice ? Number(productData.originalPrice) : null;

  // Process colors and up to 5 images for gallery
  const colorsList = Array.isArray(productData.colors) ? productData.colors : [];
  let imagesList = Array.isArray(productData.images) && productData.images.length > 0
    ? productData.images.filter(Boolean).slice(0, 5)
    : (productData.imageUrl ? [productData.imageUrl] : []);

  if (imagesList.length === 0 && colorsList.length > 0) {
    const firstColorImgs = colorsList[0]?.images || [];
    if (firstColorImgs.length > 0) {
      imagesList = firstColorImgs.filter(Boolean).slice(0, 5);
    }
  }
  const primaryImage = imagesList[0] || productData.imageUrl || '';

  // Embed __mrp__:, __images__:, and __colors__: metadata into features list so data is permanently saved
  const featuresList = [...(productData.features || [])];
  if (originalPrice && !isNaN(originalPrice) && originalPrice > 0) {
    featuresList.push(`__mrp__:${originalPrice}`);
  }
  if (imagesList.length > 0) {
    featuresList.push(`__images__:${JSON.stringify(imagesList)}`);
  }
  if (colorsList.length > 0) {
    featuresList.push(`__colors__:${JSON.stringify(colorsList)}`);
  }
  const isHidden = Boolean(productData.isHidden);
  if (isHidden) {
    featuresList.push('__hidden__:true');
  }
  if (productData.displayOrder) {
    featuresList.push(`__order__:${productData.displayOrder}`);
  }

  const newProduct = {
    name: productData.name,
    price: offerPrice,
    description: productData.description || '',
    category: productData.category || 'General',
    image_url: primaryImage,
    features: featuresList,
    is_hidden: isHidden
  };

  if (originalPrice !== null && !isNaN(originalPrice)) {
    newProduct.original_price = originalPrice;
  }

  let { data, error } = await supabase
    .from('products')
    .insert([newProduct])
    .select()
    .single();

  // If column original_price or is_hidden doesn't exist yet (PostgreSQL error 42703), retry
  if (error && (error.code === '42703' || error.message?.includes('is_hidden') || error.message?.includes('original_price'))) {
    if (error.message?.includes('is_hidden')) delete newProduct.is_hidden;
    if (error.message?.includes('original_price')) delete newProduct.original_price;
    const retryRes = await supabase
      .from('products')
      .insert([newProduct])
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;

    if (error && (error.code === '42703' || error.message?.includes('is_hidden') || error.message?.includes('original_price'))) {
      delete newProduct.is_hidden;
      delete newProduct.original_price;
      const secondRetry = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      data = secondRetry.data;
      error = secondRetry.error;
    }
  }

  if (error) {
    throw error;
  }

  invalidateProductCache();
  return normalizeProduct(data);
};

export const updateProduct = async (id, productData) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const offerPrice = Number(productData.price || productData.offerPrice) || 0;
  const originalPrice = productData.originalPrice ? Number(productData.originalPrice) : null;

  // Process colors and up to 5 images for gallery
  const colorsList = Array.isArray(productData.colors) ? productData.colors : [];
  let imagesList = Array.isArray(productData.images) && productData.images.length > 0
    ? productData.images.filter(Boolean).slice(0, 5)
    : (productData.imageUrl ? [productData.imageUrl] : []);

  if (imagesList.length === 0 && colorsList.length > 0) {
    const firstColorImgs = colorsList[0]?.images || [];
    if (firstColorImgs.length > 0) {
      imagesList = firstColorImgs.filter(Boolean).slice(0, 5);
    }
  }
  const primaryImage = imagesList[0] || productData.imageUrl || '';

  // Embed __mrp__:, __images__:, __colors__:, __hidden__:, and __order__: metadata into features list
  const featuresList = (productData.features || []).filter(
    (f) => typeof f !== 'string' || (!f.startsWith('__hidden__:') && !f.startsWith('__mrp__:') && !f.startsWith('__images__:') && !f.startsWith('__colors__:') && !f.startsWith('__order__:'))
  );
  if (originalPrice && !isNaN(originalPrice) && originalPrice > 0) {
    featuresList.push(`__mrp__:${originalPrice}`);
  }
  if (imagesList.length > 0) {
    featuresList.push(`__images__:${JSON.stringify(imagesList)}`);
  }
  if (colorsList.length > 0) {
    featuresList.push(`__colors__:${JSON.stringify(colorsList)}`);
  }
  const isHidden = Boolean(productData.isHidden);
  if (isHidden) {
    featuresList.push('__hidden__:true');
  }
  if (productData.displayOrder) {
    featuresList.push(`__order__:${productData.displayOrder}`);
  }

  const updatedProduct = {
    name: productData.name,
    price: offerPrice,
    description: productData.description || '',
    category: productData.category || 'General',
    image_url: primaryImage,
    features: featuresList,
    is_hidden: isHidden
  };

  if (originalPrice !== null && !isNaN(originalPrice)) {
    updatedProduct.original_price = originalPrice;
  }

  let { data, error } = await supabase
    .from('products')
    .update(updatedProduct)
    .eq('id', id)
    .select()
    .single();

  // If column original_price or is_hidden doesn't exist yet, retry without failing column
  if (error && (error.code === '42703' || error.message?.includes('is_hidden') || error.message?.includes('original_price'))) {
    if (error.message?.includes('is_hidden')) delete updatedProduct.is_hidden;
    if (error.message?.includes('original_price')) delete updatedProduct.original_price;
    const retryRes = await supabase
      .from('products')
      .update(updatedProduct)
      .eq('id', id)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;

    if (error && (error.code === '42703' || error.message?.includes('is_hidden') || error.message?.includes('original_price'))) {
      delete updatedProduct.is_hidden;
      delete updatedProduct.original_price;
      const secondRetry = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', id)
        .select()
        .single();
      data = secondRetry.data;
      error = secondRetry.error;
    }
  }

  if (error) {
    throw error;
  }

  invalidateProductCache();
  return normalizeProduct(data);
};

export const toggleProductVisibility = async (id, isHidden) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data: current, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !current) {
    throw new Error(fetchErr?.message || 'Product not found');
  }

  let rawFeatures = [];
  if (Array.isArray(current.features)) {
    rawFeatures = current.features;
  } else if (typeof current.features === 'string') {
    try {
      rawFeatures = JSON.parse(current.features);
    } catch {
      rawFeatures = current.features.split(',').map((f) => f.trim());
    }
  }

  const newFeatures = rawFeatures.filter(
    (f) => typeof f !== 'string' || !f.startsWith('__hidden__:')
  );
  if (isHidden) {
    newFeatures.push('__hidden__:true');
  }

  const updatePayload = {
    features: newFeatures,
    is_hidden: Boolean(isHidden)
  };

  let { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error && (error.code === '42703' || error.message?.includes('is_hidden'))) {
    delete updatePayload.is_hidden;
    const retryRes = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    throw error;
  }

  invalidateProductCache();
  return normalizeProduct(data);
};

/**
 * Reorders products and assigns sequential display positions:
 * Updates the in-memory cache, session storage, and persists __order__:<position>
 * metadata to Supabase so the order is immediately visible on the home store.
 */
export const updateProductOrder = async (reorderedProducts) => {
  if (!Array.isArray(reorderedProducts) || reorderedProducts.length === 0) return [];

  // Assign 1-based sequential displayOrder
  const updatedList = reorderedProducts.map((p, idx) => {
    const newPosition = idx + 1;
    const raw = Array.isArray(p._rawFeatures)
      ? [...p._rawFeatures]
      : (Array.isArray(p.features) ? [...p.features] : []);

    const newFeatures = raw.filter(
      (f) => typeof f !== 'string' || !f.startsWith('__order__:')
    );
    newFeatures.push(`__order__:${newPosition}`);

    return {
      ...p,
      displayOrder: newPosition,
      _rawFeatures: newFeatures
    };
  });

  // Immediately update local caches for zero latency
  const sorted = sortProductsByDisplayOrder(updatedList);
  memoryCache = { products: sorted, timestamp: Date.now() };
  setSessionCache(sorted);

  if (!supabase || !isSupabaseConfigured) {
    return sorted;
  }

  // Persist each product's updated features array to Supabase
  try {
    const updatePromises = updatedList.map((p) => {
      const payload = {
        features: p._rawFeatures
      };
      return supabase
        .from('products')
        .update(payload)
        .eq('id', p.id);
    });

    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Failed to update product order in Supabase:', err);
    throw err;
  }

  return sorted;
};

export const deleteProduct = async (id) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  invalidateProductCache();
  return true;
};

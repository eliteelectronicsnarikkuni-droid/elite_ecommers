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

  // Extract __mrp__: and __images__: metadata if stored in features
  const cleanFeatures = [];
  let imagesFromFeatures = [];
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
    features: cleanFeatures,
    createdAt: row.created_at || row.createdAt || null
  };
};

// Multi-Tier High Performance Cache
let memoryCache = null; // { products: [...], timestamp: number }
let inflightPromise = null; // In-flight request deduplication
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes fresh cache

const getSessionCache = () => {
  try {
    const raw = sessionStorage.getItem('elite_products_cache');
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
    sessionStorage.setItem('elite_products_cache', JSON.stringify({
      products,
      timestamp: Date.now()
    }));
  } catch {}
};

export const invalidateProductCache = () => {
  memoryCache = null;
  inflightPromise = null;
  try {
    sessionStorage.removeItem('elite_products_cache');
  } catch {}
};

export const getCachedProducts = () => {
  if (memoryCache && Array.isArray(memoryCache.products) && memoryCache.products.length > 0) {
    return memoryCache.products;
  }
  const sessionCache = getSessionCache();
  if (sessionCache && Array.isArray(sessionCache.products) && sessionCache.products.length > 0) {
    memoryCache = sessionCache;
    return sessionCache.products;
  }
  return null;
};

export const getProducts = async ({ forceRefresh = false } = {}) => {
  // If not forcing refresh, return instant cache if available and non-empty
  if (!forceRefresh) {
    if (memoryCache && Array.isArray(memoryCache.products) && memoryCache.products.length > 0 && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
      return {
        products: memoryCache.products,
        source: 'memory_cache'
      };
    }

    const sessionCache = getSessionCache();
    if (sessionCache && Array.isArray(sessionCache.products) && sessionCache.products.length > 0) {
      memoryCache = sessionCache;
      return {
        products: sessionCache.products,
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
          return { products: memoryCache.products, source: 'stale_cache' };
        }
        return {
          products: [],
          source: 'error',
          error: error.message
        };
      }

      const normalized = (data || []).map(normalizeProduct);
      if (normalized.length > 0) {
        memoryCache = { products: normalized, timestamp: Date.now() };
        setSessionCache(normalized);
      }

      return {
        products: normalized,
        source: 'supabase'
      };
    } catch (err) {
      console.warn('Network or cold-start issue fetching products:', err.message);
      if (memoryCache?.products?.length) {
        return { products: memoryCache.products, source: 'stale_cache' };
      }
      const sessionCache = getSessionCache();
      if (sessionCache?.products?.length) {
        memoryCache = sessionCache;
        return { products: sessionCache.products, source: 'session_cache' };
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

  // Process up to 5 images for gallery
  const imagesList = Array.isArray(productData.images) && productData.images.length > 0
    ? productData.images.filter(Boolean).slice(0, 5)
    : (productData.imageUrl ? [productData.imageUrl] : []);
  const primaryImage = imagesList[0] || productData.imageUrl || '';

  // Embed __mrp__: and __images__: metadata into features list so data is permanently saved
  const featuresList = [...(productData.features || [])];
  if (originalPrice && !isNaN(originalPrice) && originalPrice > 0) {
    featuresList.push(`__mrp__:${originalPrice}`);
  }
  if (imagesList.length > 0) {
    featuresList.push(`__images__:${JSON.stringify(imagesList)}`);
  }

  const newProduct = {
    name: productData.name,
    price: offerPrice,
    description: productData.description || '',
    category: productData.category || 'General',
    image_url: primaryImage,
    features: featuresList
  };

  if (originalPrice !== null && !isNaN(originalPrice)) {
    newProduct.original_price = originalPrice;
  }

  let { data, error } = await supabase
    .from('products')
    .insert([newProduct])
    .select()
    .single();

  // If column original_price doesn't exist yet (PostgreSQL error 42703), retry without original_price field
  // The __mrp__: in features ensures the original price is safely preserved!
  if (error && (error.code === '42703' || error.message?.includes('original_price'))) {
    console.warn('Column original_price does not exist yet. Retrying product insert with features-embedded MRP...');
    delete newProduct.original_price;
    const retryRes = await supabase
      .from('products')
      .insert([newProduct])
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

export const updateProduct = async (id, productData) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const offerPrice = Number(productData.price || productData.offerPrice) || 0;
  const originalPrice = productData.originalPrice ? Number(productData.originalPrice) : null;

  // Process up to 5 images for gallery
  const imagesList = Array.isArray(productData.images) && productData.images.length > 0
    ? productData.images.filter(Boolean).slice(0, 5)
    : (productData.imageUrl ? [productData.imageUrl] : []);
  const primaryImage = imagesList[0] || productData.imageUrl || '';

  // Embed __mrp__: and __images__: metadata into features list so original data is permanently saved
  const featuresList = [...(productData.features || [])];
  if (originalPrice && !isNaN(originalPrice) && originalPrice > 0) {
    featuresList.push(`__mrp__:${originalPrice}`);
  }
  if (imagesList.length > 0) {
    featuresList.push(`__images__:${JSON.stringify(imagesList)}`);
  }

  const updatedProduct = {
    name: productData.name,
    price: offerPrice,
    description: productData.description || '',
    category: productData.category || 'General',
    image_url: primaryImage,
    features: featuresList
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

  // If column original_price doesn't exist yet (PostgreSQL error 42703), retry update without original_price field
  if (error && (error.code === '42703' || error.message?.includes('original_price'))) {
    console.warn('Column original_price does not exist yet. Retrying product update with features-embedded MRP...');
    delete updatedProduct.original_price;
    const retryRes = await supabase
      .from('products')
      .update(updatedProduct)
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

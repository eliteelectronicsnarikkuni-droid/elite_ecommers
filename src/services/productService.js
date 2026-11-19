import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as fallbackProducts } from '../data/products';

const normalizeProduct = (row) => {
  if (!row) return null;

  let features = [];
  if (Array.isArray(row.features)) {
    features = row.features;
  } else if (typeof row.features === 'string') {
    try {
      features = JSON.parse(row.features);
    } catch {
      features = row.features.split(',').map((f) => f.trim());
    }
  }

  return {
    id: String(row.id),
    name: row.name || '',
    price: Number(row.price) || 0,
    description: row.description || '',
    category: row.category || 'General',
    imageUrl: row.image_url || row.imageUrl || '',
    features: features
  };
};

export const getProducts = async () => {
  if (!isSupabaseConfigured) {
    return {
      products: fallbackProducts,
      source: 'local'
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching products from Supabase:', error.message);
      return {
        products: fallbackProducts,
        source: 'local_fallback',
        error: error.message
      };
    }

    return {
      products: (data || []).map(normalizeProduct),
      source: 'supabase'
    };
  } catch (err) {
    console.error('Unexpected error fetching products:', err);
    return {
      products: fallbackProducts,
      source: 'local_fallback',
      error: err.message
    };
  }
};

export const getProductById = async (id) => {
  if (!isSupabaseConfigured) {
    const local = fallbackProducts.find((p) => String(p.id) === String(id));
    return {
      product: local || null,
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
      const local = fallbackProducts.find((p) => String(p.id) === String(id));
      return {
        product: local || null,
        source: 'local_fallback',
        error: error.message
      };
    }

    if (!data) {
      // Check fallback data just in case
      const local = fallbackProducts.find((p) => String(p.id) === String(id));
      return {
        product: local || null,
        source: local ? 'local_fallback' : 'supabase'
      };
    }

    return {
      product: normalizeProduct(data),
      source: 'supabase'
    };
  } catch (err) {
    console.error('Unexpected error fetching product:', err);
    const local = fallbackProducts.find((p) => String(p.id) === String(id));
    return {
      product: local || null,
      source: 'local_fallback',
      error: err.message
    };
  }
};

export const uploadProductImage = async (file) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
};

export const createProduct = async (productData) => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const newProduct = {
    name: productData.name,
    price: Number(productData.price),
    description: productData.description || '',
    category: productData.category || 'General',
    image_url: productData.imageUrl || '',
    features: productData.features || []
  };

  const { data, error } = await supabase
    .from('products')
    .insert([newProduct])
    .select()
    .single();

  if (error) {
    throw error;
  }

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

  return true;
};

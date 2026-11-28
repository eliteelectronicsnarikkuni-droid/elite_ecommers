import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage, formatFileSize } from '../utils/imageCompressor';

const BANNER_STORAGE_KEY = 'elite_store_banners_v1';
const SYSTEM_BANNERS_RECORD_ID = '__site_banners__';

// Default initial banner for fresh stores
const DEFAULT_BANNERS = [
  {
    id: 'default_banner_1',
    title: '',
    subtitle: '',
    imageUrl: '/banner-portrait.jpg',
    landscapeUrl: '/banner-landscape.jpg',
    link: '#products-catalog',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

let memoryBannerCache = null;

/**
 * Synchronous local read for instant 0ms render without layout shifts
 */
export const getCachedBanners = () => {
  if (memoryBannerCache && Array.isArray(memoryBannerCache)) {
    return memoryBannerCache;
  }
  try {
    const raw = localStorage.getItem(BANNER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Upgrade legacy default banner if present
        const upgraded = parsed.map(b => {
          if (b.id === 'default_banner_1') {
            return {
              ...b,
              title: '',
              subtitle: '',
              imageUrl: '/banner-portrait.jpg',
              landscapeUrl: '/banner-landscape.jpg',
              link: '#products-catalog'
            };
          }
          return b;
        });
        memoryBannerCache = upgraded;
        return upgraded;
      }
    }
  } catch (e) {
    console.warn('Error reading cached banners:', e);
  }
  return DEFAULT_BANNERS;
};

/**
 * Fetch banners from Supabase Cloud (with fallback to localStorage/defaults)
 */
export const getBanners = async () => {
  // 1. Try Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      // 1a. Try dedicated `banners` table first if user created one
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map((b) => {
            let img = b.image_url || b.imageUrl || '';
            let landscapeImg = b.landscape_url || b.landscapeUrl || '/banner-landscape.jpg';
            let title = b.title || '';
            let subtitle = b.subtitle || '';
            let link = b.link || '#products-catalog';
            if (b.id === 'default_banner_1') {
              img = '/banner-portrait.jpg';
              landscapeImg = '/banner-landscape.jpg';
              title = '';
              subtitle = '';
            }
            return {
              id: b.id || `banner_${Date.now()}`,
              title,
              subtitle,
              imageUrl: img,
              landscapeUrl: landscapeImg,
              link,
              isActive: b.is_active !== undefined ? Boolean(b.is_active) : (b.isActive !== undefined ? Boolean(b.isActive) : true),
              createdAt: b.created_at || new Date().toISOString()
            };
          });
          memoryBannerCache = formatted;
          try {
            localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(formatted));
          } catch {}
          return { banners: formatted, source: 'supabase_banners_table' };
        }
      } catch {
        // Table doesn't exist, proceed to 1b
      }

      // 1b. Fallback to `products` table system record '__site_banners__' (requires NO extra schema!)
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('id', SYSTEM_BANNERS_RECORD_ID)
        .maybeSingle();

      if (!prodError && prodData && prodData.description) {
        try {
          let parsed = JSON.parse(prodData.description);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed = parsed.map(b => {
              if (b.id === 'default_banner_1') {
                return {
                  ...b,
                  title: '',
                  subtitle: '',
                  imageUrl: '/banner-portrait.jpg',
                  landscapeUrl: '/banner-landscape.jpg',
                  link: '#products-catalog'
                };
              }
              return b;
            });
            memoryBannerCache = parsed;
            try {
              localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(parsed));
            } catch {}
            return { banners: parsed, source: 'supabase_system_record' };
          }
        } catch (e) {
          console.warn('Failed parsing banners from system record:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch banners from Supabase:', err);
    }
  }

  // 2. Return cached or defaults
  const cached = getCachedBanners();
  return { banners: cached, source: 'local' };
};

/**
 * Save full list of banners to Supabase & localStorage
 */
export const saveBanners = async (bannersList) => {
  if (!Array.isArray(bannersList)) {
    throw new Error('Invalid banners list provided');
  }

  // Update memory & local cache immediately
  memoryBannerCache = [...bannersList];
  try {
    localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(bannersList));
  } catch (e) {
    console.warn('Error saving banners to localStorage:', e);
  }

  // Persist to Supabase Cloud
  if (isSupabaseConfigured && supabase) {
    let savedInTable = false;

    // Try `banners` table if it exists
    try {
      const { error } = await supabase
        .from('banners')
        .upsert(
          bannersList.map((b) => ({
            id: String(b.id),
            title: b.title || '',
            subtitle: b.subtitle || '',
            image_url: b.imageUrl || '',
            link: b.link || '',
            is_active: b.isActive !== false,
            created_at: b.createdAt || new Date().toISOString()
          }))
        );
      if (!error) {
        savedInTable = true;
      }
    } catch {
      savedInTable = false;
    }

    // Always keep system record in `products` in sync so data is bulletproof
    try {
      const primaryBannerImg = bannersList.find((b) => b.isActive !== false)?.imageUrl || bannersList[0]?.imageUrl || '';
      await supabase.from('products').upsert({
        id: SYSTEM_BANNERS_RECORD_ID,
        name: '__SITE_BANNERS__',
        price: 0,
        category: '__system__',
        image_url: primaryBannerImg,
        description: JSON.stringify(bannersList),
        features: ['__hidden__:true', '__system__:banners']
      });
    } catch (err) {
      console.warn('Error upserting system banner record in products:', err);
      if (!savedInTable) {
        // If both failed, rethrow error
        throw err;
      }
    }
  }

  return { success: true, banners: bannersList };
};

/**
 * Upload banner image with Smart HD WebP compression
 * - Automatically resizes oversized graphics to optimal banner dimensions (1920x960 max)
 * - Compresses to modern WebP with 85% quality
 * - Returns public URL and compression stats
 */
export const uploadBannerImage = async (file) => {
  if (!file) throw new Error('No image file provided');

  // 1. Perform high-performance client-side WebP compression preserving natural aspect ratio
  const compressionResult = await compressImage(file, {
    maxWidth: 2560,
    maxHeight: 1440,
    quality: 0.88
  });

  const fileToUpload = compressionResult.compressedFile || file;

  // 2. Upload to Supabase Storage bucket 'product-images' under 'banners/'
  if (isSupabaseConfigured && supabase) {
    const fileExt = fileToUpload.name.split('.').pop() || 'webp';
    const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, fileToUpload, {
        cacheControl: '31536000',
        upsert: false,
        contentType: fileToUpload.type || 'image/webp'
      });

    if (error) {
      console.warn('Supabase storage banner upload failed, trying base64 fallback:', error.message);
    } else {
      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        return {
          url: publicData.publicUrl,
          compressionResult: {
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            savedPercent: compressionResult.savedPercent,
            originalFormatted: formatFileSize(compressionResult.originalSize),
            compressedFormatted: formatFileSize(compressionResult.compressedSize)
          }
        };
      }
    }
  }

  // 3. Fallback to Data URL if storage bucket is unavailable
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result,
        compressionResult: {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          savedPercent: compressionResult.savedPercent,
          originalFormatted: formatFileSize(compressionResult.originalSize),
          compressedFormatted: formatFileSize(compressionResult.compressedSize)
        }
      });
    };
    reader.readAsDataURL(fileToUpload);
  });
};

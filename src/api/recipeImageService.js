const UNSPLASH_BASE_URL = 'https://source.unsplash.com/featured/?';

const isBrowser = () => typeof window !== 'undefined' && typeof window.document !== 'undefined';

const buildAbsoluteUrl = (imageUrl, sourceUrl) => {
  if (!imageUrl) return null;
  try {
    return new URL(imageUrl, sourceUrl).href;
  } catch (error) {
    return null;
  }
};

const extractMetaContent = (document, selectors) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.content) {
      return element.content.trim();
    }
  }
  return null;
};

const extractFirstImage = (document) => {
  const img = document.querySelector('img');
  if (img?.src) {
    return img.src.trim();
  }
  return null;
};

const extractImageUrlFromHtml = (html, sourceUrl) => {
  if (!html || !isBrowser()) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const metaImage = extractMetaContent(doc, [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="og:image:secure_url"]',
  ]);

  const candidate = metaImage || extractFirstImage(doc);
  return buildAbsoluteUrl(candidate, sourceUrl);
};

export async function fetchImageFromSourceUrl(sourceUrl) {
  if (!sourceUrl) return null;

  try {
    const response = await fetch(sourceUrl, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch recipe source: ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    return extractImageUrlFromHtml(html, sourceUrl);
  } catch (error) {
    console.warn('Unable to fetch image from source URL:', error.message);
    return null;
  }
}

export function fetchImageFromUnsplash(recipeName) {
  const query = encodeURIComponent(`${recipeName || 'recipe'} food`);
  return `${UNSPLASH_BASE_URL}${query}`;
}

export async function getRecipeImage(recipe) {
  if (!recipe) return null;

  if (recipe.image_url) {
    return recipe.image_url;
  }

  if (recipe.source_url) {
    const scraped = await fetchImageFromSourceUrl(recipe.source_url);
    if (scraped) {
      return scraped;
    }
  }

  return fetchImageFromUnsplash(recipe.name);
}

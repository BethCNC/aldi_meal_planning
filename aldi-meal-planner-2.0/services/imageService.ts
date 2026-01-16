
const API_BASE = '/api/v1/images';

export const fetchStockImage = async (query: string): Promise<string | null> => {
  try {
    // Get the current session token (assuming Supabase is used and token is in localStorage or handled via auth provider)
    // For now, we'll try without token if the backend requires it, we'll need to pass it.
    // The backend uses verifyAuth middleware.
    
    // We need to retrieve the token.
    // Assuming standard Supabase auth storage key or helper.
    // Since we don't have direct access to the auth context here, we might need to pass it.
    // But for simplicity in this service, let's try to get it from local storage if possible 
    // or rely on a global supabase client if one exists.
    
    // Quick fix: attempt to read from typical supabase storage key
    const storageKey = Object.keys(localStorage).find(key => key.includes('auth.token'));
    let token = '';
    if (storageKey) {
        const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
        token = session.access_token;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/stock?query=${encodeURIComponent(query)}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch stock image');
    const data = await res.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error fetching stock image:', error);
    return null;
  }
};

export const generateRecipeImage = async (prompt: string): Promise<string | null> => {
  try {
    const storageKey = Object.keys(localStorage).find(key => key.includes('auth.token'));
    let token = '';
    if (storageKey) {
        const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
        token = session.access_token;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Failed to generate image');
    const data = await res.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
};

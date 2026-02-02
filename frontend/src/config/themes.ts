/**
 * Post Theme Configuration
 * 
 * Defines available themes for expressive posts (Facebook/Teams-style backgrounds).
 * Each theme includes gradient backgrounds and text colors for both
 * Poster mode (full background) and Banner mode (header only).
 */

export interface PostTheme {
  id: string;
  name: string;
  // CSS gradient for the background
  gradient: string;
  // Text color for content on this background
  textColor: string;
  // Optional: secondary text color for subtitles/metadata
  secondaryTextColor?: string;
  // Preview swatch color (solid color for the selector)
  swatchColor: string;
  // Optional: border color for light themes
  borderColor?: string;
}

// Maximum character length for poster mode (full background)
// Posts longer than this will use banner mode
export const POSTER_MODE_MAX_LENGTH = 280;

// Available themes
export const POST_THEMES: PostTheme[] = [
  {
    id: 'none',
    name: 'None',
    gradient: 'transparent',
    textColor: 'var(--text-primary)',
    swatchColor: '#ffffff',
    borderColor: 'var(--border-color)',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#667eea',
  },
  {
    id: 'sunset-vibes',
    name: 'Sunset Vibes',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#f093fb',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    textColor: '#1a1a2e',
    secondaryTextColor: 'rgba(26, 26, 46, 0.75)',
    swatchColor: '#f6d365',
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#11998e',
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    textColor: '#1a1a2e',
    secondaryTextColor: 'rgba(26, 26, 46, 0.75)',
    swatchColor: '#ff6b6b',
  },
  {
    id: 'deep-purple',
    name: 'Deep Purple',
    gradient: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#5f2c82',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.75)',
    swatchColor: '#232526',
  },
  {
    id: 'teams-teal',
    name: 'Teams Teal',
    gradient: 'linear-gradient(135deg, #6264a7 0%, #464775 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#6264a7',
  },
  {
    id: 'nu-gold',
    name: 'NU Gold',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
    textColor: '#1a1a2e',
    secondaryTextColor: 'rgba(26, 26, 46, 0.75)',
    swatchColor: '#ffc107',
  },
  {
    id: 'nu-blue',
    name: 'NU Blue',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #0f2847 100%)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    swatchColor: '#1e40af',
  },
];

/**
 * Get a theme by its ID
 */
export const getThemeById = (themeId: string | undefined): PostTheme => {
  if (!themeId || themeId === 'none') {
    return POST_THEMES[0]; // Return 'none' theme
  }
  return POST_THEMES.find(t => t.id === themeId) || POST_THEMES[0];
};

/**
 * Determine if a post should render in Poster mode (full background)
 * or Banner mode (header only with gradient)
 * 
 * Poster mode: Short text, no attachments
 * Banner mode: Long text or has attachments
 */
export type PostDisplayMode = 'poster' | 'banner' | 'normal';

export const getPostDisplayMode = (
  theme: string | undefined,
  descriptionLength: number,
  hasAttachments: boolean
): PostDisplayMode => {
  // No theme selected = normal display
  if (!theme || theme === 'none') {
    return 'normal';
  }

  // Has attachments = banner mode (Teams style)
  if (hasAttachments) {
    return 'banner';
  }

  // Short text = poster mode (Facebook style)
  if (descriptionLength <= POSTER_MODE_MAX_LENGTH) {
    return 'poster';
  }

  // Long text without attachments = banner mode
  return 'banner';
};

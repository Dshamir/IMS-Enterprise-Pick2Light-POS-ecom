// ============================================
// WAREHOUSE COMMAND CENTER - THEME FILE
// ============================================
// Complete design system for the AI-powered warehouse management interface

export const theme = {
  // ============================================
  // COLOR PALETTE
  // ============================================
  colors: {
    // Primary Brand Colors
    primary: {
      purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',  // Main purple
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },
      pink: {
        50: '#fdf2f8',
        100: '#fce7f3',
        200: '#fbcfe8',
        300: '#f9a8d4',
        400: '#f472b6',
        500: '#ec4899',
        600: '#db2777',  // Main pink
        700: '#be185d',
        800: '#9f1239',
        900: '#831843',
      },
      blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',  // Main blue
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      }
    },

    // Functional Colors
    status: {
      success: '#10b981',      // Green
      warning: '#f59e0b',      // Yellow/Orange
      error: '#ef4444',        // Red
      info: '#3b82f6',         // Blue
      neutral: '#6b7280',      // Gray
    },

    // Component-Specific Colors
    rfid: {
      scanner: '#10b981',      // Green for active scanners
      scannerGlow: 'rgba(16, 185, 129, 0.5)',
      tagActive: '#3b82f6',    // Blue for active tags
      tagInactive: '#6b7280',  // Gray for inactive
      unknown: '#f59e0b',      // Yellow for unknown tags
    },

    led: {
      active: '#3b82f6',       // Blue
      picked: '#10b981',       // Green
      error: '#ef4444',        // Red
      warning: '#f59e0b',      // Yellow
      pulse: '#8b5cf6',        // Purple
    },

    zones: {
      zoneA: '#3b82f6',        // Blue
      zoneB: '#8b5cf6',        // Purple
      zoneC: '#f59e0b',        // Orange
      zoneD: '#14b8a6',        // Teal
    },

    // Product Categories
    products: {
      resistors: '#ef4444',    // Red
      capacitors: '#3b82f6',   // Blue
      leds: '#8b5cf6',         // Purple
      transistors: '#10b981',  // Green
      ics: '#f59e0b',          // Orange
      diodes: '#ec4899',       // Pink
      potentiometers: '#14b8a6', // Teal
    },

    // Background & Surface Colors
    background: {
      primary: '#111827',      // Dark gray
      secondary: '#1f2937',    // Slightly lighter
      tertiary: '#374151',     // Even lighter
      overlay: 'rgba(0, 0, 0, 0.7)',
      blur: 'rgba(17, 24, 39, 0.95)',
    },

    // Text Colors
    text: {
      primary: '#ffffff',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      disabled: '#6b7280',
    },

    // Border Colors
    border: {
      default: '#374151',
      focus: '#9333ea',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },

    // Gradient Definitions
    gradients: {
      primary: 'linear-gradient(135deg, #9333ea 0%, #db2777 100%)',
      secondary: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      background: 'linear-gradient(135deg, #111827 0%, #581c87 50%, #111827 100%)',
      card: 'linear-gradient(135deg, rgba(31, 41, 55, 0.5) 0%, rgba(17, 24, 39, 0.3) 100%)',
    }
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
    },

    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    }
  },

  // ============================================
  // SPACING
  // ============================================
  spacing: {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    
    // Colored shadows
    purple: '0 10px 40px rgba(147, 51, 234, 0.5)',
    pink: '0 10px 40px rgba(219, 39, 119, 0.5)',
    blue: '0 10px 40px rgba(59, 130, 246, 0.5)',
    green: '0 10px 40px rgba(16, 185, 129, 0.5)',
    red: '0 10px 40px rgba(239, 68, 68, 0.5)',
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    full: '9999px',
  },

  // ============================================
  // ANIMATIONS
  // ============================================
  animations: {
    duration: {
      fast: '150ms',
      base: '300ms',
      slow: '500ms',
    },

    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },

    keyframes: {
      // Pulse animation for scanners/LEDs
      pulse: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `,

      // Spin for loading indicators
      spin: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `,

      // Ping for scanner waves
      ping: `
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `,

      // Bounce for alerts
      bounce: `
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `,

      // Slide in from right (notifications)
      slideInRight: `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `,

      // Slide up (modals)
      slideUp: `
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `,

      // Fade in
      fadeIn: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,

      // Scanner beam (vertical)
      scanBeam: `
        @keyframes scanBeam {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `,

      // Glow effect
      glow: `
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px currentColor;
          }
          50% {
            box-shadow: 0 0 40px currentColor, 0 0 60px currentColor;
          }
        }
      `,
    }
  },

  // ============================================
  // COMPONENT STYLES
  // ============================================
  components: {
    // Button variants
    button: {
      primary: {
        background: 'linear-gradient(135deg, #9333ea 0%, #db2777 100%)',
        hover: 'linear-gradient(135deg, #7e22ce 0%, #be185d 100%)',
        text: '#ffffff',
        shadow: '0 10px 40px rgba(147, 51, 234, 0.5)',
      },
      secondary: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        hover: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        text: '#ffffff',
        shadow: '0 10px 40px rgba(59, 130, 246, 0.5)',
      },
      success: {
        background: '#10b981',
        hover: '#059669',
        text: '#ffffff',
        shadow: '0 10px 40px rgba(16, 185, 129, 0.5)',
      },
      warning: {
        background: '#f59e0b',
        hover: '#d97706',
        text: '#ffffff',
        shadow: '0 10px 40px rgba(245, 158, 11, 0.5)',
      },
      danger: {
        background: '#ef4444',
        hover: '#dc2626',
        text: '#ffffff',
        shadow: '0 10px 40px rgba(239, 68, 68, 0.5)',
      },
      ghost: {
        background: 'transparent',
        hover: 'rgba(147, 51, 234, 0.1)',
        text: '#a855f7',
        border: '#9333ea',
      }
    },

    // Card styles
    card: {
      default: {
        background: 'rgba(31, 41, 55, 0.5)',
        border: '#374151',
        backdropBlur: '12px',
      },
      elevated: {
        background: 'rgba(17, 24, 39, 0.8)',
        border: '#9333ea',
        shadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        backdropBlur: '16px',
      },
      active: {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
        border: '#3b82f6',
        shadow: '0 0 40px rgba(59, 130, 246, 0.5)',
      }
    },

    // Badge styles
    badge: {
      success: {
        background: '#10b981',
        text: '#ffffff',
      },
      warning: {
        background: '#f59e0b',
        text: '#ffffff',
      },
      error: {
        background: '#ef4444',
        text: '#ffffff',
      },
      info: {
        background: '#3b82f6',
        text: '#ffffff',
      },
      neutral: {
        background: '#6b7280',
        text: '#ffffff',
      }
    },

    // LED states
    led: {
      off: {
        background: 'rgba(107, 114, 128, 0.3)',
        border: '#374151',
      },
      active: {
        background: '#3b82f6',
        border: '#2563eb',
        glow: '0 0 30px #3b82f6, 0 0 60px rgba(59, 130, 246, 0.8)',
      },
      success: {
        background: '#10b981',
        border: '#059669',
        glow: '0 0 30px #10b981, 0 0 60px rgba(16, 185, 129, 0.8)',
      },
      warning: {
        background: '#f59e0b',
        border: '#d97706',
        glow: '0 0 30px #f59e0b, 0 0 60px rgba(245, 158, 11, 0.8)',
      },
      error: {
        background: '#ef4444',
        border: '#dc2626',
        glow: '0 0 30px #ef4444, 0 0 60px rgba(239, 68, 68, 0.8)',
      }
    },

    // Scanner states
    scanner: {
      active: {
        background: '#10b981',
        border: '#059669',
        glow: '0 0 20px rgba(16, 185, 129, 0.8)',
        wave: 'rgba(16, 185, 129, 0.2)',
      },
      inactive: {
        background: '#6b7280',
        border: '#4b5563',
        glow: 'none',
      }
    }
  },

  // ============================================
  // BREAKPOINTS
  // ============================================
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
  },

  // ============================================
  // Z-INDEX LAYERS
  // ============================================
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transitions: {
    default: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get color with opacity
export const withOpacity = (color, opacity) => {
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Generate box shadow with color
export const coloredShadow = (color, intensity = 0.5) => {
  return `0 10px 40px ${withOpacity(color, intensity)}`;
};

// Generate glow effect
export const glowEffect = (color, size = 40) => {
  return `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${withOpacity(color, 0.8)}`;
};

// Export default
export default theme;
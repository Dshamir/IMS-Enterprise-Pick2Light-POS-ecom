// ============================================
// THEME USAGE GUIDE
// ============================================
// How to use the warehouse theme in your React components

import React from 'react';
import theme, { withOpacity, coloredShadow, glowEffect } from './theme';

// ============================================
// METHOD 1: Direct theme object usage
// ============================================

const ExampleButton = () => {
  return (
    <button
      style={{
        background: theme.components.button.primary.background,
        color: theme.components.button.primary.text,
        padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
        borderRadius: theme.borderRadius.lg,
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.bold,
        boxShadow: theme.components.button.primary.shadow,
        transition: theme.transitions.default,
      }}
    >
      Primary Button
    </button>
  );
};

// ============================================
// METHOD 2: Create reusable styled components
// ============================================

// Button component with variants
export const Button = ({ variant = 'primary', children, ...props }) => {
  const styles = theme.components.button[variant];
  
  return (
    <button
      style={{
        background: styles.background,
        color: styles.text,
        padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
        borderRadius: theme.borderRadius.lg,
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.bold,
        boxShadow: styles.shadow,
        transition: theme.transitions.default,
        border: styles.border ? `2px solid ${styles.border}` : 'none',
        cursor: 'pointer',
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// Usage:
// <Button variant="primary">Primary</Button>
// <Button variant="success">Success</Button>
// <Button variant="warning">Warning</Button>

// ============================================
// Card component
// ============================================

export const Card = ({ variant = 'default', children, ...props }) => {
  const styles = theme.components.card[variant];
  
  return (
    <div
      style={{
        background: styles.background,
        border: `2px solid ${styles.border}`,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        backdropFilter: `blur(${styles.backdropBlur})`,
        boxShadow: styles.shadow,
        transition: theme.transitions.default,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Usage:
// <Card variant="default">Default card</Card>
// <Card variant="elevated">Elevated card</Card>
// <Card variant="active">Active card</Card>

// ============================================
// Badge component
// ============================================

export const Badge = ({ status = 'info', children }) => {
  const styles = theme.components.badge[status];
  
  return (
    <span
      style={{
        display: 'inline-block',
        background: styles.background,
        color: styles.text,
        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
        borderRadius: theme.borderRadius.full,
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.bold,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
};

// Usage:
// <Badge status="success">Success</Badge>
// <Badge status="warning">Warning</Badge>
// <Badge status="error">Error</Badge>

// ============================================
// LED Indicator component
// ============================================

export const LEDIndicator = ({ state = 'off', size = 16 }) => {
  const styles = theme.components.led[state];
  
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: theme.borderRadius.full,
        background: styles.background,
        border: `2px solid ${styles.border}`,
        boxShadow: state !== 'off' ? styles.glow : 'none',
        animation: state === 'active' ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
};

// Usage:
// <LEDIndicator state="off" />
// <LEDIndicator state="active" size={24} />
// <LEDIndicator state="success" />
// <LEDIndicator state="warning" />

// ============================================
// Scanner Indicator component
// ============================================

export const ScannerIndicator = ({ active = true }) => {
  const styles = theme.components.scanner[active ? 'active' : 'inactive'];
  
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: theme.borderRadius.full,
          background: styles.background,
          border: `2px solid ${styles.border}`,
          boxShadow: styles.glow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: active ? 'pulse 2s infinite' : 'none',
        }}
      >
        📡
      </div>
      
      {active && (
        <>
          {/* Scanner waves */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80px',
              height: '80px',
              borderRadius: theme.borderRadius.full,
              border: `2px solid ${theme.components.scanner.active.wave}`,
              animation: 'ping 2s infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              borderRadius: theme.borderRadius.full,
              border: `2px solid ${theme.components.scanner.active.wave}`,
              animation: 'ping 2s infinite 0.5s',
            }}
          />
        </>
      )}
    </div>
  );
};

// ============================================
// Notification component
// ============================================

export const Notification = ({ type = 'info', message, onClose }) => {
  const getBgColor = () => {
    switch (type) {
      case 'success': return withOpacity(theme.colors.status.success, 0.9);
      case 'warning': return withOpacity(theme.colors.status.warning, 0.9);
      case 'error': return withOpacity(theme.colors.status.error, 0.9);
      default: return withOpacity(theme.colors.status.info, 0.9);
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return theme.colors.status.success;
      case 'warning': return theme.colors.status.warning;
      case 'error': return theme.colors.status.error;
      default: return theme.colors.status.info;
    }
  };

  return (
    <div
      style={{
        background: getBgColor(),
        border: `2px solid ${getBorderColor()}`,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[4],
        boxShadow: theme.shadows['2xl'],
        animation: 'slideInRight 0.3s ease-out',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
        <span style={{ fontSize: theme.typography.fontSize.lg }}>
          {type === 'success' && '✓'}
          {type === 'warning' && '⚠️'}
          {type === 'error' && '✗'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span style={{ fontWeight: theme.typography.fontWeight.bold }}>{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: theme.colors.text.primary,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// Modal component with backdrop
// ============================================

export const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: theme.zIndex.modalBackdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.colors.background.overlay,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.colors.background.blur,
          border: `2px solid ${theme.colors.primary.purple[600]}`,
          borderRadius: theme.borderRadius['2xl'],
          padding: theme.spacing[8],
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadows.purple,
          animation: 'slideUp 0.3s ease-out',
          zIndex: theme.zIndex.modal,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================
// Gradient Text component
// ============================================

export const GradientText = ({ children, gradient = 'primary' }) => {
  return (
    <span
      style={{
        background: theme.colors.gradients[gradient],
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: theme.typography.fontWeight.bold,
      }}
    >
      {children}
    </span>
  );
};

// Usage:
// <GradientText>Hello World</GradientText>
// <GradientText gradient="secondary">Secondary Gradient</GradientText>

// ============================================
// CSS-in-JS Global Styles
// ============================================

export const GlobalStyles = () => {
  const styles = `
    ${theme.animations.keyframes.pulse}
    ${theme.animations.keyframes.spin}
    ${theme.animations.keyframes.ping}
    ${theme.animations.keyframes.bounce}
    ${theme.animations.keyframes.slideInRight}
    ${theme.animations.keyframes.slideUp}
    ${theme.animations.keyframes.fadeIn}
    ${theme.animations.keyframes.scanBeam}
    ${theme.animations.keyframes.glow}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${theme.typography.fontFamily.sans};
      background: ${theme.colors.gradients.background};
      color: ${theme.colors.text.primary};
      line-height: ${theme.typography.lineHeight.normal};
    }

    button {
      font-family: inherit;
    }
  `;

  return <style>{styles}</style>;
};

// ============================================
// EXAMPLE: Complete Component using Theme
// ============================================

export const WarehouseCard = ({ zone, items, active = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: active 
          ? theme.components.card.active.background
          : theme.components.card.default.background,
        border: `2px solid ${active ? theme.components.card.active.border : theme.components.card.default.border}`,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        boxShadow: active ? theme.components.card.active.shadow : theme.shadows.lg,
        backdropFilter: `blur(${theme.components.card.default.backdropBlur})`,
        transition: theme.transitions.default,
        cursor: 'pointer',
        transform: active ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <div style={{
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing[3],
      }}>
        Zone {zone}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginBottom: theme.spacing[4],
      }}>
        <LEDIndicator state={active ? 'active' : 'off'} />
        <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary }}>
          {items} items
        </span>
      </div>

      <div style={{
        background: theme.colors.zones[`zone${zone}`],
        height: '4px',
        borderRadius: theme.borderRadius.full,
        width: '100%',
      }} />
    </div>
  );
};

// ============================================
// UTILITY: Create inline styles from theme
// ============================================

export const createStyles = {
  // Text styles
  text: {
    h1: {
      fontSize: theme.typography.fontSize['4xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.tight,
    },
    h2: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.tight,
    },
    h3: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.tight,
    },
    body: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.lineHeight.normal,
    },
    small: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.lineHeight.normal,
    }
  },

  // Flex layouts
  flex: {
    row: {
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing[4],
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[4],
    },
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }
  }
};

// Usage:
// <div style={createStyles.flex.between}>
//   <h1 style={createStyles.text.h1}>Title</h1>
//   <Button>Action</Button>
// </div>

export default theme;
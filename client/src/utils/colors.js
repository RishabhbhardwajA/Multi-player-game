export const PLAYER_COLORS = [
  '#6C5CE7', '#A29BFE', '#00CEC9', '#81ECEC', '#E17055',
  '#FAB1A0', '#FDCB6E', '#55EFC4', '#00B894', '#E84393',
  '#FD79A8', '#0984E3', '#74B9FF', '#D63031', '#FF7675',
  '#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C',
  '#2ECC71', '#E67E22', '#F1C40F', '#16A085', '#8E44AD',
  '#2980B9', '#27AE60', '#D35400', '#C0392B', '#7F8C8D',
];

export const hexToRgba = (hex, opacity = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const darkenColor = (hex, percent) => {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(2.55 * percent));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(2.55 * percent));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(2.55 * percent));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const lightenColor = (hex, percent) => {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(2.55 * percent));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(2.55 * percent));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(2.55 * percent));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

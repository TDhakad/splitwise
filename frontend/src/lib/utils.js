const AVATAR_COLORS = [
  'bg-[#007A64] text-white',
  'bg-[#4B5563] text-white',
  'bg-[#EF4444] text-white',
  'bg-[#F59E0B] text-white',
  'bg-[#3B82F6] text-white',
];

export const avatarColor = (id) => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
export const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

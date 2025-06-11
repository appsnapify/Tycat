import React from 'react';

interface HeaderProps {
  userFirstName?: string;
  avatarUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ userFirstName, avatarUrl }) => {
  // Header oculto para dashboard dark moderno - o header está integrado na página
  return null;
};

export default Header; 
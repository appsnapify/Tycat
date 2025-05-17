import React from 'react';

interface HeaderProps {
  userFirstName?: string;
  avatarUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ userFirstName, avatarUrl }) => {
  return (
    <header className="bg-gray-800 text-white p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Snapify Eventos</div>
        <div>
          {userFirstName ? (
            <div className="flex items-center">
              {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full mr-2" />}
              <span>Olá, {userFirstName}</span>
            </div>
          ) : (
            <span>Carregando...</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
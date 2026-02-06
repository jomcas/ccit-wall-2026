import React from 'react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../types';

interface UserRowProps {
  user: UserType;
}

const UserRow: React.FC<UserRowProps> = ({ user }) => {
  const userId = user._id || user.id;

  return (
    <Link to={`/user/${userId}`} className="user-row">
      {user.profilePicture ? (
        <img 
          src={user.profilePicture} 
          alt={user.name} 
          className="user-row-avatar"
        />
      ) : (
        <div className="user-row-avatar-placeholder">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="user-row-info">
        <span className="user-row-name">{user.name}</span>
        <span className="user-row-role">{user.role}</span>
      </div>
    </Link>
  );
};

export default UserRow;

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  bio?: string;
  profilePicture?: string;
  contactInformation?: string;
  createdAt?: Date;
}

export interface Post {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  author: User;
  category: 'college-activities' | 'general' | 'extracurricular';
  isAnonymous: boolean;
  attachments?: string[];
  theme?: string;
  likes: string[];
  reactions: Map<string, string[]>;
  comments: Comment[];
  shares: string[];
  createdAt: Date;
}

export interface Comment {
  _id?: string;
  id?: string;
  content: string;
  author: User;
  post: string;
  likes: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export type NotificationType = 'post_liked' | 'post_commented' | 'comment_liked' | 'post_reaction';

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  type: NotificationType;
  post?: {
    _id: string;
    title: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
  reactionEmoji?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

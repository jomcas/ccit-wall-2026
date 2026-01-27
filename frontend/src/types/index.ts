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
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

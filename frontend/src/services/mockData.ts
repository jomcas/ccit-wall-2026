import { User, Post, Comment, AuthResponse } from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    email: 'juan@nu.edu.ph',
    role: 'student',
    bio: 'Computer Science student passionate about web development',
    profilePicture: 'https://i.pravatar.cc/150?img=1',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Dr. Maria Santos',
    email: 'maria.santos@nu.edu.ph',
    role: 'teacher',
    bio: 'Professor of Information Technology',
    profilePicture: 'https://i.pravatar.cc/150?img=2',
    createdAt: new Date('2023-06-10'),
  },
  {
    id: '3',
    name: 'Pedro Reyes',
    email: 'pedro@nu.edu.ph',
    role: 'student',
    bio: 'IT student and coding enthusiast',
    profilePicture: 'https://i.pravatar.cc/150?img=3',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    name: 'Admin User',
    email: 'admin@nu.edu.ph',
    role: 'admin',
    bio: 'CCIT Administrator',
    profilePicture: 'https://i.pravatar.cc/150?img=4',
    createdAt: new Date('2023-01-01'),
  },
];

// Mock Posts
export const mockPosts: Post[] = [
  {
    _id: '1',
    title: 'Excited to announce our new hackathon!',
    description:
      'CCIT is organizing its annual hackathon next month! All students are welcome to participate. Form teams and showcase your innovative projects. Registration is now open.',
    author: mockUsers[1], // Dr. Maria Santos
    category: 'college-activities',
    isAnonymous: false,
    attachments: [],
    likes: [(mockUsers[0].id || '1'), (mockUsers[2].id || '3')],
    reactions: new Map([
      ['👍', [(mockUsers[0].id || '1')]],
      ['🎉', [(mockUsers[2].id || '3')]],
    ]),
    comments: [],
    shares: [(mockUsers[2].id || '3')],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    _id: '2',
    title: 'Thoughts on the new React 19 features',
    description:
      'Just finished exploring React 19 and I must say, the new compiler and hooks are game-changers! Especially the automatic memoization and the improved error handling. Has anyone else had a chance to try it out?',
    author: mockUsers[0], // Juan Dela Cruz
    category: 'general',
    isAnonymous: false,
    attachments: [],
    likes: [(mockUsers[1].id || '2'), (mockUsers[2].id || '3'), (mockUsers[3].id || '4')],
    reactions: new Map([['🔥', [(mockUsers[1].id || '2'), (mockUsers[2].id || '3')]]]),
    comments: [],
    shares: [],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    _id: '3',
    title: 'Anonymous tip: Library closes at 8 PM',
    description:
      'Just a reminder that the library will be closing early today due to maintenance. Make sure to finish your studies before 8 PM!',
    author: mockUsers[2], // Pedro Reyes
    category: 'general',
    isAnonymous: true,
    attachments: [],
    likes: [(mockUsers[0].id || '1')],
    reactions: new Map(),
    comments: [],
    shares: [(mockUsers[0].id || '1'), (mockUsers[1].id || '2')],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    _id: '4',
    title: 'Basketball tournament finals this weekend!',
    description:
      "Don't miss the CCIT basketball tournament finals! It's happening this Saturday at 2 PM in the gymnasium. Come and support our teams!",
    author: mockUsers[0], // Juan Dela Cruz
    category: 'extracurricular',
    isAnonymous: false,
    attachments: [],
    likes: [(mockUsers[1].id || '2'), (mockUsers[2].id || '3')],
    reactions: new Map([['🏀', [(mockUsers[0].id || '1'), (mockUsers[2].id || '3')]]]),
    comments: [],
    shares: [(mockUsers[1].id || '2')],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    _id: '5',
    title: 'New study group for Data Structures',
    description:
      'Starting a study group for Data Structures and Algorithms. We meet every Tuesday and Thursday at 5 PM in the study lounge. Everyone is welcome!',
    author: mockUsers[2], // Pedro Reyes
    category: 'college-activities',
    isAnonymous: false,
    attachments: [],
    likes: [(mockUsers[0].id || '1')],
    reactions: new Map(),
    comments: [],
    shares: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: '1',
    content: 'This is great! I am definitely registering for the hackathon.',
    author: mockUsers[0], // Juan Dela Cruz
    post: '1',
    likes: [(mockUsers[1].id || '2')],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    content: 'React 19 is indeed impressive. Looking forward to using it in production.',
    author: mockUsers[1], // Dr. Maria Santos
    post: '2',
    likes: [(mockUsers[0].id || '1'), (mockUsers[2].id || '3')],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
];

// Mock auth response
export const mockAuthResponse: AuthResponse = {
  message: 'Login successful',
  token: 'mock_jwt_token_' + Math.random().toString(36).substr(2, 9),
  user: mockUsers[0],
};

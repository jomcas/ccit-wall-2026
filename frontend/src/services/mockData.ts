import type { User, Post, Comment, AuthResponse, Notification } from '../types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Mock Users (NU Manila CCIT)
export const mockUsers: User[] = [
  {
    _id: '1',
    id: '1',
    name: 'Juan Dela Cruz',
    email: 'juan@nu.edu.ph',
    role: 'student',
    bio: '3rd Year BSCS Student. Interested in full-stack TypeScript, UI systems, and hackathons.',
    contactInformation: 'github.com/juandc · Block BSCS-3A',
    profilePicture: '',
    createdAt: new Date('2024-08-15T08:00:00Z'),
  },
  {
    _id: '2',
    id: '2',
    name: 'Dr. Maria Santos',
    email: 'maria.santos@nu.edu.ph',
    role: 'teacher',
    bio: 'Faculty adviser for CCIT Web & Systems Engineering. Office hours Tue/Thu 1:00 PM at Room 405.',
    contactInformation: 'Room 405 · loc. 1234',
    profilePicture: '',
    createdAt: new Date('2023-06-10T08:00:00Z'),
  },
  {
    _id: '3',
    id: '3',
    name: 'Pedro Reyes',
    email: 'pedro@nu.edu.ph',
    role: 'student',
    bio: 'BSIT-2B · Basketball varsity & study group organizer.',
    contactInformation: 'pedro.reyes@nu.edu.ph · Block BSIT-2B',
    profilePicture: '',
    createdAt: new Date('2024-09-01T08:00:00Z'),
  },
  {
    _id: '4',
    id: '4',
    name: 'CCIT Admin',
    email: 'admin@nu.edu.ph',
    role: 'admin',
    bio: 'College of Computing and Information Technologies platform moderator.',
    contactInformation: 'CCIT Dean Office · loc. 1200',
    profilePicture: '',
    createdAt: new Date('2023-01-01T08:00:00Z'),
  },
  {
    _id: '5',
    id: '5',
    name: 'Prof. Ana Lim',
    email: 'ana.lim@nu.edu.ph',
    role: 'teacher',
    bio: 'Instructor for Data Structures, Algorithms, and Competitive Programming.',
    contactInformation: 'Room 408 · Consultation Wed 3:00 PM',
    profilePicture: '',
    createdAt: new Date('2023-08-20T08:00:00Z'),
  },
];

// Mock Comments
export const mockComments: Comment[] = [
  {
    _id: 'c1',
    id: 'c1',
    content: 'Can cross-program teams (BSCS + BSIT) join together?',
    author: mockUsers[0], // Juan Dela Cruz
    post: '1',
    likes: ['2', '3'],
    createdAt: new Date(Date.now() - 1 * HOUR),
  },
  {
    _id: 'c2',
    id: 'c2',
    content: 'Yes, cross-program teams across CCIT are encouraged! Just list each member’s program on the form.',
    author: mockUsers[1], // Dr. Maria Santos
    post: '1',
    likes: ['1', '3', '5'],
    createdAt: new Date(Date.now() - 42 * 60 * 1000),
  },
  {
    _id: 'c3',
    id: 'c3',
    content: 'The gold accent works well on the slate cards. Super readable in the evening labs!',
    author: mockUsers[2], // Pedro Reyes
    post: '2',
    likes: ['1', '2'],
    createdAt: new Date(Date.now() - 3 * HOUR),
  },
  {
    _id: 'c4',
    id: 'c4',
    content: 'Noted Ma’am, thank you for the update!',
    author: mockUsers[0], // Juan Dela Cruz
    post: '4',
    likes: ['5'],
    createdAt: new Date(Date.now() - 20 * HOUR),
  },
];

// Mock Posts
export const mockPosts: Post[] = [
  {
    _id: '1',
    id: '1',
    title: 'CCIT Hackathon 2026: Team Registration & Mechanics',
    description:
      'Registration is now open for all BSCS, BSIT, and BSEMC students. Form teams of 3 to 4 members and submit your project pitch before Friday at 5:00 PM at the CCIT Student Lounge or online portal.',
    author: mockUsers[1], // Dr. Maria Santos
    category: 'college-activities',
    isAnonymous: false,
    isAnnouncement: true,
    attachments: [],
    theme: 'none',
    likes: ['1', '3', '5'],
    reactions: {
      '🔥': ['1', '3'],
      '👏': ['5'],
    },
    comments: mockComments.filter((c) => c.post === '1'),
    shares: ['3'],
    createdAt: new Date(Date.now() - 2 * HOUR),
  },
  {
    _id: '2',
    id: '2',
    title: 'Capstone UI Sprint: Feedback on our dark mode tokens',
    description:
      'We tested our campus project in both warm cork light mode and charcoal dark mode today. Sharing our contrast tokens for feedback from fellow BSCS/BSIT students and faculty!',
    author: mockUsers[0], // Juan Dela Cruz
    category: 'general',
    isAnonymous: false,
    isAnnouncement: false,
    attachments: [],
    theme: 'none',
    likes: ['2', '3', '5'],
    reactions: {
      '💡': ['2'],
      '❤️': ['3'],
    },
    comments: mockComments.filter((c) => c.post === '2'),
    shares: [],
    createdAt: new Date(Date.now() - 4 * HOUR),
  },
  {
    _id: '3',
    id: '3',
    title: 'Heads up: 3rd Floor Library extended hours during finals week',
    description:
      'Library staff confirmed study carrels stay open until 8:00 PM Monday to Friday next week. Bring your validated NU Manila ID when signing in.',
    author: mockUsers[2], // Pedro Reyes
    category: 'general',
    isAnonymous: true,
    isAnnouncement: false,
    attachments: [],
    theme: 'nu-blue',
    likes: ['1', '2', '5'],
    reactions: {
      '🙏': ['1', '2'],
    },
    comments: [],
    shares: ['1'],
    createdAt: new Date(Date.now() - 6 * HOUR),
  },
  {
    _id: '4',
    id: '4',
    title: 'Reminder: Data Structures Lab Exam Room Reassignment',
    description:
      'Sections BSCS-2A and BSCS-2B will take Friday morning’s lab exam at CompLab 3 instead of CompLab 1. Please arrive 15 minutes early for workstation setup.',
    author: mockUsers[4], // Prof. Ana Lim
    category: 'college-activities',
    isAnonymous: false,
    isAnnouncement: true,
    attachments: [],
    theme: 'none',
    likes: ['1', '3'],
    reactions: {
      '👍': ['1', '3'],
    },
    comments: mockComments.filter((c) => c.post === '4'),
    shares: ['1'],
    createdAt: new Date(Date.now() - 1 * DAY),
  },
  {
    _id: '5',
    id: '5',
    title: 'CCIT Intramurals Basketball Finals this Saturday!',
    description:
      'Come support the CCIT Bulldogs at the NU Manila Gym, 3:00 PM tip-off. Wear blue or gold and bring your classmates!',
    author: mockUsers[2], // Pedro Reyes
    category: 'extracurricular',
    isAnonymous: false,
    isAnnouncement: false,
    attachments: [],
    theme: 'none',
    likes: ['1', '2'],
    reactions: {
      '🏀': ['1'],
    },
    comments: [],
    shares: [],
    createdAt: new Date(Date.now() - 2 * DAY),
  },
];

// Mock Notifications (2 unread Today, 2 read This Week)
const now = Date.now();
export const mockNotifications: Notification[] = [
  {
    _id: 'n1',
    recipient: '2',
    sender: {
      _id: '1',
      name: 'Juan Dela Cruz',
      profilePicture: '',
    },
    type: 'post_commented',
    post: {
      _id: '1',
      title: 'CCIT Hackathon 2026: Team Registration & Mechanics',
    },
    comment: {
      _id: 'c1',
      content: 'Can cross-program teams (BSCS + BSIT) join together?',
    },
    read: false,
    createdAt: new Date(now - 1 * HOUR).toISOString(),
    updatedAt: new Date(now - 1 * HOUR).toISOString(),
  },
  {
    _id: 'n2',
    recipient: '2',
    sender: {
      _id: '3',
      name: 'Pedro Reyes',
      profilePicture: '',
    },
    type: 'post_reaction',
    post: {
      _id: '1',
      title: 'CCIT Hackathon 2026: Team Registration & Mechanics',
    },
    reactionEmoji: '🔥',
    read: false,
    createdAt: new Date(now - 2 * HOUR).toISOString(),
    updatedAt: new Date(now - 2 * HOUR).toISOString(),
  },
  {
    _id: 'n3',
    recipient: '2',
    sender: {
      _id: '5',
      name: 'Prof. Ana Lim',
      profilePicture: '',
    },
    type: 'post_liked',
    post: {
      _id: '2',
      title: 'Capstone UI Sprint: Feedback on our dark mode tokens',
    },
    read: true,
    createdAt: new Date(now - 2 * DAY).toISOString(),
    updatedAt: new Date(now - 2 * DAY).toISOString(),
  },
  {
    _id: 'n4',
    recipient: '2',
    sender: {
      _id: '1',
      name: 'Juan Dela Cruz',
      profilePicture: '',
    },
    type: 'post_commented',
    post: {
      _id: '4',
      title: 'Reminder: Data Structures Lab Exam Room Reassignment',
    },
    comment: {
      _id: 'c4',
      content: 'Noted Ma’am, thank you for the update!',
    },
    read: true,
    createdAt: new Date(now - 3 * DAY).toISOString(),
    updatedAt: new Date(now - 3 * DAY).toISOString(),
  },
];

// Mock auth response
export const mockAuthResponse: AuthResponse = {
  message: 'Login successful',
  user: mockUsers[1],
};

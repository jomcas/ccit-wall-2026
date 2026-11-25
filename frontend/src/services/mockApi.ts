import {
  mockUsers,
  mockPosts,
  mockComments,
  mockNotifications,
} from './mockData';
import type {
  User,
  Post,
  Comment,
  AuthResponse,
  Notification,
  NotificationResponse,
  AdminDashboardData,
} from '../types';

export const MOCK_USER_STORAGE_KEY = 'ccit_mock_user_id';
const DEFAULT_MOCK_USER_ID = '2'; // Dr. Maria Santos
const MOCK_DELAY = 120;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory stateful stores initialized from mockData
const usersState: User[] = mockUsers.map((u) => ({ ...u }));
const commentsState: Comment[] = mockComments.map((c) => ({
  ...c,
  author: { ...c.author },
  likes: [...c.likes],
}));
const postsState: Post[] = mockPosts.map((p) => ({
  ...p,
  author: { ...p.author },
  attachments: p.attachments ? [...p.attachments] : [],
  likes: [...p.likes],
  reactions: normalizeReactions(p.reactions),
  comments: commentsState.filter((c) => c.post === (p._id || p.id)),
  shares: [...p.shares],
}));
const notificationsState: Notification[] = mockNotifications.map((n) => ({
  ...n,
  sender: { ...n.sender },
  post: n.post ? { ...n.post } : undefined,
  comment: n.comment ? { ...n.comment } : undefined,
}));

function matchesId(item: { _id?: string; id?: string } | undefined | null, id: string): boolean {
  if (!item) return false;
  return item._id === id || item.id === id;
}

function getEntityId(item: { _id?: string; id?: string }): string {
  return item._id || item.id || '';
}

function normalizeReactions(reactions: Post['reactions'] | undefined): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!reactions) return result;
  if (reactions instanceof Map) {
    reactions.forEach((userIds, emoji) => {
      if (Array.isArray(userIds) && userIds.length > 0) {
        result[emoji] = [...userIds];
      }
    });
    return result;
  }
  Object.entries(reactions).forEach(([emoji, userIds]) => {
    if (Array.isArray(userIds) && userIds.length > 0) {
      result[emoji] = [...userIds];
    }
  });
  return result;
}

function clonePost(post: Post): Post {
  return {
    ...post,
    author: { ...post.author },
    attachments: post.attachments ? [...post.attachments] : [],
    likes: [...post.likes],
    reactions: normalizeReactions(post.reactions),
    comments: post.comments.map((c) => ({
      ...c,
      author: { ...c.author },
      likes: [...c.likes],
    })),
    shares: [...post.shares],
  };
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function extractPostPayload(data: FormData | Record<string, unknown>): {
  title?: string;
  description?: string;
  category?: Post['category'];
  isAnonymous?: boolean;
  hasIsAnonymous: boolean;
  isAnnouncement?: boolean;
  hasIsAnnouncement: boolean;
  theme?: string;
  existingImages?: string[];
  hasExistingImages: boolean;
  uploadedFiles: File[];
  rawAttachments?: string[];
} {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const titleVal = data.get('title');
    const descVal = data.get('description');
    const catVal = data.get('category');
    const anonVal = data.get('isAnonymous');
    const annVal = data.get('isAnnouncement');
    const themeVal = data.get('theme');
    const existingVal = data.get('existingImages');

    let existingImages: string[] | undefined;
    if (typeof existingVal === 'string') {
      try {
        const parsed: unknown = JSON.parse(existingVal);
        if (Array.isArray(parsed)) {
          existingImages = parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        existingImages = [];
      }
    }

    const uploadedFiles: File[] = [];
    const imageEntries = [...data.getAll('images'), ...data.getAll('attachments')];
    for (const entry of imageEntries) {
      if (typeof File !== 'undefined' && entry instanceof File && entry.size > 0) {
        uploadedFiles.push(entry);
      }
    }

    return {
      title: typeof titleVal === 'string' ? titleVal : undefined,
      description: typeof descVal === 'string' ? descVal : undefined,
      category:
        catVal === 'college-activities' || catVal === 'general' || catVal === 'extracurricular'
          ? catVal
          : undefined,
      isAnonymous: anonVal !== null ? parseBool(anonVal) : undefined,
      hasIsAnonymous: anonVal !== null,
      isAnnouncement: annVal !== null ? parseBool(annVal) : undefined,
      hasIsAnnouncement: annVal !== null,
      theme: typeof themeVal === 'string' ? themeVal : undefined,
      existingImages,
      hasExistingImages: existingVal !== null,
      uploadedFiles,
    };
  }

  const obj = (data || {}) as Record<string, unknown>;
  const uploadedFiles: File[] = [];
  const rawAttachments: string[] = [];

  if (Array.isArray(obj.images)) {
    for (const item of obj.images) {
      if (typeof File !== 'undefined' && item instanceof File) {
        uploadedFiles.push(item);
      } else if (typeof item === 'string') {
        rawAttachments.push(item);
      }
    }
  }
  if (Array.isArray(obj.attachments)) {
    for (const item of obj.attachments) {
      if (typeof File !== 'undefined' && item instanceof File) {
        uploadedFiles.push(item);
      } else if (typeof item === 'string') {
        rawAttachments.push(item);
      }
    }
  }

  let existingImages: string[] | undefined;
  if (typeof obj.existingImages === 'string') {
    try {
      const parsed: unknown = JSON.parse(obj.existingImages);
      if (Array.isArray(parsed)) {
        existingImages = parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      existingImages = [];
    }
  } else if (Array.isArray(obj.existingImages)) {
    existingImages = obj.existingImages.filter((x): x is string => typeof x === 'string');
  }

  const cat = obj.category;
  return {
    title: typeof obj.title === 'string' ? obj.title : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    category:
      cat === 'college-activities' || cat === 'general' || cat === 'extracurricular'
        ? cat
        : undefined,
    isAnonymous: obj.isAnonymous !== undefined ? parseBool(obj.isAnonymous) : undefined,
    hasIsAnonymous: obj.isAnonymous !== undefined,
    isAnnouncement: obj.isAnnouncement !== undefined ? parseBool(obj.isAnnouncement) : undefined,
    hasIsAnnouncement: obj.isAnnouncement !== undefined,
    theme: typeof obj.theme === 'string' ? obj.theme : undefined,
    existingImages,
    hasExistingImages: obj.existingImages !== undefined,
    uploadedFiles,
    rawAttachments: rawAttachments.length > 0 ? rawAttachments : undefined,
  };
}

function persistActiveMockUserId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOCK_USER_STORAGE_KEY, id);
  } catch {
    // Ignore storage failures
  }
}

function readStoredMockUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_MOCK_USER_ID;
  try {
    return localStorage.getItem(MOCK_USER_STORAGE_KEY) || DEFAULT_MOCK_USER_ID;
  } catch {
    return DEFAULT_MOCK_USER_ID;
  }
}

function syncAuthorSnapshots(updatedUser: User): void {
  const uid = getEntityId(updatedUser);
  for (const post of postsState) {
    if (matchesId(post.author, uid)) {
      post.author = { ...updatedUser };
    }
    for (const c of post.comments) {
      if (matchesId(c.author, uid)) {
        c.author = { ...updatedUser };
      }
    }
  }
  for (const comment of commentsState) {
    if (matchesId(comment.author, uid)) {
      comment.author = { ...updatedUser };
    }
  }
  for (const notif of notificationsState) {
    if (notif.sender._id === uid) {
      notif.sender = {
        _id: uid,
        name: updatedUser.name,
        profilePicture: updatedUser.profilePicture,
      };
    }
  }
}

// Active mock user helpers
export function getActiveMockUser(): User {
  const storedId = readStoredMockUserId();
  const found =
    usersState.find((u) => matchesId(u, storedId)) ||
    usersState.find((u) => matchesId(u, DEFAULT_MOCK_USER_ID)) ||
    usersState[0];
  return { ...found };
}

export function setActiveMockUserById(id: string): User {
  const found =
    usersState.find((u) => matchesId(u, id)) ||
    usersState.find((u) => matchesId(u, DEFAULT_MOCK_USER_ID)) ||
    usersState[0];
  persistActiveMockUserId(getEntityId(found));
  return { ...found };
}

export function setActiveMockUserByRole(role: 'student' | 'teacher' | 'admin'): User {
  // Prefer canonical demo personas for each role
  const preferredIdByRole: Record<'student' | 'teacher' | 'admin', string> = {
    student: '1', // Juan Dela Cruz
    teacher: '2', // Dr. Maria Santos
    admin: '4',   // CCIT Admin
  };
  const preferred = usersState.find((u) => matchesId(u, preferredIdByRole[role]));
  const found =
    preferred ||
    usersState.find((u) => u.role === role) ||
    usersState.find((u) => matchesId(u, DEFAULT_MOCK_USER_ID)) ||
    usersState[0];
  persistActiveMockUserId(getEntityId(found));
  return { ...found };
}

export function loginOrCreateMockUser(
  email?: string,
  role?: 'student' | 'teacher' | 'admin',
  name?: string
): User {
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = usersState.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      persistActiveMockUserId(getEntityId(existing));
      return { ...existing };
    }

    const newId = `u-${Date.now()}`;
    const derivedName =
      name?.trim() ||
      normalizedEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

    const created: User = {
      _id: newId,
      id: newId,
      name: derivedName,
      email: normalizedEmail,
      role: role || 'student',
      bio: 'NU Manila CCIT community member.',
      contactInformation: normalizedEmail,
      profilePicture: '',
      createdAt: new Date(),
    };
    usersState.push(created);
    persistActiveMockUserId(newId);
    return { ...created };
  }

  if (role) {
    return setActiveMockUserByRole(role);
  }

  return getActiveMockUser();
}

// Mock API Service
export const mockApiService = {
  // Auth & Profile
  syncProfile: async (data?: { role?: string; name?: string }) => {
    await delay(MOCK_DELAY);
    let user = getActiveMockUser();
    if (data?.role === 'student' || data?.role === 'teacher' || data?.role === 'admin') {
      user = setActiveMockUserByRole(data.role);
    }
    const response: AuthResponse = {
      message: 'Profile synced',
      user,
    };
    return { data: response };
  },

  getProfile: async () => {
    await delay(MOCK_DELAY);
    return { data: getActiveMockUser() };
  },

  updateProfile: async (data: Partial<User>) => {
    await delay(MOCK_DELAY);
    const active = getActiveMockUser();
    const activeId = getEntityId(active);
    const idx = usersState.findIndex((u) => matchesId(u, activeId));
    const target = idx >= 0 ? usersState[idx] : active;

    if (data.name !== undefined) target.name = data.name;
    if (data.bio !== undefined) target.bio = data.bio;
    if (data.contactInformation !== undefined) target.contactInformation = data.contactInformation;
    if (data.profilePicture !== undefined) target.profilePicture = data.profilePicture;

    const updated = { ...target };
    syncAuthorSnapshots(updated);
    return {
      data: {
        message: 'Profile updated successfully',
        user: updated,
      },
    };
  },

  uploadProfilePicture: async (file: File) => {
    await delay(MOCK_DELAY);
    const objectUrl = URL.createObjectURL(file);
    const active = getActiveMockUser();
    const activeId = getEntityId(active);
    const idx = usersState.findIndex((u) => matchesId(u, activeId));
    const target = idx >= 0 ? usersState[idx] : active;
    target.profilePicture = objectUrl;

    const updated = { ...target };
    syncAuthorSnapshots(updated);
    return {
      data: {
        message: 'Profile picture updated successfully',
        user: updated,
      },
    };
  },

  // Users
  getAllUsers: async () => {
    await delay(MOCK_DELAY);
    return { data: usersState.map((u) => ({ ...u })) };
  },

  getUserById: async (id: string) => {
    await delay(MOCK_DELAY);
    const user = usersState.find((u) => matchesId(u, id));
    if (!user) {
      throw new Error('User not found');
    }
    return { data: { ...user } };
  },

  searchUsers: async (query: string) => {
    await delay(MOCK_DELAY);
    const q = query.trim().toLowerCase();
    const matched = !q
      ? usersState
      : usersState.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        );
    return { data: matched.map((u) => ({ ...u })) };
  },

  // Posts
  getAllPosts: async (search?: string, category?: string) => {
    await delay(MOCK_DELAY);
    let list = [...postsState];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => {
        const authorName = p.isAnonymous ? 'anonymous' : p.author.name.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          authorName.includes(q)
        );
      });
    }

    if (category && category.trim()) {
      list = list.filter((p) => p.category === category);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { data: list.map(clonePost) };
  },

  getPostById: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = postsState.find((p) => matchesId(p, id));
    if (!post) {
      throw new Error('Post not found');
    }
    return { data: clonePost(post) };
  },

  searchPosts: async (query: string) => {
    await delay(MOCK_DELAY);
    const q = query.trim().toLowerCase();
    const matched = !q
      ? postsState
      : postsState.filter((p) => {
          const authorName = p.isAnonymous ? 'anonymous' : p.author.name.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            authorName.includes(q)
          );
        });
    return {
      data: matched
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(clonePost),
    };
  },

  createPost: async (data: FormData | Record<string, unknown>) => {
    await delay(MOCK_DELAY);
    const activeUser = getActiveMockUser();
    const parsed = extractPostPayload(data);

    const newUrls = parsed.uploadedFiles.map((file) => URL.createObjectURL(file));
    const attachments = [...(parsed.rawAttachments || []), ...newUrls].slice(0, 4);

    const isAnonymous =
      activeUser.role === 'teacher' ? false : Boolean(parsed.isAnonymous);
    const isAnnouncement =
      activeUser.role === 'teacher' || activeUser.role === 'admin'
        ? Boolean(parsed.isAnnouncement)
        : false;

    const newId = `post-${Date.now()}`;
    const newPost: Post = {
      _id: newId,
      id: newId,
      title: parsed.title?.trim() || 'Untitled Post',
      description: parsed.description?.trim() || '',
      author: { ...activeUser },
      category: parsed.category || 'general',
      isAnonymous,
      isAnnouncement,
      attachments,
      theme: parsed.theme || 'none',
      likes: [],
      reactions: {},
      comments: [],
      shares: [],
      createdAt: new Date(),
    };

    postsState.unshift(newPost);
    return {
      data: {
        message: 'Post created successfully',
        post: clonePost(newPost),
      },
    };
  },

  updatePost: async (id: string, data: FormData | Record<string, unknown>) => {
    await delay(MOCK_DELAY);
    const activeUser = getActiveMockUser();
    const post = postsState.find((p) => matchesId(p, id));
    if (!post) {
      throw new Error('Post not found');
    }

    const parsed = extractPostPayload(data);
    if (parsed.title !== undefined && parsed.title.trim()) post.title = parsed.title.trim();
    if (parsed.description !== undefined && parsed.description.trim()) {
      post.description = parsed.description.trim();
    }
    if (parsed.category !== undefined) post.category = parsed.category;
    if (parsed.theme !== undefined) post.theme = parsed.theme;

    if (activeUser.role === 'teacher') {
      post.isAnonymous = false;
    } else if (parsed.hasIsAnonymous && parsed.isAnonymous !== undefined) {
      post.isAnonymous = parsed.isAnonymous;
    }

    if (
      (activeUser.role === 'teacher' || activeUser.role === 'admin') &&
      parsed.hasIsAnnouncement &&
      parsed.isAnnouncement !== undefined
    ) {
      post.isAnnouncement = parsed.isAnnouncement;
    }

    if (parsed.hasExistingImages || parsed.uploadedFiles.length > 0 || parsed.rawAttachments) {
      const kept = parsed.existingImages ?? parsed.rawAttachments ?? post.attachments ?? [];
      const added = parsed.uploadedFiles.map((file) => URL.createObjectURL(file));
      post.attachments = [...kept, ...added].slice(0, 4);
    }

    return {
      data: {
        message: 'Post updated successfully',
        post: clonePost(post),
      },
    };
  },

  deletePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = postsState.findIndex((p) => matchesId(p, id));
    if (index > -1) {
      const removed = postsState[index];
      const removedId = getEntityId(removed);
      postsState.splice(index, 1);

      for (let i = commentsState.length - 1; i >= 0; i--) {
        if (commentsState[i].post === id || commentsState[i].post === removedId) {
          commentsState.splice(i, 1);
        }
      }
    }
    return { data: { message: 'Post deleted successfully' } };
  },

  likePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = postsState.find((p) => matchesId(p, id));
    if (!post) throw new Error('Post not found');

    const userId = getEntityId(getActiveMockUser());
    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    return {
      data: {
        message: 'Post like toggled',
        post: clonePost(post),
      },
    };
  },

  addReaction: async (id: string, emoji: string) => {
    await delay(MOCK_DELAY);
    const post = postsState.find((p) => matchesId(p, id));
    if (!post) throw new Error('Post not found');

    const userId = getEntityId(getActiveMockUser());
    const reactionsObj = normalizeReactions(post.reactions);
    const currentUsers = reactionsObj[emoji] ? [...reactionsObj[emoji]] : [];
    const existingIdx = currentUsers.indexOf(userId);

    if (existingIdx > -1) {
      currentUsers.splice(existingIdx, 1);
    } else {
      currentUsers.push(userId);
    }

    if (currentUsers.length > 0) {
      reactionsObj[emoji] = currentUsers;
    } else {
      delete reactionsObj[emoji];
    }

    post.reactions = reactionsObj;
    return {
      data: {
        message: 'Reaction added',
        post: clonePost(post),
      },
    };
  },

  sharePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = postsState.find((p) => matchesId(p, id));
    if (!post) throw new Error('Post not found');

    const userId = getEntityId(getActiveMockUser());
    if (!post.shares.includes(userId)) {
      post.shares.push(userId);
    }

    return {
      data: {
        message: 'Post shared',
        post: clonePost(post),
      },
    };
  },

  // Comments
  createComment: async (postId: string, content: string) => {
    await delay(MOCK_DELAY);
    const activeUser = getActiveMockUser();
    const post = postsState.find((p) => matchesId(p, postId));
    const canonicalPostId = post ? getEntityId(post) : postId;

    const newId = `c-${Date.now()}`;
    const comment: Comment = {
      _id: newId,
      id: newId,
      content: content.trim(),
      author: { ...activeUser },
      post: canonicalPostId,
      likes: [],
      createdAt: new Date(),
    };

    commentsState.push(comment);
    if (post) {
      post.comments.push(comment);
    }

    return {
      data: {
        message: 'Comment created successfully',
        comment: { ...comment, author: { ...comment.author }, likes: [...comment.likes] },
      },
    };
  },

  getComments: async (postId: string) => {
    await delay(MOCK_DELAY);
    const post = postsState.find((p) => matchesId(p, postId));
    const postIds = new Set<string>([postId]);
    if (post?._id) postIds.add(post._id);
    if (post?.id) postIds.add(post.id);

    const matched = commentsState
      .filter((c) => postIds.has(c.post))
      .map((c) => ({ ...c, author: { ...c.author }, likes: [...c.likes] }));

    return { data: matched };
  },

  updateComment: async (id: string, content: string) => {
    await delay(MOCK_DELAY);
    const comment = commentsState.find((c) => matchesId(c, id));
    if (!comment) throw new Error('Comment not found');

    comment.content = content.trim();
    comment.updatedAt = new Date();

    for (const post of postsState) {
      const postComment = post.comments.find((c) => matchesId(c, id));
      if (postComment) {
        postComment.content = comment.content;
        postComment.updatedAt = comment.updatedAt;
      }
    }

    return {
      data: {
        message: 'Comment updated successfully',
        comment: { ...comment, author: { ...comment.author }, likes: [...comment.likes] },
      },
    };
  },

  deleteComment: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = commentsState.findIndex((c) => matchesId(c, id));
    if (index > -1) {
      commentsState.splice(index, 1);
    }
    for (const post of postsState) {
      const postIdx = post.comments.findIndex((c) => matchesId(c, id));
      if (postIdx > -1) {
        post.comments.splice(postIdx, 1);
      }
    }
    return { data: { message: 'Comment deleted successfully' } };
  },

  likeComment: async (id: string) => {
    await delay(MOCK_DELAY);
    const comment = commentsState.find((c) => matchesId(c, id));
    if (!comment) throw new Error('Comment not found');

    const userId = getEntityId(getActiveMockUser());
    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    for (const post of postsState) {
      const postComment = post.comments.find((c) => matchesId(c, id));
      if (postComment && postComment !== comment) {
        postComment.likes = [...comment.likes];
      }
    }

    return {
      data: {
        message: 'Comment like toggled',
        comment: { ...comment, author: { ...comment.author }, likes: [...comment.likes] },
      },
    };
  },

  // Notifications
  getNotifications: async (
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ data: NotificationResponse }> => {
    await delay(MOCK_DELAY);
    let filtered = notificationsState.slice();
    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit).map((n) => ({
      ...n,
      sender: { ...n.sender },
      post: n.post ? { ...n.post } : undefined,
      comment: n.comment ? { ...n.comment } : undefined,
    }));

    return {
      data: {
        notifications: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: skip + paginated.length < total,
        },
      },
    };
  },

  getUnreadCount: async () => {
    await delay(60);
    const count = notificationsState.filter((n) => !n.read).length;
    return { data: { count } };
  },

  markAsRead: async (id: string) => {
    await delay(60);
    const notif = notificationsState.find((n) => n._id === id);
    if (!notif) throw new Error('Notification not found');
    notif.read = true;
    notif.updatedAt = new Date().toISOString();
    return {
      data: {
        message: 'Notification marked as read',
        notification: { ...notif },
      },
    };
  },

  markAllAsRead: async () => {
    await delay(80);
    let modifiedCount = 0;
    const nowIso = new Date().toISOString();
    for (const notif of notificationsState) {
      if (!notif.read) {
        notif.read = true;
        notif.updatedAt = nowIso;
        modifiedCount += 1;
      }
    }
    return {
      data: {
        message: 'All notifications marked as read',
        modifiedCount,
      },
    };
  },

  deleteNotification: async (id: string) => {
    await delay(80);
    const index = notificationsState.findIndex((n) => n._id === id);
    if (index > -1) {
      notificationsState.splice(index, 1);
    }
    return { data: { message: 'Notification deleted' } };
  },

  // Admin
  getDashboard: async (): Promise<{ data: AdminDashboardData }> => {
    await delay(MOCK_DELAY);
    const recentPosts = postsState
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(clonePost);

    return {
      data: {
        totalUsers: usersState.length,
        totalPosts: postsState.length,
        studentCount: usersState.filter((u) => u.role === 'student').length,
        teacherCount: usersState.filter((u) => u.role === 'teacher').length,
        recentPosts,
      },
    };
  },

  getUserActivity: async (userId: string) => {
    await delay(MOCK_DELAY);
    const userPosts = postsState
      .filter((p) => matchesId(p.author, userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(clonePost);

    return {
      data: {
        userId,
        posts: userPosts,
        postCount: userPosts.length,
      },
    };
  },

  adminSearchUsers: async (query: string) => {
    await delay(MOCK_DELAY);
    const q = query.trim().toLowerCase();
    const matched = !q
      ? usersState
      : usersState.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        );
    return { data: matched.map((u) => ({ ...u })) };
  },

  adminSearchPosts: async (query: string) => {
    await delay(MOCK_DELAY);
    const q = query.trim().toLowerCase();
    const matched = !q
      ? postsState
      : postsState.filter((p) => {
          const authorName = p.author.name.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            authorName.includes(q)
          );
        });
    return {
      data: matched
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(clonePost),
    };
  },
};

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiInbox,
  FiEdit2,
  FiCamera,
  FiMail,
  FiPhone,
  FiX,
  FiUser,
  FiFileText,
  FiCalendar,
  FiBookOpen,
} from 'react-icons/fi';
import { authService, postService } from '../services/api';
import PostComponent from '../components/Post';
import ProfilePictureUploader from '../components/ProfilePictureUploader';
import { ProfileCardSkeleton, PostSkeleton } from '../components/SkeletonLoader';
import { useSession } from '../contexts/SessionContext';
import { cache, CACHE_TTL } from '../utils/cache';
import type { User, Post as PostType } from '../types';

type ProfileTab = 'posts' | 'about';

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => !/^(dr|prof|mr|mrs|ms|engr)\.?$/i.test(part));
  const source = parts.length > 0 ? parts : name.trim().split(/\s+/);
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return `${source[0][0]}${source[1][0]}`.toUpperCase();
};

const getRolePillClass = (role?: User['role']): string => {
  if (role === 'teacher') return 'role-pill role-pill--teacher';
  if (role === 'admin') return 'role-pill role-pill--admin';
  return 'role-pill role-pill--student';
};

const matchesPostAuthor = (post: PostType, targetUser: User): boolean => {
  const author = post.author as Partial<User> | undefined;
  if (!author) return false;
  const authorId = author._id || author.id;
  const targetId = targetUser._id || targetUser.id;
  if (authorId && targetId && authorId === targetId) return true;
  return Boolean(author.name && targetUser.name && author.name === targetUser.name);
};

const formatMemberDate = (value?: Date | string): string | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const Profile: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: sessionUser, handleSessionExpired, updateUserData } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    profilePicture: '',
    contactInformation: '',
  });

  const sessionUserId = sessionUser?._id || sessionUser?.id || '';

  const syncFormWithUser = useCallback((target: User) => {
    setFormData({
      name: target.name || '',
      email: target.email || '',
      bio: target.bio || '',
      profilePicture: target.profilePicture || '',
      contactInformation: target.contactInformation || '',
    });
  }, []);

  const loadProfile = useCallback(async () => {
    const cached = cache.get<User>('my_profile');
    const cachedId = cached?._id || cached?.id || '';
    if (cached && (!sessionUserId || cachedId === sessionUserId)) {
      setUser(cached);
      syncFormWithUser(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authService.getProfile();
      const fetched: User = response.data;
      setUser(fetched);
      cache.set('my_profile', fetched, CACHE_TTL.PROFILE);
      syncFormWithUser(fetched);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError('Failed to load profile.');
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpired, sessionUserId, syncFormWithUser]);

  const loadUserPosts = useCallback(
    async (targetUser: User) => {
      setPostsLoading(true);
      try {
        const response = await postService.getAllPosts();
        const allPosts: PostType[] = Array.isArray(response.data) ? response.data : [];
        const userPosts = allPosts
          .filter((post) => matchesPostAuthor(post, targetUser))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setPosts(userPosts);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          handleSessionExpired();
          return;
        }
        console.error('Failed to load user posts', err);
      } finally {
        setPostsLoading(false);
      }
    },
    [handleSessionExpired]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user) {
      loadUserPosts(user);
    }
  }, [user, loadUserPosts]);

  // Ensure native HTML autofocus attribute exists on the first field for showModal()
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.setAttribute('autofocus', '');
    }
  }, [user]);

  const openEditDialog = useCallback(() => {
    if (!user) return;
    syncFormWithUser(user);
    setDialogError('');
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Fallback focus if browser skips autofocus on repeated opens
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }
  }, [user, syncFormWithUser]);

  const closeEditDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
  }, []);

  // Auto-open Edit Profile modal when navigated with ?edit=true
  useEffect(() => {
    if (!loading && user && searchParams.get('edit') === 'true') {
      openEditDialog();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  }, [loading, user, searchParams, setSearchParams, openEditDialog]);

  // Pointer bounding-rect light-dismiss fallback when closedby="any" is unsupported (Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, [user]);

  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    setDialogError('');
    if (user) {
      syncFormWithUser(user);
    }
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    setPosts((prev) =>
      prev.map((p) => {
        const existingId = p._id || p.id;
        const updatedId = updatedPost._id || updatedPost.id;
        return existingId === updatedId ? updatedPost : p;
      })
    );
  };

  const hasFormChanges = (): boolean => {
    if (!user) return false;
    return (
      formData.name.trim() !== (user.name || '') ||
      formData.email.trim() !== (user.email || '') ||
      formData.bio.trim() !== (user.bio || '') ||
      formData.profilePicture !== (user.profilePicture || '') ||
      formData.contactInformation.trim() !== (user.contactInformation || '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError('');
    setError('');
    setSuccess('');

    if (!hasFormChanges()) {
      closeEditDialog();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        bio: formData.bio.trim(),
        contactInformation: formData.contactInformation.trim(),
      };
      const response = await authService.updateProfile(payload);
      const updatedUser: User = response.data.user;
      setUser(updatedUser);
      cache.set('my_profile', updatedUser, CACHE_TTL.PROFILE);
      updateUserData(updatedUser);
      setSuccess('Profile updated successfully.');
      closeEditDialog();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosErr.response?.status === 401) {
        closeEditDialog();
        handleSessionExpired();
        return;
      }
      setDialogError(axiosErr.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab((prev) => (prev === 'posts' ? 'about' : 'posts'));
    }
  };

  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
    [posts]
  );

  const memberSince = useMemo(() => formatMemberDate(user?.createdAt), [user?.createdAt]);

  if (loading) {
    return (
      <section className="profile-page" aria-label="Loading profile">
        <ProfileCardSkeleton />
        <div className="profile-posts-list">
          <PostSkeleton />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="profile-page" aria-label="Profile unavailable">
        <div className="paper page-empty-state">
          <FiAlertCircle size={40} aria-hidden="true" />
          <p className="page-empty-state__title">{error || 'Profile not found'}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/feed')}
          >
            Back to Feed
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page" aria-label="My profile">
      {error && (
        <div className="page-alert page-alert--error" role="alert">
          <FiAlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="page-alert page-alert--success" role="status">
          <FiCheckCircle size={18} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      {/* Horizontal Identity Header Card */}
      <article className="paper profile-header-card">
        <div className="profile-banner" aria-hidden="true" />

        <div className="profile-header-body">
          <div className="profile-top-row">
            <div className="profile-avatar-wrap">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="profile-avatar-img"
                />
              ) : (
                <div
                  className={`profile-avatar-initials ${
                    user.role === 'student' ? 'profile-avatar-initials--gold' : ''
                  }`}
                  aria-hidden="true"
                >
                  {getInitials(user.name)}
                </div>
              )}

              <button
                type="button"
                className="profile-avatar-edit"
                onClick={openEditDialog}
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                <FiCamera size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="profile-header-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={openEditDialog}
              >
                <FiEdit2 size={14} aria-hidden="true" />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="profile-identity">
            <h1 className="profile-name">{user.name}</h1>
            <span className={getRolePillClass(user.role)}>{user.role}</span>
          </div>

          {user.bio ? (
            <p className="profile-bio">{user.bio}</p>
          ) : (
            <p className="profile-bio profile-bio--placeholder">
              Add a short bio so CCIT students and faculty know your program or interests.
            </p>
          )}

          <div className="profile-meta-row">
            <span className="profile-meta-item">
              <strong>{posts.length}</strong> {posts.length === 1 ? 'Post' : 'Posts'}
            </span>
            <span className="profile-meta-item">
              <strong>{totalLikes}</strong>{' '}
              {totalLikes === 1 ? 'Like received' : 'Likes received'}
            </span>
            <span className="profile-meta-item">
              <FiMail size={14} aria-hidden="true" />
              <span>{user.email}</span>
            </span>
            {user.contactInformation && (
              <span className="profile-meta-item">
                <FiPhone size={14} aria-hidden="true" />
                <span>{user.contactInformation}</span>
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Horizontal Segmented Tabs */}
      <div className="profile-tabs-row">
        <div
          className="segmented-tabs"
          role="tablist"
          aria-label="Profile sections"
          onKeyDown={handleTabKeyDown}
        >
          <button
            id="profile-tab-posts"
            type="button"
            role="tab"
            aria-selected={activeTab === 'posts'}
            aria-controls="profile-panel-posts"
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            id="profile-tab-about"
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            aria-controls="profile-panel-about"
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'posts' ? (
        <div
          id="profile-panel-posts"
          role="tabpanel"
          aria-labelledby="profile-tab-posts"
          className="profile-posts-list"
        >
          {postsLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <div className="paper page-empty-state">
              <FiInbox size={40} aria-hidden="true" />
              <p className="page-empty-state__title">No posts yet</p>
              <p className="page-empty-state__sub">
                Share an announcement, study group, or campus update on CCIT Wall.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/feed')}
              >
                Go to Feed
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <PostComponent
                key={post._id || post.id}
                post={post}
                onPostDeleted={() => loadUserPosts(user)}
                onPostUpdated={handlePostUpdated}
              />
            ))
          )}
        </div>
      ) : (
        <div
          id="profile-panel-about"
          role="tabpanel"
          aria-labelledby="profile-tab-about"
          className="paper profile-about-card"
        >
          <h2 className="profile-about-title">Academic &amp; Contact Details</h2>
          <dl className="profile-about-grid">
            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiUser size={15} aria-hidden="true" />
                Role
              </dt>
              <dd className="profile-about-value">
                <span className={getRolePillClass(user.role)}>{user.role}</span>
              </dd>
            </div>

            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiMail size={15} aria-hidden="true" />
                Email
              </dt>
              <dd className="profile-about-value">
                <a href={`mailto:${user.email}`} className="profile-about-link">
                  {user.email}
                </a>
              </dd>
            </div>

            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiPhone size={15} aria-hidden="true" />
                Contact
              </dt>
              <dd className="profile-about-value">
                {user.contactInformation ? (
                  user.contactInformation
                ) : (
                  <button
                    type="button"
                    className="profile-about-add-btn"
                    onClick={openEditDialog}
                  >
                    Add contact information
                  </button>
                )}
              </dd>
            </div>

            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiBookOpen size={15} aria-hidden="true" />
                Department
              </dt>
              <dd className="profile-about-value">
                College of Computing and Information Technologies, National University Manila
              </dd>
            </div>

            {user.bio && (
              <div className="profile-about-row">
                <dt className="profile-about-label">
                  <FiFileText size={15} aria-hidden="true" />
                  Bio
                </dt>
                <dd className="profile-about-value">{user.bio}</dd>
              </div>
            )}

            {memberSince && (
              <div className="profile-about-row">
                <dt className="profile-about-label">
                  <FiCalendar size={15} aria-hidden="true" />
                  Member Since
                </dt>
                <dd className="profile-about-value">{memberSince}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Native <dialog> Edit Profile Modal */}
      <dialog
        ref={dialogRef}
        className="page-dialog edit-profile-dialog"
        aria-labelledby="edit-profile-dialog-title"
        onClose={handleDialogClose}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      >
        <div className="page-dialog__head">
          <h1 id="edit-profile-dialog-title" className="page-dialog__title">
            Edit Profile
          </h1>
          <button
            type="button"
            className="btn btn--ghost btn--icon page-dialog__close"
            onClick={closeEditDialog}
            aria-label="Close edit profile dialog"
          >
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="page-dialog__form">
          <div className="page-dialog__body">
            {dialogError && (
              <div className="page-alert page-alert--error" role="alert">
                <FiAlertCircle size={16} aria-hidden="true" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="page-dialog__uploader">
              <ProfilePictureUploader
                currentPicture={formData.profilePicture || user.profilePicture}
                userName={formData.name || user.name}
                onUploadSuccess={(newUrl, updatedUser) => {
                  const mergedUser: User = {
                    ...user,
                    ...(updatedUser || {}),
                    profilePicture: newUrl,
                  };
                  setFormData((prev) => ({ ...prev, profilePicture: newUrl }));
                  setUser(mergedUser);
                  cache.set('my_profile', mergedUser, CACHE_TTL.PROFILE);
                  updateUserData(mergedUser);
                  setSuccess('Profile picture updated successfully.');
                }}
              />
            </div>

            <div className="page-dialog__grid">
              <div className="page-dialog__field">
                <label htmlFor="ep-name">Full name</label>
                <input
                  ref={nameInputRef}
                  id="ep-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="input"
                  autoFocus
                  required
                />
              </div>

              <div className="page-dialog__field">
                <label htmlFor="ep-email">Email</label>
                <input
                  id="ep-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@nu-manila.edu.ph"
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="page-dialog__field">
              <label htmlFor="ep-bio">Bio</label>
              <textarea
                id="ep-bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Share your program, focus areas, or office hours..."
                className="input page-dialog__textarea"
                rows={3}
              />
            </div>

            <div className="page-dialog__field">
              <label htmlFor="ep-contact">Contact information</label>
              <input
                id="ep-contact"
                type="text"
                name="contactInformation"
                value={formData.contactInformation}
                onChange={handleChange}
                placeholder="Room number, block section, GitHub, or phone..."
                className="input"
              />
            </div>
          </div>

          <div className="page-dialog__foot">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={closeEditDialog}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
};

export default Profile;

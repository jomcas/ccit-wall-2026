import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

// Mock axios & Firebase before importing app modules so CRA Jest stays deterministic
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

jest.mock('../config/firebase', () => ({
  __esModule: true,
  auth: { currentUser: null },
  default: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn().mockResolvedValue(undefined),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
  sendEmailVerification: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    addScope: jest.fn(),
  })),
}));

// Ensure api.ts always runs in mock mode during tests even when .env is absent
jest.mock('../services/api', () => {
  process.env.REACT_APP_USE_MOCK_DATA = 'true';
  return jest.requireActual('../services/api');
});

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { SessionProvider } from '../contexts/SessionContext';
import LandingPage from '../pages/LandingPage';
import Register from '../pages/Register';
import AdminDashboard from '../pages/AdminDashboard';
import Notifications from '../pages/Notifications';
import About from '../pages/About';

// Enable React 18 act() environment flag
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock window.matchMedia with controllable prefers-color-scheme state
let prefersDarkMatches = false;
const matchMediaListeners = new Set<(event: MediaQueryListEvent) => void>();

const installMatchMediaMock = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      get matches() {
        return query === '(prefers-color-scheme: dark)' ? prefersDarkMatches : false;
      },
      media: query,
      onchange: null,
      addListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
        matchMediaListeners.add(cb);
      }),
      removeListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
        matchMediaListeners.delete(cb);
      }),
      addEventListener: jest.fn(
        (_type: string, cb: (event: MediaQueryListEvent) => void) => {
          matchMediaListeners.add(cb);
        }
      ),
      removeEventListener: jest.fn(
        (_type: string, cb: (event: MediaQueryListEvent) => void) => {
          matchMediaListeners.delete(cb);
        }
      ),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock HTMLDialogElement.prototype.showModal / close in jsdom if available
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = jest.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = jest.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
  }
}

// Helper to load an isolated, pristine instance of mockApi.ts per unit test
const loadFreshMockApi = () => {
  let mod!: typeof import('../services/mockApi');
  jest.isolateModules(() => {
    mod = require('../services/mockApi');
  });
  return mod;
};

// Helper to trigger React controlled input changes in jsdom without @testing-library
const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

// Helper to poll for async UI assertions cleanly inside act()
const waitFor = async (assertion: () => void, timeoutMs: number = 2500): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (err) {
      lastError = err;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }
  }

  throw lastError;
};

describe('CCIT Wall Redesign Automated Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    prefersDarkMatches = false;
    matchMediaListeners.clear();
    installMatchMediaMock();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  });

  const renderWithProviders = (ui: React.ReactElement, initialRoute: string = '/') => {
    act(() => {
      root?.render(
        <MemoryRouter
          initialEntries={[initialRoute]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <SessionProvider>{ui}</SessionProvider>
          </ThemeProvider>
        </MemoryRouter>
      );
    });
  };

  // ==========================================================================
  // 1. mockApiService
  // ==========================================================================
  describe('mockApiService', () => {
    it('getAllPosts returns seeded campus posts including pinned faculty announcements', async () => {
      const { mockApiService } = loadFreshMockApi();
      const { data: posts } = await mockApiService.getAllPosts();

      expect(posts.length).toBeGreaterThanOrEqual(5);

      const announcements = posts.filter((p) => p.isAnnouncement === true);
      expect(announcements.length).toBeGreaterThanOrEqual(2);
      expect(
        announcements.some(
          (p) =>
            p.title.includes('CCIT Hackathon 2026') && p.author.role === 'teacher'
        )
      ).toBe(true);
      expect(
        announcements.some(
          (p) =>
            p.title.includes('Data Structures Lab Exam') && p.author.role === 'teacher'
        )
      ).toBe(true);
    });

    it('createPost with FormData creates announcements for teacher/admin and attaches reactions and shares', async () => {
      const { mockApiService, setActiveMockUserByRole } = loadFreshMockApi();

      // Teacher creates announcement via FormData
      const teacher = setActiveMockUserByRole('teacher');
      const teacherForm = new FormData();
      teacherForm.append('title', 'Finals Lab Consultation Schedule');
      teacherForm.append('description', 'Drop by Room 405 for capstone feedback.');
      teacherForm.append('category', 'college-activities');
      teacherForm.append('isAnnouncement', 'true');
      teacherForm.append('isAnonymous', 'true');

      const teacherRes = await mockApiService.createPost(teacherForm);
      const teacherPost = teacherRes.data.post;
      const teacherPostId = teacherPost._id || teacherPost.id || '';

      expect(teacherPost.title).toBe('Finals Lab Consultation Schedule');
      expect(teacherPost.isAnnouncement).toBe(true);
      expect(teacherPost.isAnonymous).toBe(false);
      expect(teacherPost.author.role).toBe('teacher');

      // Attach reaction via addReaction
      const reactionRes = await mockApiService.addReaction(teacherPostId, '🔥');
      expect(reactionRes.data.post.reactions['🔥']).toContain(teacher._id);

      // Attach share via sharePost (and verify deduplication)
      const shareRes = await mockApiService.sharePost(teacherPostId);
      expect(shareRes.data.post.shares).toContain(teacher._id);

      const secondShareRes = await mockApiService.sharePost(teacherPostId);
      expect(
        secondShareRes.data.post.shares.filter((id) => id === teacher._id)
      ).toHaveLength(1);

      // Admin creates announcement via FormData
      setActiveMockUserByRole('admin');
      const adminForm = new FormData();
      adminForm.append('title', 'CCIT Maintenance Advisory');
      adminForm.append('description', 'Scheduled network upgrade this Sunday.');
      adminForm.append('category', 'college-activities');
      adminForm.append('isAnnouncement', 'true');

      const adminRes = await mockApiService.createPost(adminForm);
      expect(adminRes.data.post.isAnnouncement).toBe(true);
      expect(adminRes.data.post.author.role).toBe('admin');

      // Student attempting announcement has isAnnouncement coerced to false
      setActiveMockUserByRole('student');
      const studentForm = new FormData();
      studentForm.append('title', 'Student Study Session');
      studentForm.append('description', 'Looking for algorithms study partners.');
      studentForm.append('category', 'general');
      studentForm.append('isAnnouncement', 'true');

      const studentRes = await mockApiService.createPost(studentForm);
      expect(studentRes.data.post.isAnnouncement).toBe(false);
    });

    it('searchPosts matches both post title and author name', async () => {
      const { mockApiService } = loadFreshMockApi();

      const byTitle = await mockApiService.searchPosts('Hackathon');
      expect(byTitle.data.length).toBeGreaterThanOrEqual(1);
      expect(
        byTitle.data.some((p) => p.title.includes('CCIT Hackathon 2026'))
      ).toBe(true);

      const byAuthor = await mockApiService.searchPosts('Prof. Ana Lim');
      expect(byAuthor.data.length).toBeGreaterThanOrEqual(1);
      expect(byAuthor.data.every((p) => p.author.name === 'Prof. Ana Lim')).toBe(true);

      const byStudentAuthor = await mockApiService.searchPosts('Juan Dela Cruz');
      expect(byStudentAuthor.data.length).toBeGreaterThanOrEqual(1);
      expect(
        byStudentAuthor.data.some((p) => p.title.includes('Capstone UI Sprint'))
      ).toBe(true);
    });

    it('getNotifications, getUnreadCount, and markAllAsRead update unread count to 0', async () => {
      const { mockApiService } = loadFreshMockApi();

      const allRes = await mockApiService.getNotifications(1, 20, false);
      expect(allRes.data.notifications).toHaveLength(4);

      const unreadBefore = await mockApiService.getUnreadCount();
      expect(unreadBefore.data.count).toBe(2);

      const markRes = await mockApiService.markAllAsRead();
      expect(markRes.data.modifiedCount).toBe(2);

      const unreadAfter = await mockApiService.getUnreadCount();
      expect(unreadAfter.data.count).toBe(0);

      const unreadListAfter = await mockApiService.getNotifications(1, 20, true);
      expect(unreadListAfter.data.notifications).toHaveLength(0);
    });

    it('getDashboard returns totalUsers, totalPosts, studentCount, teacherCount, and recentPosts', async () => {
      const { mockApiService } = loadFreshMockApi();
      const { data } = await mockApiService.getDashboard();

      expect(data.totalUsers).toBe(5);
      expect(data.totalPosts).toBe(5);
      expect(data.studentCount).toBe(2);
      expect(data.teacherCount).toBe(2);
      expect(Array.isArray(data.recentPosts)).toBe(true);
      expect(data.recentPosts).toHaveLength(5);
    });
  });

  // ==========================================================================
  // 2. ThemeContext
  // ==========================================================================
  describe('ThemeContext', () => {
    it('defaults to system, switches to dark/light, updates data-theme, and clears localStorage on system', () => {
      const ThemeProbe: React.FC = () => {
        const { theme, themeMode, setThemeMode } = useTheme();
        return (
          <div>
            <span data-testid="theme">{theme}</span>
            <span data-testid="mode">{themeMode}</span>
            <button type="button" data-testid="btn-dark" onClick={() => setThemeMode('dark')}>
              Dark
            </button>
            <button type="button" data-testid="btn-light" onClick={() => setThemeMode('light')}>
              Light
            </button>
            <button type="button" data-testid="btn-system" onClick={() => setThemeMode('system')}>
              System
            </button>
          </div>
        );
      };

      act(() => {
        root?.render(
          <ThemeProvider>
            <ThemeProbe />
          </ThemeProvider>
        );
      });

      const getThemeText = () =>
        container?.querySelector('[data-testid="theme"]')?.textContent;
      const getModeText = () =>
        container?.querySelector('[data-testid="mode"]')?.textContent;

      // Defaults to system (light when prefers-color-scheme: dark is false)
      expect(getModeText()).toBe('system');
      expect(getThemeText()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('ccit-wall-theme')).toBeNull();

      // Switch to dark
      act(() => {
        (container?.querySelector('[data-testid="btn-dark"]') as HTMLButtonElement).click();
      });
      expect(getModeText()).toBe('dark');
      expect(getThemeText()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem('ccit-wall-theme')).toBe('dark');

      // Switch to light
      act(() => {
        (container?.querySelector('[data-testid="btn-light"]') as HTMLButtonElement).click();
      });
      expect(getModeText()).toBe('light');
      expect(getThemeText()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('ccit-wall-theme')).toBe('light');

      // Return to system — clears localStorage override
      act(() => {
        (container?.querySelector('[data-testid="btn-system"]') as HTMLButtonElement).click();
      });
      expect(getModeText()).toBe('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('ccit-wall-theme')).toBeNull();

      // OS dark preference change updates resolved theme when in system mode
      act(() => {
        prefersDarkMatches = true;
        matchMediaListeners.forEach((cb) =>
          cb({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent)
        );
      });
      expect(getModeText()).toBe('system');
      expect(getThemeText()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem('ccit-wall-theme')).toBeNull();
    });
  });

  // ==========================================================================
  // 3. Redesigned Pages / Components
  // ==========================================================================
  describe('Redesigned Pages & Components', () => {
    it('LandingPage renders framed hero preview, 6 feature cards, taped #about sample card without wireframe dots, and standardized "Sign in" copy', () => {
      renderWithProviders(<LandingPage />, '/');

      // Framed hero feed preview
      const heroPreview = container?.querySelector('.hero-preview');
      expect(heroPreview).not.toBeNull();
      expect(heroPreview?.textContent).toContain('CCIT Hackathon 2026 Registration Open');
      expect(heroPreview?.textContent).toContain('Dr. Maria Santos');
      expect(heroPreview?.textContent).toContain('Active Members');

      // #features section with 6 cards
      const featureCards = container?.querySelectorAll('#features .landing-features__card');
      expect(featureCards).toHaveLength(6);

      // #about section with taped sample card and zero wireframe dots
      const aboutSection = container?.querySelector('#about');
      expect(aboutSection).not.toBeNull();
      const tapedCard = aboutSection?.querySelector('.paper.paper--taped.landing-sample-post');
      expect(tapedCard).not.toBeNull();
      expect(tapedCard?.textContent).toContain('Data Structures Finals Reviewer');
      expect(aboutSection?.querySelector('.hero-preview__dots')).toBeNull();
      expect(aboutSection?.querySelector('.landing-preview-dots')).toBeNull();
      expect(aboutSection?.querySelector('[class*="wireframe"]')).toBeNull();

      // Standardized "Sign in" copy across nav, hero, and footer
      const signInLinks = Array.from(container?.querySelectorAll('a[href="/login"]') || []);
      expect(signInLinks.length).toBeGreaterThanOrEqual(3);
      signInLinks.forEach((link) => {
        expect(link.textContent?.trim()).toBe('Sign in');
      });
      expect(container?.textContent).not.toMatch(/\bLog\s*in\b/i);
    });

    it('Register renders "Account role" label + helper text and static password checklist before focusing password input', () => {
      renderWithProviders(<Register />, '/register');

      // Account role legend & helper text
      const roleLegend = container?.querySelector('.auth-role-legend');
      expect(roleLegend?.textContent?.trim()).toBe('Account role');

      const roleHint = container?.querySelector('.auth-field__hint');
      expect(roleHint?.textContent).toContain(
        'Applies to both Google sign-up and email registration.'
      );

      // Password input is NOT focused yet
      const passwordInput = container?.querySelector(
        '#register-password'
      ) as HTMLInputElement | null;
      expect(passwordInput).not.toBeNull();
      expect(document.activeElement).not.toBe(passwordInput);

      // Password requirements checklist is statically mounted before focus (zero layout jump)
      const rulesList = container?.querySelector('#register-pw-rules');
      expect(rulesList).not.toBeNull();
      const ruleItemsBeforeFocus = container?.querySelectorAll('#register-pw-rules .pw-rule');
      expect(ruleItemsBeforeFocus).toHaveLength(5);
      expect(rulesList?.textContent).toContain('8+ characters');
      expect(rulesList?.textContent).toContain('Uppercase letter');
      expect(rulesList?.textContent).toContain('Lowercase letter');
      expect(rulesList?.textContent).toContain('Number (0-9)');
      expect(rulesList?.textContent).toContain('Special character (@$!%*?&)');

      // Focusing password input keeps exact same static rule count (no conditional mount)
      act(() => {
        passwordInput?.focus();
      });
      const ruleItemsAfterFocus = container?.querySelectorAll('#register-pw-rules .pw-rule');
      expect(ruleItemsAfterFocus).toHaveLength(5);

      // Typing a valid strong password marks all 5 requirements met and enables submit
      act(() => {
        if (passwordInput) {
          setInputValue(passwordInput, 'NuCcit@2026');
        }
      });
      const metRules = container?.querySelectorAll('#register-pw-rules .pw-rule--met');
      expect(metRules).toHaveLength(5);

      const submitBtn = container?.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement | null;
      expect(submitBtn?.disabled).toBe(false);
    });

    it('AdminDashboard renders 4 KPI cards and filters activity rows by Students/Teachers role tabs and search query', async () => {
      renderWithProviders(<AdminDashboard />, '/admin');

      await waitFor(() => {
        const kpiCards = container?.querySelectorAll('.admin-kpis .kpi-card');
        expect(kpiCards).toHaveLength(4);
        const rows = container?.querySelectorAll('.admin-table tbody tr');
        expect(rows).toHaveLength(5);
      });

      // Verify 4 KPI card labels and numbers
      const kpiText = container?.querySelector('.admin-kpis')?.textContent || '';
      expect(kpiText).toContain('Active Members');
      expect(kpiText).toContain('Total Posts');
      expect(kpiText).toContain('Students');
      expect(kpiText).toContain('Teachers');

      const tabs = Array.from(
        container?.querySelectorAll('[role="tab"]') || []
      ) as HTMLButtonElement[];
      const allTab = tabs.find((t) => t.textContent?.trim() === 'All Roles');
      const studentsTab = tabs.find((t) => t.textContent?.trim() === 'Students');
      const teachersTab = tabs.find((t) => t.textContent?.trim() === 'Teachers');

      expect(allTab).toBeDefined();
      expect(studentsTab).toBeDefined();
      expect(teachersTab).toBeDefined();

      // Filter by Students tab (3 seeded student posts)
      act(() => {
        studentsTab?.click();
      });
      const studentRows = Array.from(container?.querySelectorAll('.admin-table tbody tr') || []);
      expect(studentRows).toHaveLength(3);
      studentRows.forEach((row) => {
        expect(row.querySelector('.role-pill')?.textContent?.trim()).toBe('student');
      });

      // Filter by Teachers tab (2 seeded teacher posts)
      act(() => {
        teachersTab?.click();
      });
      const teacherRows = Array.from(container?.querySelectorAll('.admin-table tbody tr') || []);
      expect(teacherRows).toHaveLength(2);
      teacherRows.forEach((row) => {
        expect(row.querySelector('.role-pill')?.textContent?.trim()).toBe('teacher');
      });

      // Combine Teachers tab with search query "Hackathon" -> 1 row
      const searchInput = container?.querySelector(
        '.admin-search-input'
      ) as HTMLInputElement | null;
      expect(searchInput).not.toBeNull();

      act(() => {
        if (searchInput) {
          setInputValue(searchInput, 'Hackathon');
        }
      });
      const narrowedRows = Array.from(container?.querySelectorAll('.admin-table tbody tr') || []);
      expect(narrowedRows).toHaveLength(1);
      expect(narrowedRows[0].textContent).toContain('CCIT Hackathon 2026');

      // Switch back to All Roles and search by student member name "Juan" -> 1 row
      act(() => {
        allTab?.click();
        if (searchInput) {
          setInputValue(searchInput, 'Juan');
        }
      });
      const juanRows = Array.from(container?.querySelectorAll('.admin-table tbody tr') || []);
      expect(juanRows).toHaveLength(1);
      expect(juanRows[0].textContent).toContain('Juan Dela Cruz');
    });

    it('Notifications renders Today and This Week date groupings and filters Unread notifications cleanly', async () => {
      renderWithProviders(<Notifications />, '/notifications');

      await waitFor(() => {
        const groupLabels = Array.from(
          container?.querySelectorAll('.notif-group-label') || []
        ).map((el) => el.textContent?.trim());
        expect(groupLabels).toEqual(['Today', 'This Week']);
      });

      const allRows = container?.querySelectorAll('.notif-row');
      expect(allRows).toHaveLength(4);

      const unreadTab = Array.from(
        container?.querySelectorAll('[role="tab"]') || []
      ).find((el) => el.textContent?.trim().startsWith('Unread')) as HTMLButtonElement | undefined;
      expect(unreadTab).toBeDefined();
      expect(unreadTab?.textContent?.trim()).toBe('Unread (2)');

      // Switch to Unread filter
      act(() => {
        unreadTab?.click();
      });

      await waitFor(() => {
        const unreadRows = container?.querySelectorAll('.notif-row');
        expect(unreadRows).toHaveLength(2);
        const unreadHighlighted = container?.querySelectorAll('.notif-row.unread');
        expect(unreadHighlighted).toHaveLength(2);
        const visibleGroups = Array.from(
          container?.querySelectorAll('.notif-group-label') || []
        ).map((el) => el.textContent?.trim());
        expect(visibleGroups).toEqual(['Today']);
      });
    });

    it('About renders NU Manila CCIT program stamps and contains zero picsum.photos image URLs', () => {
      renderWithProviders(<About />, '/about');

      const stamps = Array.from(
        container?.querySelectorAll('.about-programs .stamp') || []
      ).map((el) => el.textContent?.trim());

      expect(stamps).toEqual([
        'BS Computer Science',
        'BS Information Technology',
        'BS Entertainment & Multimedia Computing',
      ]);

      expect(container?.textContent).toContain('National University Manila');

      const images = Array.from(container?.querySelectorAll('img') || []);
      images.forEach((img) => {
        expect(img.getAttribute('src') || '').not.toContain('picsum.photos');
      });
      expect(container?.innerHTML).not.toContain('picsum.photos');
    });
  });
});

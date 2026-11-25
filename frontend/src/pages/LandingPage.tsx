import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiBookmark,
  FiEyeOff,
  FiPaperclip,
  FiMessageSquare,
  FiBell,
  FiShield,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/LandingPage.css';

const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

const FEATURES = [
  {
    icon: FiBookmark,
    title: 'Faculty Announcements',
    description:
      'Pinned notices with Teacher badges keep exam schedules, room updates, and deadlines at the top of the feed.',
  },
  {
    icon: FiEyeOff,
    title: 'Public or Anonymous Posts',
    description:
      'Students can post under their name or switch to Anonymous for candid questions and campus feedback.',
  },
  {
    icon: FiPaperclip,
    title: 'Images & File Handouts',
    description:
      'Attach up to 4 project screenshots or downloadable course PDFs right inside any campus post.',
  },
  {
    icon: FiMessageSquare,
    title: 'Reactions & Discussions',
    description:
      'Like, react, comment, and share links to posts across College Activities, General, and Extracurricular spaces.',
  },
  {
    icon: FiBell,
    title: 'Grouped Notifications',
    description:
      "See today's and this week's post activity with one-click deep links straight into the conversation.",
  },
  {
    icon: FiShield,
    title: 'Admin Activity View',
    description:
      'Department admins monitor student and teacher posts from one filterable campus activity table.',
  },
];

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <a href="#landing-main" className="landing-skip-link">
        Skip to main content
      </a>

      {/* Sticky Navbar */}
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand">
            <img
              src={NU_SHIELD_URL}
              alt=""
              width={32}
              height={32}
              className="landing-nav__logo"
            />
            <span className="landing-nav__name">CCIT Wall</span>
          </Link>

          <nav className="landing-nav__links" aria-label="Primary">
            <a href="#features" className="landing-nav__link">
              Features
            </a>
            <a href="#about" className="landing-nav__link">
              About
            </a>
            <a href="#contact" className="landing-nav__link">
              Contact
            </a>
          </nav>

          <div className="landing-nav__actions">
            <Link to="/login" className="landing-nav__signin">
              Sign in
            </Link>
            <Link to="/register" className="landing-nav__cta">
              Get Started
            </Link>
            <div className="landing-nav__theme-toggle">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero__bg" aria-hidden="true" />

          <div className="landing-hero__container">
            <div className="landing-hero__center">
              <div className="landing-hero__crest">
                <img
                  src={NU_SHIELD_URL}
                  alt="National University Shield"
                  width={38}
                  height={38}
                  className="landing-hero__logo-img"
                />
              </div>

              <h1 id="landing-main" tabIndex={-1} className="landing-hero__title">
                Connect, share, and learn{' '}
                <span className="landing-hero__title-accent">all in one place</span>
              </h1>

              <p className="landing-hero__subtitle">
                The campus bulletin board built for National University Manila&apos;s College of
                Computing and Information Technologies.
              </p>

              <div className="landing-hero__actions">
                <Link to="/register" className="landing-hero__btn-primary">
                  Get Started Free
                </Link>
                <Link to="/login" className="landing-hero__btn-secondary">
                  Sign in
                </Link>
              </div>
            </div>

            {/* Framed Live-Style Bulletin Feed Preview */}
            <div className="hero-preview" aria-label="Preview of the CCIT Wall bulletin feed">
              <div className="hero-preview__bar">
                <div className="hero-preview__dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="hero-preview__url">ccit-wall.nu-manila.edu.ph/feed</span>
                <span className="hero-preview__campus">NU Manila CCIT</span>
              </div>

              <div className="hero-preview__grid">
                <div className="hero-preview__mini-nav" aria-hidden="true">
                  <span className="hero-preview__nav-item hero-preview__nav-item--active">
                    <i className="hero-preview__dot hero-preview__dot--all" />
                    Feed
                  </span>
                  <span className="hero-preview__nav-item">
                    <i className="hero-preview__dot hero-preview__dot--college" />
                    College Activities
                  </span>
                  <span className="hero-preview__nav-item">
                    <i className="hero-preview__dot hero-preview__dot--general" />
                    General
                  </span>
                  <span className="hero-preview__nav-item">
                    <i className="hero-preview__dot hero-preview__dot--extra" />
                    Extracurricular
                  </span>
                </div>

                <div className="paper hero-preview__announcement">
                  <div className="hero-preview__announcement-head">
                    <span className="role-pill role-pill--teacher">Teacher</span>
                    <strong className="hero-preview__author">Dr. Maria Santos</strong>
                    <span className="stamp stamp--gold hero-preview__pin">Pinned</span>
                  </div>
                  <p className="hero-preview__post-title">
                    CCIT Hackathon 2026 Registration Open
                  </p>
                  <p className="hero-preview__post-body">
                    Form teams of up to 4 members and download the mechanics PDF before Friday 5:00
                    PM.
                  </p>
                  <div className="hero-preview__post-meta">
                    <span>
                      <FaHeart size={12} aria-hidden="true" /> 28 Likes
                    </span>
                    <span>
                      <FiMessageSquare size={12} aria-hidden="true" /> 6 Comments
                    </span>
                    <span>
                      <FiPaperclip size={12} aria-hidden="true" /> Mechanics.pdf
                    </span>
                  </div>
                </div>

                <div className="paper hero-preview__members">
                  <p className="hero-preview__members-title">Active Members</p>
                  <ul className="hero-preview__members-list">
                    <li>
                      <span className="hero-preview__mini-avatar hero-preview__mini-avatar--gold" aria-hidden="true">
                        JD
                      </span>
                      <span>
                        <strong>Juan Dela Cruz</strong> &middot; Student
                      </span>
                    </li>
                    <li>
                      <span className="hero-preview__mini-avatar" aria-hidden="true">
                        MS
                      </span>
                      <span>
                        <strong>Dr. Maria Santos</strong> &middot; Teacher
                      </span>
                    </li>
                    <li>
                      <span className="hero-preview__mini-avatar hero-preview__mini-avatar--gold" aria-hidden="true">
                        PR
                      </span>
                      <span>
                        <strong>Pedro Reyes</strong> &middot; Student
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features" id="features">
          <div className="landing-section__container">
            <div className="landing-section__header">
              <h2 className="landing-section__title">Everything your campus community needs</h2>
              <p className="landing-section__subtitle">
                Built for CCIT students, teachers, and department coordinators.
              </p>
            </div>

            <div className="landing-features__grid">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="paper landing-features__card">
                    <div className="landing-features__icon" aria-hidden="true">
                      <Icon size={22} />
                    </div>
                    <h3 className="landing-features__card-title">{feature.title}</h3>
                    <p className="landing-features__card-text">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="landing-about" id="about">
          <div className="landing-section__container">
            <div className="landing-about__content">
              <div className="landing-about__text">
                <h2 className="landing-section__title">Built for CCIT, by CCIT</h2>
                <p className="landing-about__description">
                  Whether you are a student organizing a Data Structures study group or a professor
                  posting lab handouts, CCIT Wall puts campus updates in one searchable bulletin
                  board.
                </p>

                <div className="landing-about__stats">
                  <div className="landing-about__stat">
                    <strong className="landing-about__stat-value">CCIT</strong>
                    <span className="landing-about__stat-label">Department</span>
                  </div>
                  <div className="landing-about__stat">
                    <strong className="landing-about__stat-value">NU</strong>
                    <span className="landing-about__stat-label">Manila</span>
                  </div>
                  <div className="landing-about__stat">
                    <strong className="landing-about__stat-value">CS &amp; IT</strong>
                    <span className="landing-about__stat-label">Programs</span>
                  </div>
                </div>
              </div>

              <div className="landing-about__visual">
                <article className="paper paper--taped landing-sample-post">
                  <div className="landing-sample-post__head">
                    <span className="landing-sample-post__avatar" aria-hidden="true">
                      PR
                    </span>
                    <div className="landing-sample-post__author-meta">
                      <strong className="landing-sample-post__author">Pedro Reyes</strong>
                      <span className="landing-sample-post__time">2h ago &middot; General</span>
                    </div>
                    <span className="stamp stamp--blue landing-sample-post__stamp">
                      Study Group
                    </span>
                  </div>

                  <h3 className="landing-sample-post__title">Data Structures Finals Reviewer</h3>
                  <p className="landing-sample-post__body">
                    Meeting at Library 3F this Thursday at 2 PM. Attached our tree traversal notes
                    PDF below so everyone can review ahead of time.
                  </p>

                  <div className="landing-sample-post__footer">
                    <span>
                      <FaHeart size={13} aria-hidden="true" /> 18 Likes
                    </span>
                    <span>
                      <FiMessageSquare size={13} aria-hidden="true" /> 6 Comments
                    </span>
                    <span>
                      <FiPaperclip size={13} aria-hidden="true" /> 1 PDF attached
                    </span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* Contact / CTA Band */}
        <section className="landing-cta" id="contact">
          <div className="landing-section__container">
            <div className="landing-cta__content">
              <h2 className="landing-cta__title">Ready to join your campus community?</h2>
              <p className="landing-cta__text">
                Sign up with your NU account and start posting updates, study notes, and campus
                announcements.
              </p>

              <div className="landing-cta__actions">
                <Link to="/register" className="landing-cta__btn">
                  Create Free Account
                </Link>
              </div>

              <div className="landing-cta__contact">
                <p>National University Manila &middot; 551 M.F. Jhocson Street, Sampaloc, Manila</p>
                <p>
                  <a href="mailto:ccit@nu-manila.edu.ph" className="landing-cta__link">
                    ccit@nu-manila.edu.ph
                  </a>{' '}
                  &middot;{' '}
                  <a href="tel:+6328712000" className="landing-cta__link">
                    (02) 8712-0000
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <img
              src={NU_SHIELD_URL}
              alt=""
              width={24}
              height={24}
              className="landing-footer__logo"
            />
            <span className="landing-footer__name">CCIT Wall</span>
          </div>

          <nav className="landing-footer__links" aria-label="Footer">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create Account</Link>
            <a href="https://www.national-u.edu.ph/" target="_blank" rel="noopener noreferrer">
              NU Website
            </a>
          </nav>

          <p className="landing-footer__copy">
            &copy; {new Date().getFullYear()} National University Manila &mdash; College of
            Computing and Information Technologies
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

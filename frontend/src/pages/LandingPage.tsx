import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiShare2, FiBookOpen, FiMessageSquare, FiBell, FiImage } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Floating Theme Toggle */}
      <div className="landing-theme-toggle">
        <ThemeToggle />
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg"
              alt="NU Logo"
              className="landing-nav__logo"
            />
            <span className="landing-nav__name">CCIT Wall</span>
          </Link>
          <div className="landing-nav__links">
            <a href="#features" className="landing-nav__link">Features</a>
            <a href="#about" className="landing-nav__link">About</a>
            <a href="#contact" className="landing-nav__link">Contact</a>
          </div>
          <div className="landing-nav__actions">
            <Link to="/login" className="landing-nav__signin">Sign in</Link>
            <Link to="/register" className="landing-nav__cta">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />

        {/* Floating feature cards */}
        <div className="landing-hero__card landing-hero__card--left-top">
          <div className="landing-hero__card-icon landing-hero__card-icon--gold">
            <FiShare2 size={18} />
          </div>
          <div className="landing-hero__card-content">
            <p className="landing-hero__card-title">Share Ideas</p>
            <p className="landing-hero__card-text">Post announcements, share resources, and collaborate with your classmates.</p>
          </div>
        </div>

        <div className="landing-hero__card landing-hero__card--right-top">
          <div className="landing-hero__card-header">
            <span className="landing-hero__card-badge">Notifications</span>
          </div>
          <div className="landing-hero__card-list">
            <div className="landing-hero__card-list-item">
              <FiBell size={14} />
              <span>New comment on your post</span>
            </div>
            <div className="landing-hero__card-list-item">
              <FiBell size={14} />
              <span>Prof. Santos liked your project</span>
            </div>
          </div>
        </div>

        {/* Main hero content */}
        <div className="landing-hero__center">
          <div className="landing-hero__logo-badge">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg"
              alt="NU Logo"
              className="landing-hero__logo-img"
            />
          </div>
          <h1 className="landing-hero__title">
            Connect, share, and learn
            <span className="landing-hero__title-accent"> all in one place</span>
          </h1>
          <p className="landing-hero__subtitle">
            The social platform built for NU Manila's College of Computing 
            and Information Technologies community.
          </p>
          <div className="landing-hero__actions">
            <Link to="/register" className="landing-hero__btn-primary">
              Get Started Free
            </Link>
            <Link to="/login" className="landing-hero__btn-secondary">
              Sign In
            </Link>
          </div>
        </div>

        {/* Bottom floating cards */}
        <div className="landing-hero__card landing-hero__card--left-bottom">
          <div className="landing-hero__card-header">
            <span className="landing-hero__card-badge">Recent Posts</span>
          </div>
          <div className="landing-hero__card-list">
            <div className="landing-hero__card-list-item">
              <div className="landing-hero__card-avatar">JS</div>
              <div>
                <p className="landing-hero__card-item-title">Web Dev Tips</p>
                <p className="landing-hero__card-item-meta">Juan S. &middot; 2h ago</p>
              </div>
              <span className="landing-hero__card-stat">12 likes</span>
            </div>
            <div className="landing-hero__card-list-item">
              <div className="landing-hero__card-avatar">MR</div>
              <div>
                <p className="landing-hero__card-item-title">Study Group for Finals</p>
                <p className="landing-hero__card-item-meta">Maria R. &middot; 5h ago</p>
              </div>
              <span className="landing-hero__card-stat">8 likes</span>
            </div>
          </div>
        </div>

        <div className="landing-hero__card landing-hero__card--right-bottom">
          <div className="landing-hero__card-icon landing-hero__card-icon--blue">
            <FiImage size={18} />
          </div>
          <div className="landing-hero__card-content">
            <p className="landing-hero__card-title">Media Sharing</p>
            <p className="landing-hero__card-text">Upload images, share files, and showcase your projects.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="features">
        <div className="landing-section__container">
          <div className="landing-section__header">
            <h2 className="landing-section__title">Everything your campus community needs</h2>
            <p className="landing-section__subtitle">
              A platform designed specifically for CCIT students and faculty to connect, 
              collaborate, and stay informed.
            </p>
          </div>
          <div className="landing-features__grid">
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiUsers size={24} />
              </div>
              <h3 className="landing-features__card-title">Community Feed</h3>
              <p className="landing-features__card-text">
                Stay updated with posts from classmates and professors. React, comment, and engage 
                with your campus community in real-time.
              </p>
            </div>
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiShare2 size={24} />
              </div>
              <h3 className="landing-features__card-title">Share & Collaborate</h3>
              <p className="landing-features__card-text">
                Post announcements, share study resources, ask questions, and collaborate on 
                projects with fellow CCIT students.
              </p>
            </div>
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiBookOpen size={24} />
              </div>
              <h3 className="landing-features__card-title">Academic Resources</h3>
              <p className="landing-features__card-text">
                Access shared notes, tutorials, and learning materials uploaded by the community 
                to help you succeed in your studies.
              </p>
            </div>
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiMessageSquare size={24} />
              </div>
              <h3 className="landing-features__card-title">Discussions</h3>
              <p className="landing-features__card-text">
                Engage in threaded conversations, get answers to your questions, and participate 
                in meaningful academic discussions.
              </p>
            </div>
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiBell size={24} />
              </div>
              <h3 className="landing-features__card-title">Smart Notifications</h3>
              <p className="landing-features__card-text">
                Never miss an important update. Get notified about comments, likes, and mentions 
                from your CCIT community.
              </p>
            </div>
            <div className="landing-features__card">
              <div className="landing-features__icon">
                <FiImage size={24} />
              </div>
              <h3 className="landing-features__card-title">Media Support</h3>
              <p className="landing-features__card-text">
                Share images, screenshots, and visual content. Showcase your projects and creative 
                work with the community.
              </p>
            </div>
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
                CCIT Wall is the dedicated social platform for the College of Computing and Information 
                Technologies at National University Manila. Whether you're a student looking for study 
                groups or a professor sharing important announcements, CCIT Wall brings our community together.
              </p>
              <div className="landing-about__stats">
                <div className="landing-about__stat">
                  <span className="landing-about__stat-value">CCIT</span>
                  <span className="landing-about__stat-label">Department</span>
                </div>
                <div className="landing-about__stat">
                  <span className="landing-about__stat-value">NU</span>
                  <span className="landing-about__stat-label">Manila</span>
                </div>
                <div className="landing-about__stat">
                  <span className="landing-about__stat-value">CS &amp; IT</span>
                  <span className="landing-about__stat-label">Programs</span>
                </div>
              </div>
            </div>
            <div className="landing-about__visual">
              <div className="landing-about__visual-card">
                <div className="landing-about__visual-header">
                  <div className="landing-about__visual-dots">
                    <span /><span /><span />
                  </div>
                </div>
                <div className="landing-about__visual-body">
                  <div className="landing-about__visual-post">
                    <div className="landing-about__visual-avatar">P</div>
                    <div className="landing-about__visual-post-content">
                      <div className="landing-about__visual-line landing-about__visual-line--short" />
                      <div className="landing-about__visual-line" />
                      <div className="landing-about__visual-line landing-about__visual-line--medium" />
                    </div>
                  </div>
                  <div className="landing-about__visual-actions">
                    <div className="landing-about__visual-btn" />
                    <div className="landing-about__visual-btn" />
                    <div className="landing-about__visual-btn" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section className="landing-cta" id="contact">
        <div className="landing-section__container">
          <div className="landing-cta__content">
            <h2 className="landing-cta__title">Ready to join your campus community?</h2>
            <p className="landing-cta__text">
              Sign up today and start connecting with fellow CCIT students and faculty.
            </p>
            <div className="landing-cta__actions">
              <Link to="/register" className="landing-cta__btn">
                Create Free Account
              </Link>
            </div>
            <div className="landing-cta__contact">
              <p>
                National University Manila &middot; 551 M.F. Jhocson Street, Sampaloc, Manila
              </p>
              <p>
                <a href="mailto:ccit@nu-manila.edu.ph">ccit@nu-manila.edu.ph</a>
                {' '}&middot;{' '}
                <a href="tel:+6328712000">(02) 8712-0000</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg"
              alt="NU Logo"
              className="landing-footer__logo"
            />
            <span className="landing-footer__name">CCIT Wall</span>
          </div>
          <div className="landing-footer__links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Account</Link>
            <a href="https://www.national-u.edu.ph/" target="_blank" rel="noopener noreferrer">NU Website</a>
          </div>
          <p className="landing-footer__copy">
            &copy; {new Date().getFullYear()} National University Manila &mdash; College of Computing and Information Technologies
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

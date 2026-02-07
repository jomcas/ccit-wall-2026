import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiShare2, FiBookOpen, FiMapPin, FiLogIn, FiUserPlus } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Floating Theme Toggle */}
      <div className="landing-theme-toggle">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-logo">
            {/* <span className="hero-logo-text">NU</span> */}
            <img rel="icon" style={{width: "110px", height: "110px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" alt="NU Logo" />
          </div>
          <h1 className="hero-title">CCIT Wall</h1>
          <p className="hero-subtitle">College of Computing and Information Technologies</p>
          <p className="hero-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="hero-btn hero-btn-primary">
              <FiLogIn size={20} /> Sign In
            </Link>
            <Link to="/register" className="hero-btn hero-btn-secondary">
              <FiUserPlus size={20} /> Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">About CCIT Wall</h2>
            <p className="section-subtitle">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor 
              in reprehenderit in voluptate velit esse cillum dolore.
            </p>
          </div>
          <div className="about-content">
            <div className="about-image">
              <img 
                src="https://picsum.photos/800/600?random=2" 
                alt="Students collaborating"
              />
            </div>
            <div className="about-text">
              <h3>Connect with Your Community</h3>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
                culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
                aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Platform Features</h2>
            <p className="section-subtitle">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Discover what makes 
              CCIT Wall the perfect platform for our community.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FiUsers />
              </div>
              <h3>Connect</h3>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiShare2 />
              </div>
              <h3>Share</h3>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiBookOpen />
              </div>
              <h3>Learn</h3>
              <p>
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
                deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Campus Life</h2>
            <p className="section-subtitle">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Experience the vibrant 
              community at National University.
            </p>
          </div>
          <div className="gallery-grid">
            <div className="gallery-item">
              <img src="https://picsum.photos/800/800?random=3" alt="Campus life 1" />
            </div>
            <div className="gallery-item">
              <img src="https://picsum.photos/400/400?random=4" alt="Campus life 2" />
            </div>
            <div className="gallery-item">
              <img src="https://picsum.photos/400/400?random=5" alt="Campus life 3" />
            </div>
            <div className="gallery-item">
              <img src="https://picsum.photos/400/400?random=6" alt="Campus life 4" />
            </div>
            <div className="gallery-item">
              <img src="https://picsum.photos/400/400?random=7" alt="Campus life 5" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Contact Information</h2>
            <p className="section-subtitle">
              Get in touch with National University Manila and the College of Computing 
              and Information Technologies.
            </p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <h3>
                <span className="icon"><FiMapPin /></span>
                National University Manila
              </h3>
              <div className="contact-info">
                <div className="contact-item">
                  <span className="label">Address:</span>
                  <span className="value">
                    551 M.F. Jhocson Street, Sampaloc,<br />
                    Manila, 1008 Metro Manila, Philippines
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Phone:</span>
                  <span className="value">
                    <a href="tel:+6328712000">(02) 8712-0000</a>
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Email:</span>
                  <span className="value">
                    <a href="mailto:info@nu-manila.edu.ph">info@nu-manila.edu.ph</a>
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Website:</span>
                  <span className="value">
                    <a href="https://www.nu-manila.edu.ph" target="_blank" rel="noopener noreferrer">
                      www.nu-manila.edu.ph
                    </a>
                  </span>
                </div>
              </div>
            </div>
            <div className="contact-card">
              <h3>
                <span className="icon"><FiBookOpen /></span>
                CCIT Department
              </h3>
              <div className="contact-info">
                <div className="contact-item">
                  <span className="label">Office:</span>
                  <span className="value">
                    College of Computing and Information Technologies,<br />
                    National University Manila Campus
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Phone:</span>
                  <span className="value">
                    <a href="tel:+6328712000">(02) 8712-0000 loc. 1234</a>
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Email:</span>
                  <span className="value">
                    <a href="mailto:ccit@nu-manila.edu.ph">ccit@nu-manila.edu.ph</a>
                  </span>
                </div>
                <div className="contact-item">
                  <span className="label">Programs:</span>
                  <span className="value">
                    BS Computer Science, BS Information Technology
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>NU Manila - CCIT Wall</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
              incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
              <li><Link to="/forgot-password">Forgot Password</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://www.national-u.edu.ph/" target="_blank" rel="noopener noreferrer">NU Website</a></li>
              <li><a href="#about">About CCIT</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} National University Manila - College of Computing and Information Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

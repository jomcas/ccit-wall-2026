import React from 'react';
import { FiUsers, FiShare2, FiZap, FiBookOpen, FiMapPin } from 'react-icons/fi';

const About: React.FC = () => {
  return (
    <div className="about-page">
      {/* Intro Section */}
      <div className="card about-intro">
        <div className="about-intro-content">
          <div className="about-logo">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" 
              alt="NU Logo" 
              className="about-logo-img"
            />
          </div>
          <div className="about-intro-text">
            <h1 className="page-title">About CCIT Wall</h1>
            <p className="page-subtitle">College of Computing and Information Technologies</p>
            <p className="about-description">
              CCIT Wall is the official bulletin board platform for the College of Computing
              and Information Technologies at National University Manila. It's a dedicated
              space where students, faculty, and staff can share announcements, collaborate on
              projects, and stay connected with everything happening in the CCIT community.
            </p>
          </div>
        </div>
      </div>

      {/* About Community Section */}
      <div className="card about-community">
        <h2 className="section-title">Connect with Your Community</h2>
        <div className="about-community-grid">
          <div className="about-community-image">
            <img 
              src="https://picsum.photos/800/600?random=2" 
              alt="Students collaborating"
            />
          </div>
          <div className="about-community-text">
            <p>
              The College of Computing and Information Technologies is home to a vibrant
              community of future tech professionals. CCIT Wall brings that community online —
              giving every member a voice and a place to share what matters to them.
            </p>
            <p>
              Whether you're posting about an upcoming hackathon, sharing internship
              opportunities, looking for project collaborators, or celebrating a classmate's
              achievement, this is your platform. Posts are organized by category so it's easy
              to find what's relevant to you.
            </p>
            <p>
              All members of the NU Manila CCIT community — students, faculty, and staff —
              are welcome. Sign in with your institutional account to get started.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="card">
        <h2 className="section-title">Platform Features</h2>
        <p className="about-section-subtitle">
          Everything you need to stay informed and engaged with the CCIT community,
          all in one place.
        </p>
        <div className="about-features-grid">
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <FiUsers />
            </div>
            <h3>Connect</h3>
            <p>
              Follow fellow students, faculty, and staff. Browse community member profiles
              and see what others in the CCIT college are working on.
            </p>
          </div>
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <FiShare2 />
            </div>
            <h3>Share</h3>
            <p>
              Post announcements, events, opportunities, and updates. Attach images,
              pick a category, and choose a style that fits your message.
            </p>
          </div>
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <FiZap />
            </div>
            <h3>Engage</h3>
            <p>
              Like, react to, and comment on posts. Stay in the loop with real-time
              notifications whenever someone interacts with your content.
            </p>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="card">
        <h2 className="section-title">Campus Life</h2>
        <p className="about-section-subtitle">
          A glimpse of student life at National University Manila's College of Computing
          and Information Technologies.
        </p>
        <div className="about-gallery-grid">
          <div className="about-gallery-item about-gallery-item-large">
            <img src="https://picsum.photos/800/800?random=3" alt="Campus life 1" />
          </div>
          <div className="about-gallery-item">
            <img src="https://picsum.photos/400/400?random=4" alt="Campus life 2" />
          </div>
          <div className="about-gallery-item">
            <img src="https://picsum.photos/400/400?random=5" alt="Campus life 3" />
          </div>
          <div className="about-gallery-item">
            <img src="https://picsum.photos/400/400?random=6" alt="Campus life 4" />
          </div>
          <div className="about-gallery-item">
            <img src="https://picsum.photos/400/400?random=7" alt="Campus life 5" />
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="card">
        <h2 className="section-title">Contact Information</h2>
        <p className="about-section-subtitle">
          Get in touch with National University Manila and the College of Computing 
          and Information Technologies.
        </p>
        <div className="about-contact-grid">
          <div className="about-contact-card">
            <h3>
              <span className="about-contact-icon"><FiMapPin /></span>
              National University Manila
            </h3>
            <div className="about-contact-info">
              <div className="about-contact-item">
                <span className="about-contact-label">Address:</span>
                <span className="about-contact-value">
                  551 M.F. Jhocson Street, Sampaloc,<br />
                  Manila, 1008 Metro Manila, Philippines
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Phone:</span>
                <span className="about-contact-value">
                  <a href="tel:+6328712000">(02) 8712-0000</a>
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Email:</span>
                <span className="about-contact-value">
                  <a href="mailto:info@nu-manila.edu.ph">info@nu-manila.edu.ph</a>
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Website:</span>
                <span className="about-contact-value">
                  <a href="https://www.nu-manila.edu.ph" target="_blank" rel="noopener noreferrer">
                    www.nu-manila.edu.ph
                  </a>
                </span>
              </div>
            </div>
          </div>
          <div className="about-contact-card">
            <h3>
              <span className="about-contact-icon"><FiBookOpen /></span>
              CCIT Department
            </h3>
            <div className="about-contact-info">
              <div className="about-contact-item">
                <span className="about-contact-label">Office:</span>
                <span className="about-contact-value">
                  College of Computing and Information Technologies,<br />
                  National University Manila Campus
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Phone:</span>
                <span className="about-contact-value">
                  <a href="tel:+6328712000">(02) 8712-0000 loc. 1234</a>
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Email:</span>
                <span className="about-contact-value">
                  <a href="mailto:ccit@nu-manila.edu.ph">ccit@nu-manila.edu.ph</a>
                </span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Programs:</span>
                <span className="about-contact-value">
                  BS Computer Science, BS Information Technology,
                  BS Entertainment and Multimedia Computing
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

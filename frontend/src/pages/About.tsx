import React from 'react';
import { FiMapPin, FiBookOpen, FiShield } from 'react-icons/fi';

const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

const About: React.FC = () => {
  return (
    <section className="about-page-redesign" aria-label="About CCIT Wall">
      {/* Card 1: Platform Identity & Programs */}
      <article className="paper paper--taped about-hero-card">
        <div className="about-hero-lockup">
          <img
            src={NU_SHIELD_URL}
            alt="National University Shield"
            className="about-hero-logo"
          />
          <div>
            <h1 className="about-hero-title">About CCIT Wall</h1>
            <p className="about-hero-sub">
              College of Computing and Information Technologies · National University Manila
            </p>
          </div>
        </div>

        <p className="about-hero-overview">
          CCIT Wall is the dedicated campus bulletin board for National University Manila
          CCIT students, faculty, and staff. Teachers publish pinned faculty announcements,
          lab schedules, and course reminders, while students share public or anonymous posts
          covering college activities, study groups, project showcases, and extracurricular
          events.
        </p>

        <div className="about-programs" aria-label="CCIT degree programs">
          <span className="stamp stamp--blue">BS Computer Science</span>
          <span className="stamp stamp--blue">BS Information Technology</span>
          <span className="stamp stamp--gold">
            BS Entertainment &amp; Multimedia Computing
          </span>
        </div>
      </article>

      {/* Card 2: Institutional Directory & Campus Posting Guidelines */}
      <article className="paper about-info-card">
        <div className="about-contact-grid">
          <div className="about-contact-col">
            <h2 className="about-contact-heading">
              <FiMapPin size={17} aria-hidden="true" />
              National University Manila
            </h2>
            <dl className="about-contact-list">
              <div className="about-contact-row">
                <dt>Address</dt>
                <dd>551 M.F. Jhocson Street, Sampaloc, Manila, 1008 Metro Manila</dd>
              </div>
              <div className="about-contact-row">
                <dt>Phone</dt>
                <dd>
                  <a href="tel:+6328712000">(02) 8712-0000</a>
                </dd>
              </div>
              <div className="about-contact-row">
                <dt>Email</dt>
                <dd>
                  <a href="mailto:info@nu-manila.edu.ph">info@nu-manila.edu.ph</a>
                </dd>
              </div>
              <div className="about-contact-row">
                <dt>Website</dt>
                <dd>
                  <a
                    href="https://www.nu-manila.edu.ph"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    www.nu-manila.edu.ph
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="about-contact-col">
            <h2 className="about-contact-heading">
              <FiBookOpen size={17} aria-hidden="true" />
              CCIT Department Office
            </h2>
            <dl className="about-contact-list">
              <div className="about-contact-row">
                <dt>Office</dt>
                <dd>
                  College of Computing and Information Technologies, NU Manila Campus
                </dd>
              </div>
              <div className="about-contact-row">
                <dt>Phone</dt>
                <dd>
                  <a href="tel:+6328712000">(02) 8712-0000 loc. 1234</a>
                </dd>
              </div>
              <div className="about-contact-row">
                <dt>Email</dt>
                <dd>
                  <a href="mailto:ccit@nu-manila.edu.ph">ccit@nu-manila.edu.ph</a>
                </dd>
              </div>
              <div className="about-contact-row">
                <dt>Hours</dt>
                <dd>Mon–Sat, 8:00 AM – 5:00 PM</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="about-guidelines">
          <h3 className="about-guidelines-heading">
            <FiShield size={16} aria-hidden="true" />
            Campus Posting Guidelines
          </h3>
          <ul className="about-guidelines-list">
            <li>
              Keep discussions respectful, constructive, and aligned with National University
              Manila community standards.
            </li>
            <li>
              Use the appropriate category (College Activities, General, or Extracurricular)
              so announcements and study updates stay easy to find.
            </li>
            <li>
              Anonymous posting is intended for candid student questions and constructive
              feedback; department administrators retain moderation oversight.
            </li>
          </ul>
        </div>
      </article>
    </section>
  );
};

export default About;

import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const InstagramIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToAbout = (e) => {
    e.preventDefault();
    const el = document.getElementById('about');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="about" className="grand-footer">
      <div className="grand-footer-container">
        {/* Column 1: About */}
        <div className="footer-col">
          <h3 className="footer-heading">About</h3>
          <p className="footer-about-text">
            At Elite Electronics, we specialize in high-quality speakers, LED lighting, soldering irons, digital multimeters, torches, and electronic hardware essentials. We curate only reliable, high-performance equipment.
          </p>
          <div className="footer-social-section">
            <a
              href="https://www.instagram.com/elite.electronicss?fqnt=bXN4bzZ2dDExZGZw"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-insta-btn"
            >
              <InstagramIcon size={18} />
              <span>Follow on Instagram</span>
            </a>
          </div>
        </div>

        {/* Column 2: Menu */}
        <div className="footer-col">
          <h3 className="footer-heading">Menu</h3>
          <ul className="footer-links">
            <li>
              <Link to="/" onClick={scrollToTop}>Home</Link>
            </li>
            <li>
              <a href="#about" onClick={scrollToAbout}>About Us</a>
            </li>
            <li>
              <Link to="/?q=Speakers">Speakers</Link>
            </li>
            <li>
              <Link to="/?q=LED">LED Lights</Link>
            </li>
            <li>
              <a href="#contact">Contact Us</a>
            </li>
          </ul>
        </div>

        {/* Column 3: Useful Link */}
        <div className="footer-col">
          <h3 className="footer-heading">Useful Link</h3>
          <ul className="footer-links">
            <li>
              <Link to="/?q=Soldering">Soldering Irons</Link>
            </li>
            <li>
              <Link to="/?q=Multimeter">Digital Multimeters</Link>
            </li>
            <li>
              <Link to="/?q=Torch">Torches & Flashlights</Link>
            </li>
            <li>
              <Link to="/?q=Components">Electronic Parts</Link>
            </li>
            <li>
              <a href="https://wa.me/9447210273" target="_blank" rel="noopener noreferrer">
                WhatsApp Orders
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact Us */}
        <div className="footer-col" id="contact">
          <h3 className="footer-heading">Contact Us</h3>
          <ul className="footer-contact-info">
            <li>
              <strong>Address :</strong>{' '}
              <a
                href="https://maps.app.goo.gl/sLi53dJKGJi6Lhw66?g_st=ic"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-map-address-link"
                title="View Elite Electronics on Google Maps"
              >
                <span>Ground Floor, Star Complex, Main Rd, Narikkuni, Kerala 673585</span>
                <span className="footer-map-pill">
                  <MapPin size={13} /> View on Google Maps
                </span>
              </a>
            </li>
            <li>
              <strong>Call :</strong> +91 09995919794
            </li>
            <li>
              <strong>Email :</strong> eliteelectronics@gmail.com
            </li>
            <li>
              <strong>Instagram :</strong>{' '}
              <a
                href="https://www.instagram.com/elite.electronicss?fqnt=bXN4bzZ2dDExZGZw"
                target="_blank"
                rel="noopener noreferrer"
                className="insta-text-link"
              >
                @elite.electronicss
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p>&copy; {currentYear} Elite Electronics. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
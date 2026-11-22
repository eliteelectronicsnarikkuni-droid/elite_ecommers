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

const WhatsAppIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
          <div className="footer-logo-wrap">
            <img src="/logo.png" alt="Elite Electronics" className="footer-logo-image" />
          </div>
          <p className="footer-about-text">
            At Elite Electronics, we specialize in high-quality speakers, LED lighting, soldering irons, digital multimeters, torches, and electronic hardware essentials. We curate only reliable, high-performance equipment.
          </p>
          <div className="footer-social-section">
            <div className="footer-social-buttons">
              <a
                href="https://www.instagram.com/elite.electronicss?fqnt=bXN4bzZ2dDExZGZw"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn footer-insta-btn"
                aria-label="Elite Electronics Instagram"
                title="Follow Elite Electronics on Instagram"
              >
                <InstagramIcon size={18} />
                <span>Instagram</span>
              </a>
              <a
                href="https://wa.me/919447210273"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn footer-whatsapp-btn"
                aria-label="Elite Electronics WhatsApp"
                title="Chat with Elite Electronics on WhatsApp"
              >
                <WhatsAppIcon size={18} />
                <span>WhatsApp</span>
              </a>
            </div>
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
              <a href="https://wa.me/919447210273" target="_blank" rel="noopener noreferrer">
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
              <strong>WhatsApp :</strong>{' '}
              <a
                href="https://wa.me/919447210273"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-text-link"
              >
                <WhatsAppIcon size={14} /> +91 9447210273
              </a>
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
                <InstagramIcon size={14} /> @elite.electronicss
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
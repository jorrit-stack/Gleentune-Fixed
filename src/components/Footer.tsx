import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-amber-900 to-orange-900 text-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-3 [&_svg]:opacity-90 [&_span]:text-amber-50">
              <Logo showSlogan={true} />
            </div>
            <p className="text-amber-200 text-sm mt-4">
              Explore live AM, FM & shortwave radio from around the world.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-amber-200 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-amber-200 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-amber-200 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-amber-200 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-amber-200 hover:text-white transition-colors">
                  Privacy & Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-amber-700 mt-8 pt-6 text-center text-sm text-amber-200">
          <p>&copy; {currentYear} Gleetune. All rights reserved.</p>
          <p className="mt-2 text-amber-300 text-xs">
            <strong>Privacy:</strong> Zero tracking, zero cookies, zero personal data collection.
          </p>
          <p className="mt-2 text-amber-300">
            Questions or feedback?{' '}
            <a href="mailto:contact@gleetune.com" className="text-amber-100 hover:text-white underline transition-colors">
              contact@gleetune.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

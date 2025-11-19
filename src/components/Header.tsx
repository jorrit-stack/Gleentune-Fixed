import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

export default function Header() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-amber-800 text-white'
        : 'text-amber-900 hover:bg-amber-200'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-100 to-orange-100 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <Logo showSlogan={true} />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link to="/" className={linkClass('/')}>
              Home
            </Link>
            <Link to="/blog" className={linkClass('/blog')}>
              Blog
            </Link>
            <Link to="/about" className={linkClass('/about')}>
              About
            </Link>
            <Link to="/how-it-works" className={linkClass('/how-it-works')}>
              How It Works
            </Link>
            <Link to="/contact" className={linkClass('/contact')}>
              Contact
            </Link>
          </div>

          <div className="md:hidden">
            <button className="text-amber-900 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

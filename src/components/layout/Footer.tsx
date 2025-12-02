import { Link } from "react-router-dom";
import { Home, MapPin, Phone, Mail, Facebook, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-trust text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground">
                <Home className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold leading-tight">
                  Cedar City
                </span>
                <span className="text-xs font-medium opacity-80 -mt-0.5">
                  Roofing Guide
                </span>
              </div>
            </Link>
            <p className="text-sm opacity-80 leading-relaxed">
              Your trusted resource for finding verified, top-rated roofing companies in Cedar City, Utah. Helping homeowners make informed decisions since 2024.
            </p>
            <div className="flex gap-4">
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Top 5 Roofers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Roofing Blog
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  About Our Guide
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/blog/roof-damage-storm" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Storm Damage Guide
                </Link>
              </li>
              <li>
                <Link to="/blog/roofing-materials" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Roofing Materials
                </Link>
              </li>
              <li>
                <Link to="/blog/roof-repair-cost" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  Cost Estimates
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 opacity-80 shrink-0" />
                <span className="text-sm opacity-80">
                  123 Main Street<br />
                  Cedar City, UT 84720
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 opacity-80 shrink-0" />
                <a href="tel:+14355551234" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  (435) 555-1234
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 opacity-80 shrink-0" />
                <a href="mailto:info@cedarcityroofers.com" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                  info@cedarcityroofers.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm opacity-70">
              © {currentYear} Cedar City Roofing Guide. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

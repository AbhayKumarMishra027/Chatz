import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ className = '' }) {
  return <Link className={['brand', className].filter(Boolean).join(' ')} to="/" aria-label="Chatz home">
    <span className="brand-mark" aria-hidden="true"><MessageCircle className="brand-mark-icon" size={19} fill="currentColor" /><i className="brand-mark-gold-dot" /></span>
    <span className="brand-wordmark">chatz.</span>
  </Link>;
}

import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Login' },
  { to: '/signup', label: 'Sign up' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/today', label: 'Today' },
  { to: '/history', label: 'History' },
  { to: '/foods', label: 'Foods' },
  { to: '/meals', label: 'Meals' },
  { to: '/profile', label: 'Profile' },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Macro</div>
      <ul className="navbar-links">
        {links.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} end={l.to === '/'}>
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Placeholder from './pages/Placeholder';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Placeholder name="Login" />} />
          <Route path="/signup" element={<Placeholder name="Sign up" />} />
          <Route path="/onboarding" element={<Placeholder name="Onboarding" />} />
          <Route path="/today" element={<Placeholder name="Today" />} />
          <Route path="/history" element={<Placeholder name="History" />} />
          <Route path="/foods" element={<Placeholder name="Foods" />} />
          <Route path="/meals" element={<Placeholder name="Meals" />} />
          <Route path="/profile" element={<Placeholder name="Profile" />} />
        </Routes>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ADJECTIVES } from './data/constants';
import { PROJECTS } from './data/projects';
import { ProjectCard } from './components/ProjectCard';
import { SkillsCard } from './components/SkillsCard';

export default function App() {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = window.localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [word, setWord] = useState(ADJECTIVES[0]);
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutsRef = useRef([]);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    const flipDuration = 600;
    const intervalDuration = 2000;

    const registerTimeout = (callback, delay) => {
      const timeoutId = setTimeout(() => {
        callback();
        timeoutsRef.current = timeoutsRef.current.filter((id) => id !== timeoutId);
      }, delay);

      timeoutsRef.current.push(timeoutId);
    };

    const flipWord = () => {
      setIsFlipping(true);

      registerTimeout(() => {
        wordIndexRef.current = (wordIndexRef.current + 1) % ADJECTIVES.length;
        setWord(ADJECTIVES[wordIndexRef.current]);
      }, flipDuration / 2);

      registerTimeout(() => {
        setIsFlipping(false);
      }, flipDuration);
    };

    const intervalId = setInterval(flipWord, intervalDuration);

    return () => {
      clearInterval(intervalId);
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <>
      <header className="container">
        <nav className="navbar navbar-expand-sm navbar-light bg-light w-100" aria-label="Primary navigation">
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#navbarNavAltMarkup"
            aria-controls="navbarNavAltMarkup"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
            <div className="navbar-nav mr-auto mt-1 mt-lg-0">
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); toast('Coming soon', { icon: '🚀' }); }}>
                Home
              </a>
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); toast('Coming soon', { icon: '🚀' }); }}>
                About
              </a>
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); toast('Coming soon', { icon: '🚀' }); }}>
                Portfolio
              </a>
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); toast('Coming soon', { icon: '🚀' }); }}>
                Contact
              </a>
            </div>
            <button
              type="button"
              className="btn btn-sm theme-toggle"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
            >
              <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`} aria-hidden="true"></i>{' '}
              {theme === 'dark' ? 'Light' : 'Dark'} mode
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section id="intro" className="container">
          <div className="row">
            <div className="col-12 col-md-6 text-center">
              <img
                src="https://placehold.co/400x400?text=Your+Photo"
                alt="Placeholder portrait"
                className="img-fluid"
              />
            </div>

            <div className="col-12 col-md-6" id="introLines">
              <h4 className="subtitle">Hello there, I'm</h4>
              <h1>
                Your<span id="mei">Name</span>
              </h1>
              <h4 className="subtitle">Full Stack Web Developer</h4>
            </div>
          </div>

          <div className="arrow">
            <a href="#" onClick={(e) => { e.preventDefault(); toast('Coming soon', { icon: '🚀' }); }} aria-label="Scroll to about section">
              <i className="fas fa-angle-down" aria-hidden="true"></i>
            </a>
          </div>
        </section>

        <section id="about" className="container">
          <div className="container">
            <h1>Nice to meet you.</h1>
            <h4 className="subtitle">
              Share a quick mission statement about your craft, the industries you love building for, or the value you
              deliver to teams and clients. Keep it short, intentional, and uniquely you.
            </h4>
          </div>
        </section>

        <SkillsCard />

        <section id="portfolio" className="container p-3">
          <h1>Recent Projects.</h1>
          <h4 className="subtitle">
            Visit my{' '}
            <a id="gitHub" href="https://github.com/your-username" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>{' '}
            to explore more projects.
          </h4>

          <div className="row justify-content-center">
            {PROJECTS.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </section>

        <section id="thankYou">
          <h1>
            Have{' '}
            <span id="article">
              {/^[aeiou]/i.test(word) ? 'an' : 'a'}
            </span>{' '}
            <span id="words" aria-live="polite" className={isFlipping ? 'is-flipping' : ''}>
              {word}
            </span>{' '}
            <span id="day">day</span>!
          </h1>
        </section>

        <section id="contact">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.linkedin.com/in/your-name"
            aria-label="LinkedIn profile"
          >
            <i className="fab fa-linkedin" aria-hidden="true"></i>
            <span className="sr-only">LinkedIn</span>
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/your-username"
            aria-label="GitHub profile"
          >
            <i className="fab fa-github" aria-hidden="true"></i>
            <span className="sr-only">GitHub</span>
          </a>
        </section>
      </main>

      <footer>&copy; {new Date().getFullYear()} Your Name | Portfolio</footer>
    </>
  );
}

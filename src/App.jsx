import "./App.css";
import AboutPage from "./pages/AboutPage";
import NotesPage from "./pages/NotesPage";
import NotePage from "./pages/NotePage";
import ProjectsPage from "./pages/ProjectsPage";
import BlogPage from "./pages/BlogPage";
import PostPage from "./pages/PostPage";
import DumpPage from "./pages/DumpPage";
import DumpTopicPage from "./pages/DumpTopicPage";
import ChroniclesPage from "./pages/ChroniclesPage";
import ChroniclePage from "./pages/ChroniclePage";
import ResourcesPage from "./pages/ResourcesPage";
import MoneyToolPage from "./pages/MoneyToolPage";
import BertologiesPage from "./pages/BertologiesPage";
import { lazy, Suspense, useState } from "react";
import { Link, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { ThemeProvider } from "./ThemeContext";
import BackgroundVortex from "./BackgroundVortex";
import BertoTitle from "./BertoTitle";

// Local-only markdown workbench over mds/ (file API in mdsEditorPlugin.js).
// `import.meta.env.DEV` is compiled to `false` in production builds, so the
// route, its chunk, and the API behind it never ship to the deployed site.
const DevPage = import.meta.env.DEV
  ? lazy(() => import("./pages/DevPage"))
  : null;

function App() {
  return (
    <ThemeProvider>
      <Router>
        <BackgroundVortex />
        <Header />
        <Routes>
          <Route path="/" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/blog/post/:id" element={<PostPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/dump" element={<DumpPage />} />
          <Route path="/dump/:id" element={<DumpTopicPage />} />
          <Route path="/chronicles" element={<ChroniclesPage />} />
          <Route path="/chronicles/:id" element={<ChroniclePage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/note/:id" element={<NotePage />} />
          <Route path="/money" element={<MoneyToolPage />} />
          <Route path="/bertologies" element={<BertologiesPage />} />
          {DevPage && (
            <Route
              path="/dev"
              element={
                <Suspense fallback={null}>
                  <DevPage />
                </Suspense>
              }
            />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Shared section links — laid out inline on desktop, stacked in the mobile menu.
  const links = (
    <>
      <a
        href={"https://github.com/Graffioh"}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-1"
        onClick={close}
      >
        projects
      </a>
      <Link to={"/blog"} className="px-2 py-1" onClick={close}>
        blog
      </Link>
      <Link to={"/dump"} className="px-2 py-1" onClick={close}>
        dump
      </Link>
      <Link to={"/chronicles"} className="px-2 py-1" onClick={close}>
        chronicles
      </Link>
      {/*
      <Link to={"/bertologies"} className="px-2 py-1" onClick={close}>
        bertologies
      </Link>
      <Link to={"/resources"} className="px-2 py-1" onClick={close}>
        <button class="cs-btn">resources</button>
      </Link>
      <Link to={"/notes"} className="px-2 py-1" onClick={close}>
        notes
      </Link>*/}
    </>
  );

  return (
    <div className="md:w-8/12 mx-auto">
      <div className="flex border-b-2 border-stone-500 justify-between items-center p-2">
        <Link
          to={"/"}
          aria-label="berto"
          style={{ lineHeight: 0 }}
          onClick={close}
        >
          <BertoTitle />
        </Link>

        {/* Desktop: theme toggle + links inline */}
        <div className="hidden md:flex items-center">
          <ThemeToggle />
          {links}
        </div>

        {/* Mobile: theme toggle to the left of the hamburger */}
        <div className="md:hidden flex items-center">
          <ThemeToggle />
          <button
            type="button"
            className="p-2"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ cursor: "pointer", color: "var(--text-color)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: dropdown menu with the sections */}
      {open && (
        <div
          className="md:hidden flex flex-col items-end gap-1 px-3 py-3"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          {links}
        </div>
      )}
    </div>
  );
}

export default App;

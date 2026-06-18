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
import { Link, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { ThemeProvider } from "./ThemeContext";
import BackgroundVortex from "./BackgroundVortex";
import BertoTitle from "./BertoTitle";

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
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function Header() {
  return (
    <div className="flex border-b-2 border-stone-500 justify-between items-center p-2 md:w-8/12 mx-auto">
      <Link to={"/"} aria-label="berto" style={{ lineHeight: 0 }}>
        <BertoTitle />
      </Link>
      <div>
        <ThemeToggle />
        <a
          href={"https://github.com/Graffioh"}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2"
        >
          projects
        </a>
        <Link to={"/blog"} className="px-2">
          blog
        </Link>
        <Link to={"/dump"} className="px-2">
          dump
        </Link>
        <Link to={"/chronicles"} className="px-2">
          chronicles
        </Link>
        {/*
        <Link to={"/bertologies"} className="px-2">
          bertologies
        </Link>
        <Link to={"/resources"} className="px-2">
          <button class="cs-btn">resources</button>
        </Link>
        <Link to={"/notes"} className="px-2">
          notes
        </Link>*/}
      </div>
    </div>
  );
}

export default App;

import "./App.css";
import AboutPage from "./pages/AboutPage";
import NotesPage from "./pages/NotesPage";
import ProjectsPage from "./pages/ProjectsPage";
import BlogPage from "./pages/BlogPage";
import PostPage from "./pages/PostPage";
import { Link, BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/blog/post/:id" element={<PostPage />} />
          <Route path="/blog" element={<BlogPage />} />
        </Routes>
      </Router>
    </>
  );
}

function Header() {
  return (
    <div className="flex border-b-2 border-stone-500 justify-between p-2">
      <div>graffioh</div>
      <div>
        <Link to={"/"} className="px-2">about</Link>
        <Link to={"/projects"} className="px-2">projects</Link>
        <Link to={"/blog"} className="px-2">blog</Link>
        <Link to={"/notes"} className="px-2">notes</Link>
      </div>
    </div>
  );
}

export default App;

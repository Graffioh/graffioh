import "./App.css";
import AboutPage from "./pages/AboutPage";
import NotesPage from "./pages/NotesPage";
import NotePage from "./pages/NotePage";
import ProjectsPage from "./pages/ProjectsPage";
import BlogPage from "./pages/BlogPage";
import PostPage from "./pages/PostPage";
import ResourcesPage from "./pages/ResourcesPage";
import MoneyToolPage from "./pages/MoneyToolPage";
import { Link, BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/blog/post/:id" element={<PostPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/note/:id" element={<NotePage />} />
          <Route path="/money" element={<MoneyToolPage />} />
        </Routes>
      </Router>
    </>
  );
}

function Header() {
  return (
    <div className="flex border-b-2 border-stone-500 justify-between items-center p-2 md:w-7/12 mx-auto">
      <Link to={"/"} className="text-white">
        <button class="cs-btn">graffioh</button>
      </Link>
      <div>
        <Link to={"/projects"} className="px-2">
          <button class="cs-btn">projects</button>
        </Link>
        <Link to={"/blog"} className="px-2">
          <button class="cs-btn">blog</button>
        </Link>
        {/*
        <Link to={"/resources"} className="px-2">
          <button class="cs-btn">resources</button>
        </Link>*/}
        <Link to={"/notes"} className="px-2">
          <button class="cs-btn">notes</button>
        </Link>
      </div>
    </div>
  );
}

export default App;

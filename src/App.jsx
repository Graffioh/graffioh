import "./App.css";
import AboutPage from "./pages/AboutPage";
import NotesPage from "./pages/NotesPage";
import ProjectsPage from "./pages/ProjectsPage";
import BlogPage from "./pages/BlogPage";
import PostPage from "./pages/PostPage";
import Header from "./components/Header";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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

export default App;

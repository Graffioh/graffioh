import React, { useEffect, useState } from "react";
import "./App.css";
import FileTree from "./components/fileTree";
import ContentViewer from "./components/contentViewer";
import treePosts from "./content/treePosts";

function App() {
  const [content, setContent] = useState("← please select a file.");

  function handleContent(content) {
    setContent(content);
  }

  return (
    <>
      <div className="flex">
        <FileTree items={treePosts} onContentChange={handleContent} />
        <ContentViewer content={content} />
      </div>
    </>
  );
}

export default App;
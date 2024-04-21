import React, { useEffect, useState } from "react";
import "./App.css";
import FileTree from "./components/fileTree";
import ContentViewer from "./components/contentViewer";
import treePosts from "./content/treePosts";

function findContentByName(tree, path) {
  if (tree.path === path || tree.name === path) {
    return tree.content;
  }

  if (tree.children) {
    for (const child of tree.children) {
      const foundContent = findContentByName(child, path);
      if (foundContent !== null) {
        return foundContent;
      }
    }
  }

  return null;
}

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const searchParamsPath = searchParams.get("path");

  const contentFromPath = findContentByName(treePosts, searchParamsPath);
  
  const [content, setContent] = useState(contentFromPath ?? "← please select a file.");

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

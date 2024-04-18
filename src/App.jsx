import React, { useEffect, useState } from "react";
import "./App.css";
import FileTree from "./FileTree";
import ContentViewer from "./ContentViewer";

const treeMock = {
  children: [{ name: "..." }],
};

async function fetchFiles() {
  // const treeResponse = await fetch("http://localhost:6969/api/file-tree");
  const treeResponse = await fetch("https://zealous-addition-production.up.railway.app/api/file-tree");
  const treeObject = await treeResponse.json();
  return treeObject;
}

function App() {
  const [tree, setTree] = useState(treeMock);
  const [content, setContent] = useState("← please select a file.");

  useEffect(() => {
    const fetchData = async () => {
      const treeObj = await fetchFiles();
      setTree(treeObj);
    };

    fetchData();
  }, []);

  function handleContent(content) {
    setContent(content);
  }

  return (
    <>
      <div className="flex">
        <FileTree items={tree} onContentChange={handleContent} />
        <ContentViewer content={content} />
      </div>
    </>
  );
}

export default App;

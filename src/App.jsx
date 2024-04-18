import React, { useEffect, useState } from "react";
import "./App.css";
import FileTree from "./fileTree";
import ContentViewer from "./ContentViewer";

async function fetchKeys() {
  const keysResponse = await fetch(
    "https://worker-graffioh-portfolio.bregliascuola2002.workers.dev/keys",
    { method: "GET" }
  );
  const keysObject = await keysResponse.json();
  const keys = [{ name: "", children: [] }];
  keysObject.keys.forEach((key) => {
    if (key.name.includes("/")) {
      console.log("HELLO");
    }
    keys.push({ name: key.name, children: [] });
  });
  return JSON.stringify(keysObject.keys);
}

async function constructFileTree() {
  const files = await fetchKeys();
  const tree = { name: "/", children: [] };

  function addToTree(currentTree, pathParts) {
    if (pathParts.length === 0) {
      return;
    }

    const [currentPart, ...restParts] = pathParts;
    let currentNode = currentTree.children.find((child) => child.name === currentPart);

    if (!currentNode) {
      currentNode = { name: currentPart, children: [] };
      currentTree.children.push(currentNode);
    }

    if (restParts.length === 0) {
      return;
    }

    addToTree(currentNode, restParts);
  }

  for (const { name } of JSON.parse(files)) {
    const pathParts = name.split("/");
    addToTree(tree, pathParts);
  }

  return tree;
}

function App() {
  const [tree, setTree] = useState(null);
  const [content, setContent] = useState("← please select a file.");

  useEffect(() => {
    const fetchData = async () => {
      const treeObj = await constructFileTree();
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
        {tree && <FileTree items={tree} onContentChange={handleContent} />}
        <ContentViewer content={content} />
      </div>
    </>
  );
}

export default App;
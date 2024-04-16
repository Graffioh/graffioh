import "./App.css";
import FileTree from "./FileTree";
import ContentViewer from "./ContentViewer";
import { useState } from "react";

const treeMock = {
  children: [
    //   {
    //     name: "public",
    //     children: [{ name: "index.html" }, { name: "style.css" }],
    //   },
    //   {
    //     name: "src",
    //     children: [
    //       { name: "App.css" },
    //       { name: "App.js" },
    //       {
    //         name: "components",
    //         children: [{ name: "Component1.js" }, { name: "Component2.js" }],
    //       },
    //     ],
    //   },
    //   { name: "package.json" },
    { name: "press +" },
  ],
};

async function fetchFiles() {
  const treeResponse = await fetch("http://localhost:6969/api/file-tree");
  const treeObject = await treeResponse.json();

  return treeObject;
}

function App() {
  const [tree, setTree] = useState(treeMock);
  const [content, setContent] = useState("no content");

  function handleContent(content) {
    setContent(content);
  }

  return (
    <>
      <div className="flex">
        <button
          className="w-8 h-8 bg-red-500"
          onClick={async () => {
            const treeObj = await fetchFiles();
            setTree(treeObj);
          }}
        >
          +
        </button>
        <FileTree items={tree} onContentChange={handleContent} />
        <ContentViewer content={content} />
      </div>
    </>
  );
}

export default App;

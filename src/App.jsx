import "./App.css";
import FileTree from "./FileTree";

const tree = {
  children: [
    {
      name: "public",
      children: [{ name: "index.html" }, { name: "style.css" }],
    },
    {
      name: "src",
      children: [
        { name: "App.css" },
        { name: "App.js" },
        {
          name: "components",
          children: [{ name: "Component1.js" }, { name: "Component2.js" }],
        },
      ],
    },
    { name: "package.json" },
  ],
};

function App() {
  return <FileTree items={tree} />;
}

export default App;

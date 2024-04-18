import { useState } from "react";

// async function fetchFileContent(filePath) {
//   const contentResponse = await fetch(
//     "http://localhost:6969/api/file-content?path=" + filePath
//   );

//   // const contentResponse = await fetch(
//   //   "https://zealous-addition-production.up.railway.app/api/file-content?path=" + filePath
//   // );

//   const contentObject = await contentResponse.json();

//   return contentObject.content;
// }

async function fetchFileContent(filePath) {
  const contentResponse = await fetch(
    "https://worker-graffioh-portfolio.bregliascuola2002.workers.dev/value?path=" +
      filePath
  );

  const contentText = await contentResponse.text();

  return contentText;
}

export default function Item({ item, path, onContentChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const fullPath = path ? `${path}/${item.name}` : item.name;

  const isDir = item.children.length !== 0;

  return (
    <div className={"border-stone-700 border-l-2 truncate"}>
      <button
        className={`p-1 w-full flex hover:bg-red-800 ${
          isDir ? "border-red-500" : "border-stone-600"
        }`}
        onClick={async () => {
          if (isDir) {
            setIsOpen(!isOpen);
          } else {
            console.log("PATH: " + fullPath);
            const content = await fetchFileContent(fullPath);
            onContentChange(content);
            console.log("CONTET: " + content);
          }
        }}
      >
        <div className="mx-1 font-bold">{isDir && (isOpen ? "v" : ">")}</div>
        {item.name}
      </button>
      {isDir && (
        <div>
          {item.children.map((subitem) => (
            <div key={subitem.id} className="pl-6" hidden={!isOpen}>
              <Item
                item={subitem}
                path={fullPath}
                onContentChange={onContentChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

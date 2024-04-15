import { useState } from "react";

async function fetchFileContent(filePath) {
  const contentResponse = await fetch(
    "http://localhost:6969/api/file-content?path=" + filePath
  );
  const contentObject = await contentResponse.json();

  return contentObject.content;
}

export default function Item({ item, path, onContentChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const fullPath = path ? `${path}/${item.name}` : item.name;

  return (
    <div>
      <button
        className={`border-2 p-1 ${
          item.children ? "border-red-500" : "border-stone-600"
        }`}
        onClick={async () => {
          if (item.children) {
            setIsOpen(!isOpen);
          } else {
            const content = await fetchFileContent(fullPath);
            onContentChange(content);
          }
        }}
      >
        {item.children && (isOpen ? "v " : "> ")}
        {item.name}
      </button>
      {item.children && (
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

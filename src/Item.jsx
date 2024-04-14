import { useState } from "react";

export default function Item({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className={`border-2 p-1 ${
          item.children ? "border-red-500" : "border-stone-600"
        }`}
        onClick={() => item.children && setIsOpen(!isOpen)}
      >
        {item.children && (isOpen ? "v " : "> ")}
        {item.name}
      </button>
      {item.children && (
        <div>
          {item.children.map((subitem) => (
            <div key={subitem.id} className="pl-6" hidden={!isOpen}>
              <Item item={subitem} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// https://www.youtube.com/watch?v=gT1v33oA1gI

import Item from "./Item";

export default function FileTree({ items, onContentChange }) {
  return (
    <>
      <div className="bg-neutral-900 border-r-2 border-neutral-600 min-h-screen max-h-max w-1/4">
        {items?.children?.map((item) => (
          <div key={item.id}>
            <Item item={item} path={""} onContentChange={onContentChange} />
          </div>
        ))}
      </div>
    </>
  );
}

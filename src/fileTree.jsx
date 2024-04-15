// https://www.youtube.com/watch?v=gT1v33oA1gI

import Item from "./Item";

export default function FileTree({ items, onContentChange }) {
  return (
    <>
      <div className="border-2 border-grey-500 p-2 h-screen w-1/4">
        {items?.children?.map((item) => (
          <div key={item.id}>
            <Item item={item} path={""} onContentChange={onContentChange} />
          </div>
        ))}
      </div>
    </>
  );
}

// https://www.youtube.com/watch?v=gT1v33oA1gI

import Item from "./Item";
import { Resizable } from "re-resizable";

export default function FileTree({ items, onContentChange }) {
  return (
    <>
      <Resizable
        minWidth="20%"
        maxWidth="60%"
        className="bg-neutral-900 border-r-2 border-neutral-600 min-h-screen max-h-max"
        enable={{ right: true }}
      >
        <div>
          {items?.children?.map((item) => (
            <div key={item.id}>
              <Item item={item} path={""} onContentChange={onContentChange} />
            </div>
          ))}
        </div>
      </Resizable>
    </>
  );
}

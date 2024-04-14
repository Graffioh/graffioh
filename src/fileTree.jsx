// https://www.youtube.com/watch?v=gT1v33oA1gI

import Item from "./Item";

export default function FileTree({ items }) {
  return (
    <>
      <div className="">
        {items?.children?.map((item) => (
          <div key={item.id}>
            <Item item={item} />
          </div>
        ))}
      </div>
    </>
  );
}

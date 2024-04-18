// https://www.youtube.com/watch?v=1OE11AMdbvI
//
import Item from "./Item";
import { Resizable } from "re-resizable";
import { useState } from "react";

export default function FileTree({ items, onContentChange }) {
  const [minWidth, setMinWidth] = useState("20%");
  const [maxWidth, setMaxWidth] = useState("80%");
  const [areFilesHidden, setAreFilesHidden] = useState(false);

  return (
    <>
      <Resizable
        minWidth={minWidth}
        maxWidth={maxWidth}
        className="bg-neutral-900 border-r-2 border-neutral-600 min-safe-h-screen"
        enable={{ right: true }}
      >
        <div className="flex justify-between">
          <div className="w-full min-w-full" hidden={areFilesHidden}>
            {items?.children?.map((item) => (
              <div key={item.id}>
                <Item item={item} path={""} onContentChange={onContentChange} />
              </div>
            ))}
          </div>
          <button
            className="text-xl bg-stone-700 h-full px-2"
            onClick={() => {
              setMinWidth(areFilesHidden ? "20%" : "0%");
              setMaxWidth(areFilesHidden ? "60%" : "0%");
              setAreFilesHidden(!areFilesHidden);
            }}
          >
            {areFilesHidden ? ">" : "<"}
          </button>
        </div>
      </Resizable>
    </>
  );
}

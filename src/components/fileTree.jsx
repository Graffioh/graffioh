// https://www.youtube.com/watch?v=1OE11AMdbvI
//
import Item from "./item";
import { Resizable } from "re-resizable";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

const RightHandle = () => (
  <div className="md:w-1 ml-1 hover:bg-neutral-600 active:bg-neutral-600 min-safe-h-screen min-h-screen h-full" />
);

const RightHandleMobile = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-safe-h-screen min-h-screen h-full">
      <div className="z-0 w-1 ml-1 bg-neutral-900 min-safe-h-screen min-h-screen h-full" />
      <div className="sticky inset-y-1/2 bg-neutral-600 px-1 z-10 text-xl">↔</div>
    </div>
  );
};

export default function FileTree({ items, onContentChange }) {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [minWidth, setMinWidth] = useState("20%");
  const maxWidthValue = isMobile ? "90%" : "50%";
  const [maxWidth, setMaxWidth] = useState(maxWidthValue);
  const [areFilesHidden, setAreFilesHidden] = useState(false);
  
  return (
    <>
      <Resizable
        minWidth={minWidth}
        maxWidth={maxWidth}
        className="bg-neutral-900 min-safe-h-screen min-h-screen"
        enable={{ right: true }}
        handleComponent={{
          right: isMobile ? <RightHandleMobile /> : <RightHandle />,
        }}
      >
        <div className="flex justify-between">
          <div className="w-full min-w-full" hidden={areFilesHidden}>
            {items?.children?.map((item) => (
              <div key={item.id}>
                <Item item={item} onContentChange={onContentChange} />
              </div>
            ))}
          </div>
          <button
            className="text-xl bg-stone-700 h-full px-2 ml-1 md:ml-0"
            onClick={() => {
              setMinWidth(areFilesHidden ? "20%" : "0%");
              setMaxWidth(areFilesHidden ? maxWidthValue : "0%");
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

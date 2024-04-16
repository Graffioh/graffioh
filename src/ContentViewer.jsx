import Markdown from "react-markdown";

export default function ContentViewer({ content }) {
  console.log(content);
  return (
    <>
      <div className="border-2 border-red-500 px-6 w-9/12">
        <Markdown className="markdown">{content}</Markdown>
      </div>
    </>
  );
}

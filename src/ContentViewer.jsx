import Markdown from "react-markdown";

export default function ContentViewer({ content }) {
  console.log(content);
  return (
    <>
      <div className="px-6">
        <Markdown className="markdown">{content}</Markdown>
      </div>
    </>
  );
}

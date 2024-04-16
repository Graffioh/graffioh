import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";

export default function ContentViewer({ content }) {
  console.log(content);
  return (
    <>
      <div className="border-2 border-red-500 px-6 w-9/12">
        <Markdown
          className="markdown"
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeRemoveComments]}
          components={{
            img(props) {
              const { node, ...rest } = props;
              return <img className="w-1/2" {...rest} />;
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </>
  );
}

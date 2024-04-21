import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";

export default function ContentViewer({ content }) {
  return (
    <>
      <div className="px-10 md:w-7/12">
        <Markdown
          className="markdown"
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeRemoveComments]}
          components={{
            img(props) {
              const { node, ...rest } = props;
              return <img className="w-11/12" {...rest} />;
            },
            a(props) {
              const { node, ...rest } = props;
              return <a target="__blank" {...rest} />;
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </>
  );
}

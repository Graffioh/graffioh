import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";

export default function ContentViewer({ content }) {
  console.log(content);
  return (
    <>
      <div className="border-2 border-red-500 px-6 w-8/12 md:w-7/12">
        <Markdown
          className="markdown"
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeRemoveComments]}
          components={{
            img(props) {
              const { node, ...rest } = props;
              return <img className="w-10/12 md:w-7/12" {...rest} />;
            },
            blockquote(props) {
              const { node, ...rest } = props;
              return (
                <blockquote
                  className="border-2 border-white bg-red-500"
                  {...rest}
                />
              );
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </>
  );
}

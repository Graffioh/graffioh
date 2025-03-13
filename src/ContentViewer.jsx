import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ContentViewer({ content }) {
  return (
    <>
      <div className="flex w-full justify-center">
        <div className="md:w-6/12 w-full md:pl-12 pl-4">
          <Markdown
            className="markdown"
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeRemoveComments]}
            components={{
              img(props) {
                const { node, alt, ...rest } = props;
                const className = alt === "griffith-castle" ? "" : "w-8/12";
                return <img className={className} alt={alt} {...rest} />;
              },
              a(props) {
                const { node, ...rest } = props;
                return <a target="__blank" {...rest} />;
              },
              code(props) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    style={vscDarkPlus}
                    className="text-sm"
                  />
                ) : (
                  <code
                    {...rest}
                    className={"bg-stone-900 px-1 py-0.5 rounded"}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </div>
      </div>
    </>
  );
}

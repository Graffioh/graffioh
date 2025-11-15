import React, { useEffect, useContext } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeSlug from "rehype-slug";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ThemeContext } from "./ThemeContext";

export default function ContentViewer({ content }) {
  const { theme } = useContext(ThemeContext);
  // Add anchor scroll handling for smooth navigation
  useEffect(() => {
    // Handle hash changes for table of contents navigation
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          // Smooth scroll to element
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Handle initial hash if present
    handleHashChange();

    // Add event listener for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Clean up
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <>
      <div className="flex w-full justify-center">
        <div className="md:w-6/12 w-full md:pl-12 pl-4">
          <Markdown
            className="markdown"
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeRemoveComments, rehypeSlug]}
            components={{
              img(props) {
                const { node, alt, ...rest } = props;
                const className = alt === "griffith-castle" ? "" : "w-8/12";
                return <img className={className} alt={alt} {...rest} />;
              },
              a(props) {
                const { node, ref, href, children, ...rest } = props;
                // Handle internal links properly
                if (href && href.startsWith("#")) {
                  return (
                    <a href={href} {...rest}>
                      {children}
                    </a>
                  );
                }
                // External links open in new tab
                return (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={href}
                    {...rest}
                  >
                    {children}
                  </a>
                );
              },
              h2(props) {
                const { children, ...rest } = props;
                return (
                  <h2 className="text-2xl font-bold mt-8 mb-4" {...rest}>
                    {children}
                  </h2>
                );
              },
              h3(props) {
                const { children, ...rest } = props;
                return (
                  <h3 className="text-xl font-bold mt-6 mb-3" {...rest}>
                    {children}
                  </h3>
                );
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
                    className="text-sm my-4"
                  />
                ) : (
                  <code
                    {...rest}
                    className={`border-2 ${
                      theme === "dark" ? "border-white" : "border-black"
                    } px-1 pb-0.5 rounded`}
                  >
                    {children}
                  </code>
                );
              },
              ul(props) {
                const { children, ...rest } = props;
                // Add special styling for table of contents lists
                if (props.node.position?.start.line < 30) {
                  // Assuming TOC is at the top
                  return (
                    <ul className="toc-list list-disc pl-5 space-y-1" {...rest}>
                      {children}
                    </ul>
                  );
                }
                return (
                  <ul className="list-disc pl-5 my-3" {...rest}>
                    {children}
                  </ul>
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

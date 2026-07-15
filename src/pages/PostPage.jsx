import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import blogPosts from "../data/blogPosts";

export default function PostPage() {
  const { id } = useParams();
  const [content, setContent] = useState(null);
  const post = blogPosts.find((candidate) => candidate.id === id);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const md = await import(`../../mds/blog/${id}.md?raw`);
        setContent(md.default);
      } catch (error) {
        setContent("# Post not found");
      }
    };

    loadContent();
  }, [id]);

  return (
    <div>
      {content ? (
        <ContentViewer
          content={content}
          titleMeta={
            post ? (
              <time
                dateTime={post.date.split("-").reverse().join("-")}
                style={{
                  color: "#a8a29e",
                  display: "block",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                  marginTop: "-0.9rem",
                }}
              >
                {post.date}
              </time>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}

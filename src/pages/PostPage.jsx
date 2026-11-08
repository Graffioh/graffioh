import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import blogPosts from "../data/blogPosts";

// "15-10-2026" → "October 15, 2026"
function formatDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime())
    ? ddmmyyyy
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

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
          variant="post"
          titleMeta={
            post ? (
              <div className="post-meta">
                <time dateTime={post.date.split("-").reverse().join("-")}>
                  {formatDate(post.date)}
                </time>
              </div>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}

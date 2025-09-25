import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";

export default function NotePage() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const md = await import(`../../mds/bertologies.md?raw`);
        setContent(md.default);
      } catch (error) {
        setContent("Not found");
      }
    };

    loadContent();
  });

  return <div>{content ? <ContentViewer content={content} /> : null}</div>;
}

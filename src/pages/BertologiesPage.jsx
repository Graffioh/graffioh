import React, { useEffect, useState } from "react";
import ContentViewer from "../ContentViewer";

export default function BertologiesPage() {
  const [content, setContent] = useState(null);

  // `[]`: load once on mount — without it the effect re-fires the dynamic
  // import after every render.
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
  }, []);

  return <div>{content ? <ContentViewer content={content} /> : null}</div>;
}

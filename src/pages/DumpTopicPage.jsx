import React from "react";
import { Link, useParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import { dumpContent } from "../dumps";

export default function DumpTopicPage() {
  const { id } = useParams();
  const content = dumpContent[id] ?? "# Dump not found";

  return (
    <div>
      <div className="md:w-7/12 w-full px-4 mx-auto pt-4">
        <Link to="/dump" className="text-sm text-stone-400">
          ← back to orbs
        </Link>
      </div>
      {content ? <ContentViewer content={content} /> : null}
    </div>
  );
}

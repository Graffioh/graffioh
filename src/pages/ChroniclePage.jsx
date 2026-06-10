import React from "react";
import { Link, useParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import { chronicleContent } from "../chronicles";

export default function ChroniclePage() {
  const { id } = useParams();
  const content = chronicleContent[id] ?? "# Chronicle not found";

  return (
    <div className="page-fade-in">
      <div className="md:w-7/12 w-full px-4 mx-auto pt-4">
        <Link to="/chronicles" className="text-sm text-stone-400">
          ← back to chronicles
        </Link>
      </div>
      <ContentViewer content={content} />
    </div>
  );
}

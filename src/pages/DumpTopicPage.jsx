import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import { dumpContent, topics } from "../dumps";

export default function DumpTopicPage() {
  const { id } = useParams();
  const location = useLocation();
  const content = dumpContent[id] ?? "# Dump not found";

  // If we arrived here from another dump page (via an in-text wiki-link, which
  // stashes the source path in router state), the back-link returns to that note
  // — and the section the link sat in — instead of the orbs index.
  const from = location.state?.from;
  const fromId =
    typeof from === "string" && from.startsWith("/dump/")
      ? from.slice("/dump/".length).split("#")[0]
      : null;
  const fromTopic =
    fromId && fromId !== id ? topics.find((t) => t.id === fromId) : null;
  const back = fromTopic
    ? { to: from, label: `← back to ${fromTopic.title}` }
    : { to: "/dump", label: "← back to orbs" };

  return (
    <div className="page-fade-in">
      <div className="md:w-8/12 w-full px-4 mx-auto pt-4">
        <Link to={back.to} className="text-sm text-stone-400">
          {back.label}
        </Link>
      </div>
      {content ? <ContentViewer content={content} /> : null}
    </div>
  );
}

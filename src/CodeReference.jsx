import GithubMark from "./GithubMark";
import {
  SyntaxHighlighter,
  canonicalLang,
  ONE_LIGHT_NO_BG,
  VSC_DARK_PLUS_NO_BG,
  slab,
} from "./codeSlab";

function githubSource(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
    const filename = decodeURIComponent(
      url.pathname.split("/").filter(Boolean).pop() || "source"
    );
    return { href: url.href, filename };
  } catch {
    return null;
  }
}

export default function CodeReference({ code, language, sourceUrl, title, theme }) {
  const isDark = theme === "dark";
  const material = slab(isDark);
  const source = githubSource(sourceUrl);

  return (
    <div
      style={{
        color: material.color,
        border: material.border,
        boxShadow: material.boxShadow,
        background: material.background,
        borderRadius: "0.7em",
        margin: "1em 0",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: title ? "space-between" : "flex-end",
          gap: "0.75em",
          minHeight: 36,
          padding: "0 0.62em",
          background: material.panel,
          borderBottom: `1px solid ${material.ink}1f`,
        }}
      >
        {title && (
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              color: material.ink,
              fontFamily: '"Commit Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.025em",
              lineHeight: 1,
              opacity: 0.68,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
        )}
        {source && (
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${source.filename} on GitHub`}
            title={`View ${source.filename} on GitHub`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              color: material.ink,
              textDecoration: "none",
              border: `1px solid ${material.ink}33`,
              borderRadius: "0.48em",
              background: `${material.ink}0a`,
              cursor: "pointer",
            }}
          >
            <GithubMark color={material.ink} size={15} />
          </a>
        )}
      </div>

      <SyntaxHighlighter
        PreTag="div"
        children={code}
        language={canonicalLang(language || "text")}
        style={isDark ? ONE_LIGHT_NO_BG : VSC_DARK_PLUS_NO_BG}
        className="text-sm"
        wrapLongLines={false}
        customStyle={{
          color: material.ink,
          background: "transparent",
          border: 0,
          borderRadius: 0,
          boxShadow: "none",
          margin: 0,
          padding: "0.85em 1.1em 1em",
          overflowX: "auto",
        }}
      />
    </div>
  );
}

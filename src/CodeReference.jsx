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
        position: "relative",
      }}
    >
      {/* no header bar — just the GitHub mark floating in the top-right corner */}
      {source && (
        <a
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${source.filename} on GitHub`}
          title={title ? `${title} · ${source.filename}` : `View ${source.filename} on GitHub`}
          style={{
            position: "absolute",
            top: "0.7em",
            right: "0.75em",
            display: "inline-flex",
            lineHeight: 0,
            opacity: 0.55,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.55)}
        >
          <GithubMark color={material.ink} size={16} />
        </a>
      )}

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
          // right padding keeps long lines from running under the GitHub mark
          padding: source ? "0.85em 2.6em 1em 1.1em" : "0.85em 1.1em 1em",
          overflowX: "auto",
        }}
      />
    </div>
  );
}

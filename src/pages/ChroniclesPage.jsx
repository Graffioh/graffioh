import { Link } from "react-router-dom";
import { chronicles } from "../chronicles";

// Grid of chronicle titles: they flow one after another and wrap to the next
// line whenever the next title can't fit the row. Same font + hover-highlight as
// the other titles (the global `a:hover` rule), just a notch smaller than the
// blog post titles (text-xl vs text-2xl).
export default function ChroniclesPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-center pb-8">
        chronicles from a dumb guy trying to optimize/experiment stuff
      </h1>
      <div className="flex flex-wrap justify-start gap-x-3 gap-y-2 text-sm font-bold">
        {chronicles.map((c, idx) => (
          <span key={c.id} className="flex items-center gap-x-3">
            {idx > 0 && <span className="text-stone-500 select-none">-</span>}
            <Link to={`/chronicles/${c.id}`}>{c.title}</Link>
          </span>
        ))}
      </div>
    </div>
  );
}

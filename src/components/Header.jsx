import { Link } from "react-router-dom";

export default function Header() {
  return (
    <div className="flex border-b-2 border-stone-500 justify-between p-2">
      <div>graffioh</div>
      <div>
        <Link to={"/"} className="px-2">about</Link>
        <Link to={"/projects"} className="px-2">projects</Link>
        <Link to={"/blog"} className="px-2">blog</Link>
        <Link to={"/notes"} className="px-2">notes</Link>
      </div>
    </div>
  );
}

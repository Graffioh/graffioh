import { Link } from "react-router-dom";
import blogPosts from "../data/blogPosts";

const draftPosts = [
  // {
  //   id: "03-14-2025-java-8-101",
  //   title: "J8FZ (Java 8 For Zoomers)",
  //   date: "03-14-2025",
  // },
];

export default function BlogPage() {
  return (
    <div className="text-2xl font-bold flex flex-col justify-center items-center p-8 max-w-3xl mx-auto">
      <h1>Posts</h1>
      <ul>
        {blogPosts.map((post) => (
          <li key={post.id} className="my-8 break-words">
            <Link to={`/blog/post/${post.id}`}>{post.title}</Link>
            <p className="text-sm text-stone-400">{post.date}</p>
          </li>
        ))}
      </ul>
      <h1>Drafts</h1>
      <ul>
        {draftPosts.map((post) => (
          <li key={post.id} className="my-8 break-words">
            <Link to={`/blog/post/${post.id}`}>{post.title}</Link>
            <p className="text-sm text-stone-400">{post.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

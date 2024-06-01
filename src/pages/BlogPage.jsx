import { Link } from "react-router-dom";

const blogPosts = [
  { id: "06-07-2022-the-journey-so-far", title: "The journey so far" },
  {
    id: "06-09-2022-reversing-assault-cube",
    title: "Reversing Assault Cube (v1.2.0.2)",
  },
  {
    id: "06-17-2022-external-and-internal-assault-cube",
    title: "External and Internal Cheats (Basics)",
  },
  { id: "08-01-2022-life-update-1", title: "Life Update I" },
  { id: "12-21-2022-life-update-2", title: "Life Update II" },
  { id: "03-19-2023-learning-something-new", title: "Learning something new" },
  {
    id: "06-25-2023-thoughts-CS-and-SWEs",
    title: "My thoughts on CS, SWEs and more",
  },
  {
    id: "08-21-2023-The-b-in-the-alphabet-stands-for-build",
    title: "The B in the alphabet stands for build",
  },
  { id: "01-12-2024-The-process", title: '"The process"' },
  {
    id: "04-20-2024-In-the-making-of-my-first-webshite",
    title: "In the making of my first webshite",
  },
];

export default function BlogPage() {
  return (
    <div className="text-2xl font-bold flex flex-col justify-center items-center p-8">
      <h1>Posts</h1>
      <ul>
        {blogPosts.map((post) => (
          <li key={post.id} className="my-8">
            <Link to={`/blog/post/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

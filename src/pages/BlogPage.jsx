import { Link } from "react-router-dom";

const blogPosts = [
  {
    id: "03-14-2025-java-8-101",
    title: "Java 8 for noobs",
    date: "03-14-2025",
  },
  {
    id: "12-30-2024-people-ambition",
    title: "People here have no ambition",
    date: "12-30-2024",
  },
  {
    id: "10-29-2024-JSON-parser-with-JFlex-and-Jacc",
    title: " Writing a JSON parser using JFlex and Jacc (Java)",
    date: "10-29-2024",
  },
  {
    id: "09-14-2024-39-days-of-leetcode",
    title: " 39 Days of leetcode",
    date: "09-14-2024",
  },
  {
    id: "07-06-2024-auth-credentials-go",
    title: " Authentication made simple, for the web (and more)",
    date: "07-06-2024",
  },
  {
    id: "04-20-2024-In-the-making-of-my-first-webshite",
    title: "In the making of my first webshite",
    date: "04-20-2024",
  },
  { id: "01-12-2024-The-process", title: '"The process"', date: "01-12-2024" },
  {
    id: "08-21-2023-The-b-in-the-alphabet-stands-for-build",
    title: "The B in the alphabet stands for build",
    date: "08-21-2023",
  },
  {
    id: "06-25-2023-thoughts-CS-and-SWEs",
    title: "My thoughts on CS, SWEs and more",
    date: "06-25-2023",
  },
  {
    id: "03-19-2023-learning-something-new",
    title: "Learning something new",
    date: "03-19-2023",
  },
  {
    id: "12-21-2022-life-update-2",
    title: "Life Update II",
    date: "12-21-2022",
  },
  {
    id: "08-01-2022-life-update-1",
    title: "Life Update I",
    date: "08-01-2022",
  },
  {
    id: "06-07-2022-the-journey-so-far",
    title: "The journey so far",
    date: "06-07-2022",
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
            <p className="text-sm text-stone-400">{post.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

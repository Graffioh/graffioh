import { Link } from "react-router-dom";

const blogPosts = [
  {
    id: "14",
    title: "Afraid to start",
    date: "05-11-2025",
  },
  {
    id: "13",
    title: "J8FZ (Java 8 For Zoomers)",
    date: "03-16-2025",
  },
  {
    id: "12",
    title: "People here have no ambition",
    date: "12-30-2024",
  },
  {
    id: "11",
    title: " Writing a JSON parser using JFlex and Jacc (Java)",
    date: "10-29-2024",
  },
  {
    id: "10",
    title: " 39 Days of leetcode",
    date: "09-14-2024",
  },
  {
    id: "9",
    title: " Authentication made simple, for the web (and more)",
    date: "07-06-2024",
  },
  {
    id: "8",
    title: "In the making of my first webshite",
    date: "04-20-2024",
  },
  { id: "7", title: '"The process"', date: "01-12-2024" },
  {
    id: "6",
    title: "The B in the alphabet stands for build",
    date: "08-21-2023",
  },
  {
    id: "5",
    title: "My thoughts on CS, SWEs and more",
    date: "06-25-2023",
  },
  {
    id: "4",
    title: "Learning something new",
    date: "03-19-2023",
  },
  {
    id: "3",
    title: "Life Update II",
    date: "12-21-2022",
  },
  {
    id: "2",
    title: "Life Update I",
    date: "08-01-2022",
  },
  {
    id: "1",
    title: "The journey so far",
    date: "06-07-2022",
  },
];

const draftPosts = [
  // {
  //   id: "03-14-2025-java-8-101",
  //   title: "J8FZ (Java 8 For Zoomers)",
  //   date: "03-14-2025",
  // },
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
      <h1>Drafts</h1>
      <ul>
        {draftPosts.map((post) => (
          <li key={post.id} className="my-8">
            <Link to={`/blog/post/${post.id}`}>{post.title}</Link>
            <p className="text-sm text-stone-400">{post.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

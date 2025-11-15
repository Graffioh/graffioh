import { Link } from "react-router-dom";

const blogPosts = [
  {
    id: "17",
    title: "Building a simple coding agent infrastructure",
    date: "15-11-2025",
  },
  {
    id: "16",
    title: "How I accidentally became a use case for my university department",
    date: "11-11-2025",
  },
  {
    id: "15",
    title: "Don't let the money kill your passion",
    date: "11-09-2025",
  },
  {
    id: "14",
    title: "Afraid to start",
    date: "11-05-2025",
  },
  {
    id: "13",
    title: "J8FZ (Java 8 For Zoomers)",
    date: "16-03-2025",
  },
  {
    id: "12",
    title: "People here have no ambition",
    date: "30-12-2024",
  },
  {
    id: "11",
    title: " Writing a JSON parser using JFlex and Jacc (Java)",
    date: "29-10-2024",
  },
  {
    id: "10",
    title: " 39 Days of leetcode",
    date: "14-09-2024",
  },
  {
    id: "9",
    title: " Authentication made simple, for the web (and more)",
    date: "06-07-2024",
  },
  {
    id: "8",
    title: "In the making of my first webshite",
    date: "20-04-2024",
  },
  { id: "7", title: '"The process"', date: "01-12-2024" },
  {
    id: "6",
    title: "The B in the alphabet stands for build",
    date: "21-08-2023",
  },
  {
    id: "5",
    title: "My thoughts on CS, SWEs and more",
    date: "25-06-2023",
  },
  {
    id: "4",
    title: "Learning something new",
    date: "19-03-2023",
  },
  {
    id: "3",
    title: "Life Update II",
    date: "21-12-2022",
  },
  {
    id: "2",
    title: "Life Update I",
    date: "01-08-2022",
  },
  {
    id: "1",
    title: "The journey so far",
    date: "07-06-2022",
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

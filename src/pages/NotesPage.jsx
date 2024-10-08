import { Link } from "react-router-dom";

const notes = [
  {
    id: "go",
    title: "Go",
  },
  {
    id: "distributed-systems",
    title: "Distributed systems",
  },
  {
    id: "react",
    title: "React",
  },
  {
    id: "javascript",
    title: "Javascript",
  },
  {
    id: "6.824",
    title: "6.824",
  },
  {
    id: "random",
    title: "Random",
  },
];

export default function NotesPage() {
  return (
    <>
      <div className="text-2xl font-bold flex flex-col justify-center items-center p-8">
        <ul>
          {notes.map((note) => (
            <li key={note.id} className="my-4">
              <Link to={`/notes/note/${note.id}`}>{note.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

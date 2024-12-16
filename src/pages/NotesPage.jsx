import { Link } from "react-router-dom";

const notes = [
  {
    id: "ddia",
    title: "DDIA (Design Data Intensive Applications)",
  },
  {
    id: "system-design",
    title: "System design",
  },
  {
    id: "go",
    title: "Go",
  },
  {
    id: "javascript",
    title: "Javascript",
  },
  {
    id: "react",
    title: "React",
  },
  {
    id: "random",
    title: "Random",
  },
  {
    id: "jeesonmap",
    title: "JSON parser",
  },
  //{
  //  id: "6.824",
  //  title: "6.824",
  //},
];

export default function NotesPage() {
  return (
    <>
      <div className="text-2xl font-bold flex flex-col justify-center items-center p-4">
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

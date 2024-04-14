export default function FileTree() {
  const directories = ["1", "2", "3"];

  return (
    <>
      <div className="border-2 border-red-500">
        {directories.map((directory, index) => (
          <div key={index}>{directory}</div>
        ))}
      </div>
    </>
  );
}

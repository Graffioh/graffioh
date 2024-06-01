import notes from "../../mds/notes.md?raw"
import ContentViewer from "../ContentViewer"

export default function NotesPage() {
    return <ContentViewer content={notes}/>
}
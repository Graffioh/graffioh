import ContentViewer from "../components/ContentViewer"
import notes from "../../mds/notes.md?raw"

export default function NotesPage() {
    return <ContentViewer content={notes}/>
}
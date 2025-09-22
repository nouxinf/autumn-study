// notes.js - manages multiple notes (CRUD) and persistence
export default function createNotes() {
    const STORAGE_KEY = 'pomodoroNotesList';
    let notes = [];
    let activeId = null;
    let changeCb = () => {};
    // Optional external sync hook: set this to a function(remoteData) to apply remote state
    let applyRemote = null;

    function load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        notes = raw ? JSON.parse(raw) : [];
        if (notes.length && !activeId) activeId = notes[0].id;
        notify();
        return notes;
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        notify();
        // if remote hook provided, call it
        if (typeof applyRemote === 'function') applyRemote({notes});
    }

    function createNote() {
        const id = Date.now();
        const note = {
            id,
            title: 'Untitled',
            body: '',
            updatedAt: Date.now()
        };
        notes.unshift(note);
        activeId = id;
        save();
        return note;
    }

    function updateNote(id, {title, body}) {
        const n = notes.find(x => x.id === id);
        if (!n) return null;
        if (typeof title === 'string') n.title = title;
        if (typeof body === 'string') n.body = body;
        n.updatedAt = Date.now();
        save();
        return n;
    }

    function deleteNote(id) {
        notes = notes.filter(n => n.id !== id);
        if (activeId === id) activeId = notes.length ? notes[0].id : null;
        save();
    }

    function getNotes() { return notes.slice(); }
    function getActiveNote() { return notes.find(n => n.id === activeId) || null; }

    function setActive(id) {
        activeId = id;
        notify();
    }

    function onChange(cb) { changeCb = cb; }

    function setApplyRemote(fn) { applyRemote = fn; }

    function notify() {
        changeCb({notes: getNotes(), active: getActiveNote()});
    }

    load();

    return {load, save, createNote, updateNote, deleteNote, getNotes, getActiveNote, setActive, onChange, setApplyRemote};
}

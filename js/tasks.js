// tasks.js - manages tasks, notes, and persistence
export function createTasks() {
    let tasks = [];
    let tasksCompleted = 0;
    let applyRemote = null;

    function load() {
        const saved = localStorage.getItem('pomodoroTasks');
        const savedTasksCompleted = localStorage.getItem('pomodoroTasksCompleted');
        if (saved) tasks = JSON.parse(saved);
        if (savedTasksCompleted) tasksCompleted = parseInt(savedTasksCompleted, 10) || 0;
    }

    function save() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        localStorage.setItem('pomodoroTasksCompleted', tasksCompleted);
        if (typeof applyRemote === 'function') applyRemote({tasks, tasksCompleted});
    }

    function addTask(text) {
        const task = {id: Date.now(), text, completed: false};
        tasks.push(task);
        save();
        return task;
    }

    function toggleTask(id) {
        tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
        tasksCompleted = tasks.filter(t => t.completed).length;
        save();
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        tasksCompleted = tasks.filter(t => t.completed).length;
        save();
    }

    function getTasks() { return tasks.slice(); }
    function getTasksCompleted() { return tasksCompleted; }

    function saveNotes(text) {
        localStorage.setItem('pomodoroNotes', text);
    }

    function loadNotes() {
        return localStorage.getItem('pomodoroNotes') || '';
    }

    function setApplyRemote(fn) { applyRemote = fn; }

    load();

    return {addTask, toggleTask, deleteTask, getTasks, getTasksCompleted, saveNotes, loadNotes, setApplyRemote, load};
}

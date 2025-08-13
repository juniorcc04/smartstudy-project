document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  // Elements for notes list and modals
  const notesList = document.getElementById("notesList");

  // Add Note modal and form elements
  const addNoteModal = document.getElementById("addNoteModal");
  const addNoteForm = document.getElementById("addNoteForm");
  const noteTitleInput = document.getElementById("noteTitle");
  const noteUrlInput = document.getElementById("noteUrl");
  const openAddNoteModalBtn = document.getElementById("openAddNoteModal");
  const cancelNoteBtn = document.getElementById("cancelNoteBtn");

  // Edit Note modal and form elements
  const editNoteModal = document.getElementById("editNoteModal");
  const editNoteForm = document.getElementById("editNoteForm");
  const editNoteIdInput = document.getElementById("editNoteId");
  const editNoteTitleInput = document.getElementById("editNoteTitle");
  const editNoteURLInput = document.getElementById("editNoteURL");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  // Pagination buttons
  const prevNotesBtn = document.getElementById("prevNotesBtn");
  const nextNotesBtn = document.getElementById("nextNotesBtn");

  // For Sorting
  const notesSortSelect = document.getElementById("notesSort");



  // --- Add Note Modal Handlers ---

  // Open Add Note modal
  openAddNoteModalBtn.addEventListener("click", () => {
    addNoteModal.classList.remove("hidden");
    addNoteForm.reset();
  });

  // Cancel Add Note modal
  cancelNoteBtn.addEventListener("click", () => {
    addNoteModal.classList.add("hidden");
  });

  // Convert GitHub blob link to raw link (supports ?raw=true and similar)
function convertGitHubLink(url) {
  // Remove any query string first
  const cleanUrl = url.split("?")[0];

  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/;
  const match = cleanUrl.match(regex);

  if (match) {
    const user = match[1];
    const repo = match[2];
    const branch = match[3];
    const filePath = match[4];
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  }

  return url; // No change if it's not a GitHub blob link
}

// Handle Add Note form submit
addNoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = noteTitleInput.value.trim();
  let url = noteUrlInput.value.trim();

  if (!title || !url) {
    alert("Please fill all fields.");
    return;
  }

  // Auto-convert GitHub link
  url = convertGitHubLink(url);

  try {
    await db.collection("notes").add({
      title,
      url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    alert("Note added.");
    addNoteModal.classList.add("hidden");
    loadNotes();
  } catch (err) {
    console.error("Add note error:", err);
    alert("Failed to add note.");
  }
});

// Load Notes
const notesPerPage = 5;
let currentNotesSort = "createdAt"; // default sort field
let lastVisibleNote = null;
let firstVisibleNote = null;
let notePagesStack = [];

// Handle sort dropdown change
notesSortSelect.addEventListener("change", () => {
  currentNotesSort = notesSortSelect.value;
  lastVisibleNote = null;
  firstVisibleNote = null;
  notePagesStack = [];
  loadNotes("initial");
});

// Pagination buttons
prevNotesBtn.addEventListener("click", () => loadNotes("prev"));
nextNotesBtn.addEventListener("click", () => loadNotes("next"));

async function loadNotes(direction = "initial") {
  notesList.innerHTML = "Loading notes...";

  // Ascending if sorting by title, else descending
  const orderDirection = currentNotesSort === "title" ? "asc" : "desc";
  const notesRef = db.collection("notes").orderBy(currentNotesSort, orderDirection).limit(notesPerPage);

  let query;
  if (direction === "next" && lastVisibleNote) {
    query = notesRef.startAfter(lastVisibleNote);
  } else if (direction === "prev" && notePagesStack.length > 1) {
    notePagesStack.pop(); // remove current page
    const prevFirstDoc = notePagesStack[notePagesStack.length - 1];
    query = notesRef.startAt(prevFirstDoc);
  } else {
    query = notesRef;
    notePagesStack = [];
  }

  try {
    const snapshot = await query.get();
    if (snapshot.empty) {
      notesList.innerHTML = "<p class='text-gray-600'>No notes available.</p>";
      prevNotesBtn.disabled = true;
      nextNotesBtn.disabled = true;
      return;
    }
    notesList.innerHTML = "";
    snapshot.forEach(doc => {
      const note = doc.data();
      const noteId = doc.id;
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow flex justify-between items-center";
      div.innerHTML = `
        <div>
          <h3 class="font-semibold text-lg mb-1">${note.title}</h3>
        </div>
        <div class="space-x-2">
          <button class="editNoteBtn bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500" data-id="${noteId}">Edit</button>
          <button class="deleteNoteBtn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" data-id="${noteId}">Delete</button>
          <button class="downloadNoteBtn bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-id="${noteId}">Download</button>
        </div>
      `;
      notesList.appendChild(div);
    });

    firstVisibleNote = snapshot.docs[0];
    lastVisibleNote = snapshot.docs[snapshot.docs.length - 1];

    if (direction === "initial" || direction === "next") {
      notePagesStack.push(firstVisibleNote);
    }

    prevNotesBtn.disabled = notePagesStack.length <= 1;
    nextNotesBtn.disabled = snapshot.docs.length < notesPerPage;

  } catch (err) {
    console.error("Error loading notes:", err);
    notesList.innerHTML = "<p class='text-red-500'>Failed to load notes.</p>";
    prevNotesBtn.disabled = true;
    nextNotesBtn.disabled = true;
  }
}

// Initial load
loadNotes();


  // --- Notes Event Delegation ---

  notesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("editNoteBtn")) {
      const id = e.target.dataset.id;
      openEditNoteModal(id);
    } else if (e.target.classList.contains("deleteNoteBtn")) {
      const id = e.target.dataset.id;
      deleteNote(id);
    } else if (e.target.classList.contains("downloadNoteBtn")) {
      const id = e.target.dataset.id;
      viewNote(id);
    }
  });

  // --- Edit Note ---

  async function openEditNoteModal(id) {
    try {
      const doc = await db.collection("notes").doc(id).get();
      if (!doc.exists) {
        alert("Note not found.");
        return;
      }
      const note = doc.data();
      editNoteIdInput.value = id;
      editNoteTitleInput.value = note.title;
      editNoteURLInput.value = note.url;
      editNoteModal.classList.remove("hidden");
    } catch (err) {
      console.error("Open edit note error:", err);
      alert("Failed to load note data.");
    }
  }

  editNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editNoteIdInput.value;
    const title = editNoteTitleInput.value.trim();
    let url = editNoteURLInput.value.trim();
    if (!title || !url) {
      alert("Please fill all fields.");
      return;
    }

     url = convertGitHubLink(url);

    try {
      await db.collection("notes").doc(id).update({ title, url });
      alert("Note updated.");
      editNoteModal.classList.add("hidden");
      loadNotes();
    } catch (err) {
      console.error(err);
      alert("Failed to update note.");
    }
  });

  cancelEditBtn.addEventListener("click", () => {
  editNoteModal.classList.add("hidden");
});

  // --- Delete Note ---

  async function deleteNote(id) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await db.collection("notes").doc(id).delete();
      alert("Note deleted.");
      loadNotes();
    } catch (err) {
      console.error("Delete note error:", err);
      alert("Failed to delete note.");
    }
  }

  // --- View Note ---

  async function viewNote(id) {
    try {
      const doc = await db.collection("notes").doc(id).get();
      if (!doc.exists) {
        alert("Note not found.");
        return;
      }
      const note = doc.data();
      window.open(note.url, "_blank");
    } catch (err) {
      console.error("View note error:", err);
      alert("Failed to open note.");
    }
  }

  // Initial load of notes
  loadNotes();
});
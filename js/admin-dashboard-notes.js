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

  // Handle Add Note form submit
  addNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = noteTitleInput.value.trim();
    const url = noteUrlInput.value.trim();
    if (!title || !url) {
      alert("Please fill all fields.");
      return;
    }
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

  // --- Load Notes ---

  async function loadNotes() {
    notesList.innerHTML = "Loading notes...";
    try {
      const snapshot = await db.collection("notes").orderBy("createdAt", "desc").get();
      if (snapshot.empty) {
        notesList.innerHTML = "<p class='text-gray-600'>No notes available.</p>";
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
            <button class="viewNoteBtn bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-id="${noteId}">View</button>
          </div>
        `;
        notesList.appendChild(div);
      });
    } catch (err) {
      console.error("Error loading notes:", err);
      notesList.innerHTML = "<p class='text-red-500'>Failed to load notes.</p>";
    }
  }

  // --- Notes Event Delegation ---

  notesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("editNoteBtn")) {
      const id = e.target.dataset.id;
      openEditNoteModal(id);
    } else if (e.target.classList.contains("deleteNoteBtn")) {
      const id = e.target.dataset.id;
      deleteNote(id);
    } else if (e.target.classList.contains("viewNoteBtn")) {
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
    const url = editNoteURLInput.value.trim();
    if (!title || !url) {
      alert("Please fill all fields.");
      return;
    }
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
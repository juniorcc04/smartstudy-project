document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  // Elements
  const quizzesList = document.getElementById("quizzesList");
  const addQuizModal = document.getElementById("addQuizModal");
  const addQuizForm = document.getElementById("addQuizForm");
  const quizTitleInput = document.getElementById("quizTitle");
  const questionInput = document.getElementById("quizQuestion");
  const quizOptionsContainer = document.getElementById("quizOptions"); // container holding option inputs & radios
  const prevQuestionBtn = document.getElementById("prevQuestionBtn");
  const nextQuestionBtn = document.getElementById("nextQuestionBtn");
  const questionCountText = document.getElementById("questionCountText");
  const cancelQuizBtn = document.getElementById("cancelQuizBtn");
  const openAddQuizModalBtn = document.getElementById("openAddQuizModal");
  const deleteQuestionBtn = document.getElementById("deleteQuestionBtn");
  // Pagination buttons
  const prevQuizzesBtn = document.getElementById("prevQuizzesBtn");
  const nextQuizzesBtn = document.getElementById("nextQuizzesBtn");
  // For Sorting
  const quizzesSortSelect = document.getElementById("quizzesSort");

  let quizQuestions = [];
  let currentQuestionIndex = 0;
  let isEditMode = false;
  let editQuizId = null;

  // Helpers
  function createEmptyQuestion() {
    return {
      question: "",
      options: ["", "", "", ""],
      correctAnswer: null, // index of correct answer
    };
  }

  // Load current question into form inputs
  function loadCurrentQuestion() {
    const q = quizQuestions[currentQuestionIndex];
    questionInput.value = q.question;
    // Update options inputs & radios
    const optionInputs = quizOptionsContainer.querySelectorAll("input.quizOption");
    const optionRadios = quizOptionsContainer.querySelectorAll("input[name='correctOption']");
    optionInputs.forEach((input, i) => {
      input.value = q.options[i] || "";
    });
    optionRadios.forEach((radio, i) => {
      radio.checked = q.correctAnswer === i;
    });
    prevQuestionBtn.disabled = currentQuestionIndex === 0;
    deleteQuestionBtn.disabled = quizQuestions.length <= 1;
    questionCountText.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    nextQuestionBtn.textContent = currentQuestionIndex === quizQuestions.length - 1 ? "Add Question" : "Next";
  }

  // Save current question with validation
  function saveCurrentQuestion() {
    const questionText = questionInput.value.trim();
    const optionInputs = quizOptionsContainer.querySelectorAll("input.quizOption");
    const optionRadios = quizOptionsContainer.querySelectorAll("input[name='correctOption']:checked");
    const options = Array.from(optionInputs).map(input => input.value.trim());
    const correctAnswerRadio = optionRadios[0]; // should be 1 selected or none

    if (!questionText) {
      alert("Please enter the question.");
      return false;
    }
    const filledOptions = options.filter(opt => opt !== "");
    if (filledOptions.length < 2) {
      alert("Please enter at least two options.");
      return false;
    }
    if (!correctAnswerRadio) {
      alert("Please select the correct answer.");
      return false;
    }
    const correctAnswerIndex = parseInt(correctAnswerRadio.value);
    if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length || options[correctAnswerIndex] === "") {
      alert("Correct answer must be one of the filled options.");
      return false;
    }

    quizQuestions[currentQuestionIndex] = {
      question: questionText,
      options,
      correctAnswer: correctAnswerIndex,
    };
    return true;
  }

  // Save current question without validation (for navigating back)
  function saveCurrentQuestionNoValidation() {
    const questionText = questionInput.value.trim();
    const optionInputs = quizOptionsContainer.querySelectorAll("input.quizOption");
    const optionRadios = quizOptionsContainer.querySelectorAll("input[name='correctOption']:checked");
    const options = Array.from(optionInputs).map(input => input.value.trim());
    const correctAnswerIndex = optionRadios.length > 0 ? parseInt(optionRadios[0].value) : null;
    quizQuestions[currentQuestionIndex] = {
      question: questionText,
      options,
      correctAnswer: correctAnswerIndex,
    };
  }

  // Reset form and state
  function resetQuizForm() {
    addQuizForm.reset();
    quizQuestions = [];
    currentQuestionIndex = 0;
    isEditMode = false;
    editQuizId = null;
    questionCountText.textContent = "";
  }

  // Open add quiz modal
  openAddQuizModalBtn.addEventListener("click", () => {
    resetQuizForm();
    quizQuestions = [createEmptyQuestion()];
    currentQuestionIndex = 0;
    isEditMode = false;
    editQuizId = null;
    addQuizModal.classList.remove("hidden");
    loadCurrentQuestion();
  });

  // Cancel modal
  cancelQuizBtn.addEventListener("click", () => {
    addQuizModal.classList.add("hidden");
  });

  // Prev question
  prevQuestionBtn.addEventListener("click", () => {
    saveCurrentQuestionNoValidation();
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadCurrentQuestion();
    }
  });

  // Next question
  nextQuestionBtn.addEventListener("click", () => {
    if (!saveCurrentQuestion()) return;
    if (currentQuestionIndex === quizQuestions.length - 1) {
      quizQuestions.push(createEmptyQuestion());
      currentQuestionIndex++;
      loadCurrentQuestion();
    } else {
      currentQuestionIndex++;
      loadCurrentQuestion();
    }
  });

  // Delete question
  deleteQuestionBtn.addEventListener("click", () => {
    if (quizQuestions.length === 1) {
      alert("You must have at least one question.");
      return;
    }
    quizQuestions.splice(currentQuestionIndex, 1);
    if (currentQuestionIndex >= quizQuestions.length) {
      currentQuestionIndex = quizQuestions.length - 1;
    }
    loadCurrentQuestion();
  });

  // Submit quiz form (Add or Update)
  addQuizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!saveCurrentQuestion()) return;
    const title = quizTitleInput.value.trim();
    if (!title) {
      alert("Please enter the quiz title.");
      return;
    }
    try {
      if (isEditMode && editQuizId) {
        await db.collection("quizzes").doc(editQuizId).update({
          title,
          questions: quizQuestions,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        alert("Quiz updated successfully!");
      } else {
        await db.collection("quizzes").add({
          title,
          questions: quizQuestions,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        alert("Quiz added successfully!");
      }
      addQuizModal.classList.add("hidden");
      resetQuizForm();
      loadQuizzes();
    } catch (err) {
      console.error("Error saving quiz:", err);
      alert("Failed to save quiz.");
    }
  });

// Load Notes
const quizzesPerPage = 5;  // number of quizzes per page
let currentQuizzesSort = "createdAt"; // default sort
let lastVisibleQuiz = null;
let firstVisibleQuiz = null;
let quizPagesStack = [];


// Handle sort dropdown change
quizzesSortSelect.addEventListener("change", () => {
  currentQuizzesSort = quizzesSortSelect.value;
  lastVisibleQuiz = null;
  firstVisibleQuiz = null;
  quizPagesStack = [];
  loadQuizzes("initial");
});

// Pagination buttons
prevQuizzesBtn.addEventListener("click", () => loadQuizzes("prev"));
nextQuizzesBtn.addEventListener("click", () => loadQuizzes("next"));

async function loadQuizzes(direction = "initial") {
  quizzesList.innerHTML = "<p>Loading quizzes...</p>";

  // Ascending if sorting by title, else descending
  const orderDirection = currentQuizzesSort === "title" ? "asc" : "desc";

  let quizzesRef = db.collection("quizzes").orderBy(currentQuizzesSort, orderDirection).limit(quizzesPerPage);
  let query;

  if (direction === "next" && lastVisibleQuiz) {
    query = quizzesRef.startAfter(lastVisibleQuiz);
  } else if (direction === "prev" && quizPagesStack.length > 1) {
    quizPagesStack.pop();
    const prevFirstDoc = quizPagesStack[quizPagesStack.length - 1];
    query = quizzesRef.startAt(prevFirstDoc);
  } else {
    query = quizzesRef;
    quizPagesStack = [];
  }

  try {
    const snapshot = await query.get();

    if (snapshot.empty) {
      quizzesList.innerHTML = "<p>No quizzes available.</p>";
      prevQuizzesBtn.disabled = true;
      nextQuizzesBtn.disabled = true;
      return;
    }

    quizzesList.innerHTML = "";

    snapshot.forEach(doc => {
      const quiz = doc.data();
      const quizId = doc.id;

      // Customize display below as needed
      const div = document.createElement("div");
      div.className = "bg-white p-4 rounded shadow mb-2 flex justify-between items-center";
      div.innerHTML = `
        <div>
          <h3 class="font-semibold text-lg">${quiz.title || "Untitled Quiz"}</h3>
        </div>
        <div class="space-x-2">
          <button class="editQuizBtn bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500" data-id="${quizId}">Edit</button>
          <button class="deleteQuizBtn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" data-id="${quizId}">Delete</button>
        </div>
      `;
      quizzesList.appendChild(div);
    });

    firstVisibleQuiz = snapshot.docs[0];
    lastVisibleQuiz = snapshot.docs[snapshot.docs.length - 1];

    if (direction === "initial" || direction === "next") {
      quizPagesStack.push(firstVisibleQuiz);
    }

    prevQuizzesBtn.disabled = quizPagesStack.length <= 1;
    nextQuizzesBtn.disabled = snapshot.docs.length < quizzesPerPage;

  } catch (error) {
    console.error("Error loading quizzes:", error);
    quizzesList.innerHTML = "<p class='text-red-500'>Failed to load quizzes.</p>";
    prevQuizzesBtn.disabled = true;
    nextQuizzesBtn.disabled = true;
  }
}

// Initial load
loadQuizzes();

  // Edit quiz handler
  function editQuiz(quizId) {
    db.collection("quizzes").doc(quizId).get().then(doc => {
      if (!doc.exists) {
        alert("Quiz not found!");
        return;
      }
      const quiz = doc.data();
      isEditMode = true;
      editQuizId = quizId;
      quizTitleInput.value = quiz.title;
      quizQuestions = quiz.questions || [];
      if (quizQuestions.length === 0) {
        quizQuestions = [createEmptyQuestion()];
      }
      currentQuestionIndex = 0;
      addQuizModal.classList.remove("hidden");
      loadCurrentQuestion();
    });
  }

  // Delete quiz handler
  function deleteQuiz(quizId) {
    if (confirm("Are you sure you want to delete this quiz?")) {
      db.collection("quizzes").doc(quizId).delete()
        .then(() => {
          alert("Quiz deleted successfully!");
          loadQuizzes();
        })
        .catch(err => {
          console.error("Error deleting quiz:", err);
          alert("Failed to delete quiz.");
        });
    }
  }

  // View quiz handler (simple alert showing questions)
  function viewQuiz(quizId) {
    db.collection("quizzes").doc(quizId).get().then(doc => {
      if (!doc.exists) {
        alert("Quiz not found!");
        return;
      }
      const quiz = doc.data();
      let details = `Title: ${quiz.title}\n\n`;
      quiz.questions.forEach((q, i) => {
        details += `${i + 1}. ${q.question}\nOptions:\n`;
        q.options.forEach((opt, idx) => {
          const correctMark = q.correctAnswer === idx ? " (Correct)" : "";
          details += `  - ${opt}${correctMark}\n`;
        });
        details += "\n";
      });
      alert(details);
    });
  }

  // Event delegation for buttons inside quizzesList
  quizzesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("viewQuizBtn")) {
      const quizId = e.target.dataset.id;
      viewQuiz(quizId);
    } else if (e.target.classList.contains("editQuizBtn")) {
      const quizId = e.target.dataset.id;
      editQuiz(quizId);
    } else if (e.target.classList.contains("deleteQuizBtn")) {
      const quizId = e.target.dataset.id;
      deleteQuiz(quizId);
    }
  });

  // Initial load
  loadQuizzes();
});
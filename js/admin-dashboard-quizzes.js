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

  // Load question into form inputs
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

  // Save current inputs into quizQuestions array (with validation)
  function saveCurrentQuestion() {
    const questionText = questionInput.value.trim();
    const optionInputs = quizOptionsContainer.querySelectorAll("input.quizOption");
    const optionRadios = quizOptionsContainer.querySelectorAll("input[name='correctOption']:checked");

    const options = Array.from(optionInputs).map(input => input.value.trim());
    const correctAnswerRadio = optionRadios[0]; // should be 1 selected or none

    // Validation
    if (!questionText) {
      alert("Please enter the question.");
      return false;
    }

    // Must have at least 2 non-empty options
    const filledOptions = options.filter(opt => opt !== "");
    if (filledOptions.length < 2) {
      alert("Please enter at least two options.");
      return false;
    }

    // Check that correct answer is selected and valid
    if (!correctAnswerRadio) {
      alert("Please select the correct answer.");
      return false;
    }

    const correctAnswerIndex = parseInt(correctAnswerRadio.value);
    if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length || options[correctAnswerIndex] === "") {
      alert("Correct answer must be one of the filled options.");
      return false;
    }

    // Save current question
    quizQuestions[currentQuestionIndex] = {
      question: questionText,
      options,
      correctAnswer: correctAnswerIndex,
    };
    return true;
  }

  // Save current inputs WITHOUT validation (for navigating back)
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

  // Reset quiz form and state
  function resetQuizForm() {
    addQuizForm.reset();
    quizQuestions = [];
    currentQuestionIndex = 0;
    isEditMode = false;
    editQuizId = null;
    questionCountText.textContent = "";
  }

  // Open modal for adding new quiz
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

  // Prev question button
  prevQuestionBtn.addEventListener("click", () => {
    saveCurrentQuestionNoValidation();
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadCurrentQuestion();
    }
  });

  // Next question button
  nextQuestionBtn.addEventListener("click", () => {
    if (!saveCurrentQuestion()) return;

    if (currentQuestionIndex === quizQuestions.length - 1) {
      // Add new empty question
      quizQuestions.push(createEmptyQuestion());
      currentQuestionIndex++;
      loadCurrentQuestion();
    } else {
      // Move to next question
      currentQuestionIndex++;
      loadCurrentQuestion();
    }
  });

  // Delete question button
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

  // Submit quiz (Add or Update)
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
        // Update existing quiz
        await db.collection("quizzes").doc(editQuizId).update({
          title,
          questions: quizQuestions,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        alert("Quiz updated successfully!");
      } else {
        // Add new quiz
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

  // Load quizzes list
  async function loadQuizzes() {
    quizzesList.innerHTML = "Loading quizzes...";
    try {
      const snapshot = await db.collection("quizzes").orderBy("createdAt", "desc").get();
      if (snapshot.empty) {
        quizzesList.innerHTML = "<p class='text-gray-600'>No quizzes available.</p>";
        return;
      }

      quizzesList.innerHTML = "";
      snapshot.forEach(doc => {
        const quiz = doc.data();
        const quizId = doc.id;

        const div = document.createElement("div");
        div.className = "bg-white p-4 rounded shadow flex justify-between items-center";
        div.innerHTML = `
          <div>
            <h3 class="font-semibold text-lg mb-1">${quiz.title}</h3>
            <p>${quiz.questions.length} question(s)</p>
          </div>
          <div class="space-x-2">
            <button class="editQuizBtn bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500" data-id="${quizId}">Edit</button>
            <button class="deleteQuizBtn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" data-id="${quizId}">Delete</button>
            <button class="viewQuizBtn bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-id="${quizId}">View</button>
          </div>
        `;

        // Attach button listeners
        div.querySelector(".editQuizBtn").addEventListener("click", () => editQuiz(quizId));
        div.querySelector(".deleteQuizBtn").addEventListener("click", () => deleteQuiz(quizId));
        div.querySelector(".viewQuizBtn").addEventListener("click", () => viewQuiz(quizId));

        quizzesList.appendChild(div);
      });
    } catch (err) {
      console.error("Error loading quizzes:", err);
      quizzesList.innerHTML = "<p class='text-red-500'>Failed to load quizzes.</p>";
    }
  }

  // Edit quiz
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

  // Delete quiz
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

  // View quiz (simple alert showing questions + options + correct answer)
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

  // Initial load
  loadQuizzes();
});
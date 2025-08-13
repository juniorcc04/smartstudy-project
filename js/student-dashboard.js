document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  const auth = firebase.auth();

  const notesList = document.getElementById("studentNotesList");
  const quizzesList = document.getElementById("studentQuizzesList");

  // Quiz Modal Elements
  const quizModal = document.getElementById("quizModal");
  const quizTitle = document.getElementById("quizTitle");
  const quizProgress = document.getElementById("quizProgress");
  const quizQuestion = document.getElementById("quizQuestion");
  const quizOptions = document.getElementById("quizOptions");
  const prevBtn = document.getElementById("prevQuestion");
  const nextBtn = document.getElementById("nextQuestion");
  const closeQuizModal = document.getElementById("closeQuizModal");

  let currentQuiz = null;
  let currentQuestionIndex = 0;
  let answers = {};

    // Display welcome message with student's name
  auth.onAuthStateChanged(async (user) => {
  if (user) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const name = userDoc.exists ? userDoc.data().name : user.email.split('@')[0];
    document.getElementById("welcomeMessage").textContent = `Welcome, ${name} 👋`;
      // Load recent notes
      const notesList = document.getElementById("recentNotesList");
      notesList.innerHTML = "";
      const notesSnapshot = await db.collection("notes")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();

      if (notesSnapshot.empty) {
        notesList.innerHTML = "<li>No notes available.</li>";
      } else {
        notesSnapshot.forEach(doc => {
          const note = doc.data();
          const li = document.createElement("li");
          li.textContent = note.title || "Untitled Note";
          notesList.appendChild(li);
        });
      }

      // Load recent quizzes
      const quizzesList = document.getElementById("recentQuizzesList");
      quizzesList.innerHTML = "";
      const quizzesSnapshot = await db.collection("quizzes")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();

      if (quizzesSnapshot.empty) {
        quizzesList.innerHTML = "<li>No quizzes available.</li>";
      } else {
        quizzesSnapshot.forEach(doc => {
          const quiz = doc.data();
          const li = document.createElement("li");
          li.textContent = quiz.title;
          quizzesList.appendChild(li);
        });
      }
    }



  // Load Notes
let notesPageSize = 6;
let notesLastVisible = null;
let notesFirstDoc = null;
let notesPageHistory = [];

async function loadNotes(page = "first") {
  notesList.innerHTML = "";

  let query = db.collection("notes")
    .orderBy("createdAt", "desc")
    .limit(notesPageSize);

  if (page === "next" && notesLastVisible) {
    query = query.startAfter(notesLastVisible);
  } else if (page === "prev" && notesPageHistory.length > 1) {
    notesPageHistory.pop(); // remove current page
    const prevCursor = notesPageHistory.pop(); // previous page start
    query = query.startAt(prevCursor);
  }

  const snapshot = await query.get();

  if (!snapshot.empty) {
    notesFirstDoc = snapshot.docs[0];
    notesLastVisible = snapshot.docs[snapshot.docs.length - 1];

    // Store start of page for back navigation
    if (page !== "prev") {
      notesPageHistory.push(notesFirstDoc);
    }

    snapshot.forEach(doc => {
      const note = doc.data();
      const div = document.createElement("div");
      div.className = "bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition";
      div.innerHTML = `
        <h3 class="font-semibold text-lg mb-2">${note.title}</h3>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" type="button">Download Note</button>
      `;
      const downloadBtn = div.querySelector("button");
      downloadBtn.addEventListener("click", () => {
        window.open(note.url, "_blank");
      });
      notesList.appendChild(div);
    });
  }
}

// Pagination buttons
document.getElementById("nextNotesBtn").addEventListener("click", () => loadNotes("next"));
document.getElementById("prevNotesBtn").addEventListener("click", () => loadNotes("prev"));

  // Load Quizzes
let quizPageSize = 6;
let quizLastVisible = null;
let quizFirstDoc = null;
let quizPageHistory = [];

async function loadQuizzes(page = "first") {
  quizzesList.innerHTML = "";

  let query = db.collection("quizzes")
    .orderBy("createdAt", "desc")
    .limit(quizPageSize);

  if (page === "next" && quizLastVisible) {
    query = query.startAfter(quizLastVisible);
  } else if (page === "prev" && quizPageHistory.length > 1) {
    quizPageHistory.pop();
    const prevCursor = quizPageHistory.pop();
    query = query.startAt(prevCursor);
  }

  const snapshot = await query.get();

  if (!snapshot.empty) {
    quizFirstDoc = snapshot.docs[0];
    quizLastVisible = snapshot.docs[snapshot.docs.length - 1];

    if (page !== "prev") {
      quizPageHistory.push(quizFirstDoc);
    }

    snapshot.forEach(doc => {
      const quiz = doc.data();
      const div = document.createElement("div");
      div.className = "bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition";
      div.innerHTML = `
        <h3 class="font-semibold text-lg mb-2">${quiz.title}</h3>
        <button class="startQuizBtn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded" 
          data-id="${doc.id}" type="button">Start Quiz</button>
      `;
      quizzesList.appendChild(div);
    });
  }
}

// Pagination buttons
document.getElementById("nextQuizzesBtn").addEventListener("click", () => loadQuizzes("next"));
document.getElementById("prevQuizzesBtn").addEventListener("click", () => loadQuizzes("prev"));

  // Start Quiz
  quizzesList.addEventListener("click", async (e) => {
    if (e.target.classList.contains("startQuizBtn")) {
      const quizId = e.target.dataset.id;
      const docSnap = await db.collection("quizzes").doc(quizId).get();
      if (docSnap.exists) {
        currentQuiz = docSnap.data();
        currentQuestionIndex = 0;
        answers = {};
        openQuizModal();
      }
    }
  });

  function openQuizModal() {
  quizTitle.textContent = currentQuiz.title;
  currentQuestionIndex = 0;   // reset current question index
  answers = {};               // reset answers object

  prevBtn.style.display = "inline-block";  // show Prev button
  nextBtn.style.display = "inline-block";  // show Next button

  loadQuestion();
  quizModal.classList.remove("hidden");
}

  function loadQuestion() {
  const questionObj = currentQuiz.questions[currentQuestionIndex];
  quizProgress.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
  quizQuestion.textContent = questionObj.question;
  quizOptions.innerHTML = "";

  questionObj.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = `block w-full text-left px-4 py-2 border rounded ${
      answers[currentQuestionIndex] === idx ? "bg-blue-200" : "bg-white"
    } hover:bg-blue-100`;
    btn.addEventListener("click", () => {
      answers[currentQuestionIndex] = idx;
      loadQuestion();
    });
    quizOptions.appendChild(btn);
  });

  // Show/hide Prev button
  prevBtn.style.display = currentQuestionIndex > 0 ? "inline-block" : "none";

  // Always show Next button here, it will be hidden after submitQuiz()
  nextBtn.style.display = "inline-block";

  if (currentQuestionIndex === currentQuiz.questions.length - 1) {
    nextBtn.textContent = "Submit Quiz";
    nextBtn.classList.remove("bg-blue-500");
    nextBtn.classList.add("bg-green-500", "hover:bg-green-600");
  } else {
    nextBtn.textContent = "Next";
    nextBtn.classList.remove("bg-green-500", "hover:bg-green-600");
    nextBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
  }
}

  prevBtn.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      currentQuestionIndex++;
      loadQuestion();
    } else {
      submitQuiz();
    }
  });

  function submitQuiz() {
    let score = 0;
    let feedbackHTML = "";

    currentQuiz.questions.forEach((q, index) => {
      const userAnswer = answers[index];
      const correctAnswer = q.correctAnswer;

      if (userAnswer === correctAnswer) {
        score++;
        feedbackHTML += `
          <div class="mb-3 p-3 bg-green-100 rounded">
            <p><strong>Q${index + 1}:</strong> ${q.question}</p>
            <p class="text-green-700">✅ Correct</p>
          </div>
        `;
      } else {
        feedbackHTML += `
          <div class="mb-3 p-3 bg-red-100 rounded">
            <p><strong>Q${index + 1}:</strong> ${q.question}</p>
            <p class="text-red-700">❌ Wrong</p>
            <p class="text-blue-700">Correct Answer: ${q.options[correctAnswer]}</p>
          </div>
        `;
      }
    });

    quizOptions.innerHTML = `
      <h4 class="text-lg font-semibold mb-3">Your Score: ${score} / ${currentQuiz.questions.length}</h4>
      ${feedbackHTML}
      <button id="closeResult" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Close</button>
    `;

    quizQuestion.textContent = "Quiz Completed!";
    quizProgress.textContent = "";
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";

    document.getElementById("closeResult").addEventListener("click", () => {
      quizModal.classList.add("hidden");
      prevBtn.style.display = "block";
      nextBtn.style.display = "block";
    });
  }

  closeQuizModal.addEventListener("click", () => {
    quizModal.classList.add("hidden");
  });

  // Init
  loadNotes();
  loadQuizzes();
});
})
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


firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    const welcomeMsg = document.getElementById("welcomeMessage");
    try {
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const name = userData.name || user.email.split('@')[0];
        welcomeMsg.textContent = `Welcome, ${name}`;
      } else {
        console.warn("No user document found!");
        welcomeMsg.textContent = `Welcome, ${user.email.split('@')[0]}!`;
      }
    } catch (error) {
      console.error("Error fetching name:", error);
      welcomeMsg.textContent = `Welcome, ${user.email.split('@')[0]}!`;
    }
  } else {
    window.location.href = "login.html";
  }
});

  // Load Notes
async function loadNotes() {
  notesList.innerHTML = "";
  const snapshot = await db.collection("notes").orderBy("createdAt", "desc").get();
  snapshot.forEach(doc => {
    const note = doc.data();
    const div = document.createElement("div");
    div.className = "bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition";
    div.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">${note.title}</h3>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        type="button"
      >
        Open Note
      </button>
    `;
    const openNoteBtn = div.querySelector("button");
    openNoteBtn.addEventListener("click", () => {
      window.open(note.url, "_blank");
    });
    notesList.appendChild(div);
  });
}

  // Load Quizzes
  async function loadQuizzes() {
    quizzesList.innerHTML = "";
    const snapshot = await db.collection("quizzes").orderBy("createdAt", "desc").get();
    snapshot.forEach(doc => {
      const quiz = doc.data();
      const div = document.createElement("div");
      div.className = "bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition flex flex-col justify-between";
      div.innerHTML = `
        <h3 class="font-semibold text-lg mb-3">${quiz.title}</h3>
        <button class="startQuizBtn bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded" data-id="${doc.id}">Start</button>
      `;
      quizzesList.appendChild(div);
    });
  }

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

    // Change "Next" button to "Submit" on last question
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
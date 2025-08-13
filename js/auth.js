// Firebase references (compat version)
const auth = firebase.auth();
const db = firebase.firestore();


// SIGNUP
const signupForm = document.getElementById('signup-form');
const signupErrorDiv = document.getElementById('signupError'); // Make sure to add in HTML

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear old error
    if (signupErrorDiv) signupErrorDiv.textContent = "";

    const email = signupForm.email.value;
    const password = signupForm.password.value;
    const name = signupForm.name.value;

    const signupBtn = signupForm.querySelector('button[type="submit"]');
    signupBtn.disabled = true;
    signupBtn.textContent = "Creating account...";

    try {
      // Create user
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Save extra data in Firestore
      await db.collection("users").doc(user.uid).set({
        name: name,
        email: email,
        role: "student", // default role
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Redirect to student dashboard
      window.location.href = "student-dashboard.html";

    } catch (error) {
      if (signupErrorDiv) {
        signupErrorDiv.textContent = error.message;
      } else {
        alert(error.message);
      }
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Sign Up";
    }
  });
}

// LOGIN
const loginForm = document.getElementById('login-form');
const loginErrorDiv = document.getElementById('loginError'); // Make sure you add this div in HTML

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear old error
    if (loginErrorDiv) loginErrorDiv.textContent = "";

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    const loginBtn = loginForm.querySelector('button[type="submit"]');
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Fetch user's role
      const docRef = await db.collection("users").doc(user.uid).get();
      const userData = docRef.data();

      // Redirect based on role
      if (userData.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "student-dashboard.html";
      }

    } catch (error) {
      if (loginErrorDiv) {
        loginErrorDiv.textContent = error.message; // Show inline error
      } else {
        alert(error.message); // fallback
      }
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  });
}

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut()
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert(error.message);
      });
  });
}

// FORGOT PASSWORD
if (window.location.pathname.includes("login.html")) {

document.getElementById("forgotPasswordLink").addEventListener("click", (e) => {
  e.preventDefault();
  const emailInput = document.getElementById("email");
  const email = emailInput.value.trim();

  if (!email) {
    alert("Please enter your email address first.");
    emailInput.focus();
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert("Password reset email sent! Check your inbox.");
    })
    .catch((error) => {
      alert(`Error: ${error.message}`);
    });
});

}

// Firebase references (compat version)
const auth = firebase.auth();
const db = firebase.firestore();


// SIGNUP
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = signupForm.name.value;
    const email = signupForm.email.value;
    const password = signupForm.password.value;

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Store name and role
      await firebase.firestore().collection("users").doc(user.uid).set({
        name,
        email,
        role: "student"
      });

      alert("Signup successful!");
      window.location.href = "student-dashboard.html";
    } catch (error) {
      alert(error.message);
    }
  });
}

// LOGIN
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

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
      alert(error.message);
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

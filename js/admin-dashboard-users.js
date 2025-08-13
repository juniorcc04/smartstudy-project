document.addEventListener("DOMContentLoaded", () => {
  const usersList = document.getElementById("usersList");
  const addUserModal = document.getElementById("addUserModal");
  const openAddUserModalBtn = document.getElementById("openAddUserModal");
  const cancelAddUserBtn = document.getElementById("cancelAddUserBtn");
  const addUserForm = document.getElementById("addUserForm");
  const userSearchInput = document.getElementById("userSearch");

  const prevUsersBtn = document.getElementById("prevUsersBtn");
  const nextUsersBtn = document.getElementById("nextUsersBtn");

  // For Sorting
  const userSort = document.getElementById("userSort");
  let currentSortField = userSort.value || "createdAt";

  
  const usersPerPage = 5;
  let lastVisibleUser = null;
  let firstVisibleUser = null;
  let userPagesStack = [];

  // Open add user modal
  openAddUserModalBtn.addEventListener("click", () => {
    addUserModal.classList.remove("hidden");
  });

  // Close add user modal
  cancelAddUserBtn.addEventListener("click", () => {
    addUserModal.classList.add("hidden");
    addUserForm.reset();
  });

  // Fetch and display users with pagination
  async function fetchUsers(direction = "initial", sortField = currentSortField) {
    usersList.innerHTML = "<tr><td colspan='4' class='text-center py-4'>Loading users...</td></tr>";
    const usersRef = firebase.firestore().collection("users").orderBy(sortField, "asc").limit(usersPerPage);

    let query;
    if (direction === "next" && lastVisibleUser) {
      query = usersRef.startAfter(lastVisibleUser);
    } else if (direction === "prev" && userPagesStack.length > 1) {
      userPagesStack.pop(); // remove current page
      const prevFirstDoc = userPagesStack[userPagesStack.length - 1];
      query = usersRef.startAt(prevFirstDoc);
    } else {
      query = usersRef;
      userPagesStack = [];
    }

    try {
      const snapshot = await query.get();
      if (snapshot.empty) {
        usersList.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-4 text-gray-500">No users found.</td>
          </tr>`;
        prevUsersBtn.disabled = true;
        nextUsersBtn.disabled = true;
        return;
      }
      usersList.innerHTML = "";
      snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        const tr = document.createElement("tr");
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
          <td class="py-2 px-4">${user.name || ''}</td>
          <td class="py-2 px-4">${user.email || ''}</td>
          <td class="py-2 px-4 capitalize">${user.role || 'user'}</td>
          <td class="py-2 px-4 space-x-2">
            <button class="text-blue-500 hover:text-blue-700 edit-btn" data-id="${userId}">Edit</button>
            <button class="text-red-500 hover:text-red-700 delete-btn" data-id="${userId}">Delete</button>
          </td>
        `;
        usersList.appendChild(tr);
      });
      firstVisibleUser = snapshot.docs[0];
      lastVisibleUser = snapshot.docs[snapshot.docs.length - 1];
      if (direction === "initial" || direction === "next") {
        userPagesStack.push(firstVisibleUser);
      }
      prevUsersBtn.disabled = userPagesStack.length <= 1;
      nextUsersBtn.disabled = snapshot.docs.length < usersPerPage;
    } catch (err) {
      console.error("Error fetching users:", err);
      usersList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4 text-red-500">Failed to load users.</td>
        </tr>`;
      prevUsersBtn.disabled = true;
      nextUsersBtn.disabled = true;
    }
  }

  // Pagination button handlers, pass currentSortField:
  prevUsersBtn.addEventListener("click", () => fetchUsers("prev", currentSortField));
  nextUsersBtn.addEventListener("click", () => fetchUsers("next", currentSortField));

  // Sort dropdown change handler
  userSort.addEventListener("change", () => {
    currentSortField = userSort.value;
    // Reset pagination and fetch first page sorted by new field
    lastVisibleUser = null;
    firstVisibleUser = null;
    userPagesStack = [];
    fetchUsers("initial", currentSortField);
  });

  // Initial fetch with default sort
  fetchUsers("initial", currentSortField);


  // Edit and Delete user event delegation
  usersList.addEventListener("click", async (e) => {
    // Edit user
    if (e.target.classList.contains("edit-btn")) {
      e.stopPropagation();
      const userId = e.target.dataset.id;
      const userDoc = await firebase.firestore().collection("users").doc(userId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        document.getElementById("editUserId").value = userId;
        document.getElementById("editUserName").value = user.name || "";
        document.getElementById("editUserRole").value = user.role || "user";
        document.getElementById("editUserModal").classList.remove("hidden");
      }
    }

    // Delete user
    if (e.target.classList.contains("delete-btn")) {
      e.stopPropagation();
      const userId = e.target.dataset.id;
      if (confirm("Are you sure you want to delete this user?")) {
        try {
          await firebase.firestore().collection("users").doc(userId).delete();
          alert("User deleted.");
          fetchUsers();
        } catch (err) {
          alert("Error deleting user: " + err.message);
        }
      }
    }
  });

  // Close edit user modal handler
  document.getElementById("cancelEditUserBtn").addEventListener("click", () => {
    document.getElementById("editUserModal").classList.add("hidden");
    document.getElementById("editUserForm").reset();
  });

  // Handle edit user form submission
  document.getElementById("editUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("editUserId").value;
    const name = document.getElementById("editUserName").value.trim();
    const role = document.getElementById("editUserRole").value;
    try {
      await firebase.firestore().collection("users").doc(userId).update({ name, role });
      alert("User updated successfully!");
      document.getElementById("editUserModal").classList.add("hidden");
      fetchUsers();
    } catch (error) {
      alert("Error updating user: " + error.message);
    }
  });

  // Add user form submit
  addUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = addUserForm.userName.value.trim();
    const email = addUserForm.userEmail.value.trim();
    const password = addUserForm.userPassword.value;
    const role = addUserForm.userRole.value;
    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;
      await firebase.firestore().collection("users").doc(uid).set({ name, email, role, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      alert("User added successfully!");
      addUserModal.classList.add("hidden");
      addUserForm.reset();
      fetchUsers();
    } catch (error) {
      alert("Error adding user: " + error.message);
    }
  });

  // Search/filter users locally (optional)
  userSearchInput.addEventListener("input", () => {
    const query = userSearchInput.value.toLowerCase();
    // This simple filtering works only on currently loaded users, you may want to handle server-side search for large data
    const filtered = Array.from(usersList.querySelectorAll("tr")).filter(tr => {
      const email = tr.children[1]?.textContent.toLowerCase() || "";
      const role = tr.children[2]?.textContent.toLowerCase() || "";
      return email.includes(query) || role.includes(query);
    });
    usersList.querySelectorAll("tr").forEach(tr => tr.style.display = "none");
    filtered.forEach(tr => tr.style.display = "");
  });

  // Initial fetch
  fetchUsers();
});
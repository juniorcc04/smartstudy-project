StudyMate

StudyMate is a web-based educational platform that allows students to access notes and quizzes, while administrators can manage content and users. It’s built with HTML, CSS, JavaScript, Tailwind CSS, Firebase (Auth & Firestore), and uses Font Awesome for icons.

Features

Admin Dashboard

Manage Notes: Add, edit, delete, sort, and paginate.
Manage Quizzes: Add, edit, delete, sort, and paginate.
Manage Users: View, add, edit, delete, sort, and paginate.
Responsive sidebar with Font Awesome icons.
Full CRUD operations connected to Firestore.
Clean and intuitive UI using Tailwind CSS.


Student Dashboard

View recently uploaded Notes and Quizzes.
Navigate between Dashboard, Notes, and Quizzes sections.
Pagination for Notes and Quizzes.
Responsive design with mobile support.


Authentication

Login and Signup pages.
Fully integrated with Firebase Authentication (Email/Password).
Users are redirected automatically to the appropriate dashboard.


Live Demo

Click here to view the live site(https://juniorcc04.github.io/studymate-project/)


Technologies Used

HTML5 & CSS3
JavaScript
Tailwind CSS
Font Awesome for icons
Firebase (Firestore & Authentication)
Responsive design for mobile and desktop




Project Structure

/css
  - style.css
/js
  - firebase-config.js
  - auth.js
  - admin-dashboard.js
  - student-dashboard.js
index.html
login.html
signup.html
admin-dashboard.html
student-dashboard.html

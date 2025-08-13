// Admin Sidebar
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');

  // If any essential elements are missing, just stop
  if (!sidebar || !overlay || !menuBtn) return;

  // Toggle sidebar on hamburger click
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  });

  // Hide sidebar when clicking overlay
  overlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  });

  const sections = document.querySelectorAll(".dashboard-section");
  const buttons = document.querySelectorAll(".sidebar-btn");

  function showSection(id) {
    sections.forEach(section => {
      section.classList.toggle("hidden", section.id !== id);
    });

    buttons.forEach(btn => {
      const targetId = "section-" + btn.id.replace("Btn", "");
      if (targetId === id) {
        btn.classList.add("bg-blue-600", "text-white");
        btn.classList.remove("opacity-70");
      } else {
        btn.classList.remove("bg-blue-600", "text-white");
        btn.classList.add("opacity-70");
      }
    });

    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      showSection("section-" + btn.id.replace("Btn", ""));
    });
  });

  // Default to notes section
  showSection("section-notes");
});



// Students Sidebar
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebarToggle");
  const buttons = document.querySelectorAll(".sidebar-btn");
  const sections = document.querySelectorAll(".dashboard-section");

  // Only run if sidebar and toggle button exist on the page
  if (!sidebar || !toggleBtn) return;

  function showSection(id) {
    sections.forEach(section => {
      section.classList.toggle("hidden", section.id !== id);
    });

    buttons.forEach(btn => {
      const targetId = "section-" + btn.id.replace("Btn", "");
      if (targetId === id) {
        btn.classList.add("bg-blue-600", "text-white");
        btn.classList.remove("opacity-70");
      } else {
        btn.classList.remove("bg-blue-600", "text-white");
        btn.classList.add("opacity-70");
      }
    });

    // Hide sidebar on mobile after selection
    if (window.innerWidth < 768) {
      sidebar.classList.add("-translate-x-full");
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      showSection("section-" + btn.id.replace("Btn", ""));
    });
  });

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
  });

  // Show first section by default
  if (sections.length > 0) {
    showSection(sections[0].id);
  }
});
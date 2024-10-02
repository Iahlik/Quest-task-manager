document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
  
    // Cargar tareas al inicio
    fetchTasks();
  
    addTaskBtn.addEventListener('click', () => {
      const title = taskInput.value.trim();
      if (title) {
        addTask(title);
        taskInput.value = '';
      }
    });
  
    function fetchTasks() {
      fetch('/api/tasks')
        .then(response => response.json())
        .then(tasks => {
          taskList.innerHTML = '';
          tasks.forEach(task => {
            const li = document.createElement('li');
            li.classList.add('task-item');
            li.innerHTML = `
              <span>${task.title}</span>
              <button onclick="deleteTask(${task.id})">Eliminar</button>
            `;
            taskList.appendChild(li);
          });
        });
    }
  
    function addTask(title) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })
        .then(response => response.json())
        .then(() => fetchTasks());
    }
  
    window.deleteTask = function (id) {
      fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })
        .then(() => fetchTasks());
    };
  });
  
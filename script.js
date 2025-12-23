document.addEventListener('DOMContentLoaded', async () => {
    // Referências dos Elementos
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const addGroupButton = document.getElementById('add-group-button');
    const deleteGroupButton = document.getElementById('delete-group-button');
    
    // Importando as funções do Firebase que injetamos no index.html
    const { getDoc, setDoc, doc } = window.FirebaseFirestore;

    let tasksByGroup = {};
    let currentGroup = '';
    const DOC_REF = doc(window.db, "todoAppList", "masterList");

    // --- FUNÇÕES DE PERSISTÊNCIA (FIREBASE) ---
    async function saveTasks() {
        try {
            await setDoc(DOC_REF, tasksByGroup);
        } catch (e) {
            console.error("Erro ao salvar no Firebase: ", e);
        }
    }

    async function loadTasks() {
        try {
            const docSnap = await getDoc(DOC_REF);
            if (docSnap.exists()) {
                tasksByGroup = docSnap.data();
            } else {
                tasksByGroup = { 'Geral': [] };
                await saveTasks();
            }
            populateGroupSelect();
            renderTasks();
        } catch (e) {
            console.error("Erro ao carregar: ", e);
        }
    }

    // --- FUNÇÕES DE GRUPO ---
    function populateGroupSelect() {
        groupSelect.innerHTML = '';
        const groupNames = Object.keys(tasksByGroup);
        if (groupNames.length === 0) {
            tasksByGroup['Geral'] = [];
            groupNames.push('Geral');
        }
        groupNames.forEach(groupName => {
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            groupSelect.appendChild(option);
        });
        currentGroup = groupSelect.value;
    }

    async function addGroup() {
        const groupName = newGroupInput.value.trim();
        if (!groupName || tasksByGroup[groupName]) return;
        tasksByGroup[groupName] = [];
        newGroupInput.value = '';
        populateGroupSelect();
        groupSelect.value = groupName;
        currentGroup = groupName;
        renderTasks();
        await saveTasks();
    }

    async function deleteGroup() {
        if (Object.keys(tasksByGroup).length === 1) return;
        if (confirm(`Excluir grupo "${currentGroup}"?`)) {
            delete tasksByGroup[currentGroup];
            currentGroup = Object.keys(tasksByGroup)[0];
            populateGroupSelect();
            renderTasks();
            await saveTasks();
        }
    }

    // --- TAREFAS ---
    function createTaskElement(task, taskIndex) {
        const listItem = document.createElement('li');
        listItem.classList.toggle('completed', task.completed);
        listItem.innerHTML = `
            <span class="task-text">${task.text}</span>
            <div class="actions">
                <button class="complete-btn">✔️</button>
                <button class="edit-btn">✏️</button>
                <button class="delete-btn">🗑️</button>
            </div>
        `;

        listItem.querySelector('.complete-btn').onclick = async () => {
            tasksByGroup[currentGroup][taskIndex].completed = !tasksByGroup[currentGroup][taskIndex].completed;
            renderTasks();
            await saveTasks();
        };

        listItem.querySelector('.edit-btn').onclick = async () => {
            const newText = prompt("Editar:", task.text);
            if (newText) {
                tasksByGroup[currentGroup][taskIndex].text = newText;
                renderTasks();
                await saveTasks();
            }
        };

        listItem.querySelector('.delete-btn').onclick = async () => {
            tasksByGroup[currentGroup].splice(taskIndex, 1);
            renderTasks();
            await saveTasks();
        };

        return listItem;
    }

    async function addTask() {
        const taskText = taskInput.value.trim();
        if (!taskText || !currentGroup) return;
        tasksByGroup[currentGroup].push({ text: taskText, completed: false });
        taskInput.value = '';
        renderTasks();
        await saveTasks();
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const currentTasks = tasksByGroup[currentGroup] || [];
        currentTasks.forEach((task, index) => {
            taskList.appendChild(createTaskElement(task, index));
        });
    }

    // --- EVENTOS ---
    addButton.onclick = addTask;
    taskInput.onkeypress = (e) => e.key === 'Enter' && addTask();
    addGroupButton.onclick = addGroup;
    deleteGroupButton.onclick = deleteGroup;
    groupSelect.onchange = (e) => {
        currentGroup = e.target.value;
        renderTasks();
    };

    // Início
    await loadTasks();
});

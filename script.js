document.addEventListener('DOMContentLoaded', async () => {
    // --- Referências do Firebase (Exportadas no index.html) ---
    const db = window.db;
    const { doc, getDoc, setDoc } = window.FirebaseFirestore;

    // --- Referências dos Elementos DOM ---
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const addGroupButton = document.getElementById('add-group-button');
    const deleteGroupButton = document.getElementById('delete-group-button');
    
    // --- Variáveis de Estado ---
    let tasksByGroup = {}; 
    let currentGroup = '';
    
    // Referência única para o documento no Firestore
    const DOC_REF = doc(db, "todoAppList", "masterList");

    // --- FUNÇÕES DE PERSISTÊNCIA (FIRESTORE) ---
    
    async function saveTasks() {
        try {
            // Sincroniza o objeto completo com o Firestore
            await setDoc(DOC_REF, tasksByGroup);
            console.log("Dados sincronizados com sucesso no Firestore.");
        } catch (error) {
            console.error("Erro ao escrever no Firestore: ", error);
        }
    }

    async function loadTasks() {
        try {
            const docSnap = await getDoc(DOC_REF);

            if (docSnap.exists()) {
                tasksByGroup = docSnap.data(); 
            } else {
                // Inicialização para novos usuários
                tasksByGroup = { 'Geral': [] };
                await saveTasks(); 
            }
            
            populateGroupSelect();
            
            // Define o grupo inicial
            if (groupSelect.options.length > 0) {
                currentGroup = groupSelect.value;
            } else {
                currentGroup = 'Geral';
            }
            
            renderTasks();
            
        } catch (error) {
            console.error("Erro ao carregar dados do Firestore: ", error);
            // Fallback local caso o Firebase falhe
            tasksByGroup = { 'Geral': [] }; 
            populateGroupSelect();
            renderTasks();
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
        
        if (currentGroup && tasksByGroup[currentGroup]) {
             groupSelect.value = currentGroup;
        } else {
             currentGroup = groupNames[0];
             groupSelect.value = currentGroup;
        }
    }

    async function addGroup() {
        const groupName = newGroupInput.value.trim();
        
        if (groupName === "") {
            alert("Insira um nome para o novo grupo.");
            return;
        }

        if (tasksByGroup[groupName]) {
            alert(`O grupo "${groupName}" já existe.`);
            return;
        }

        tasksByGroup[groupName] = []; 
        newGroupInput.value = '';
        
        populateGroupSelect();
        currentGroup = groupName;
        groupSelect.value = currentGroup;
        renderTasks(); 
        await saveTasks(); 
    }
    
    async function deleteGroup() {
        if (Object.keys(tasksByGroup).length === 1) {
            alert("Você não pode excluir o último grupo.");
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o grupo "${currentGroup}"?`)) {
            delete tasksByGroup[currentGroup];
            currentGroup = Object.keys(tasksByGroup)[0];
            
            populateGroupSelect();
            renderTasks();
            await saveTasks(); 
        }
    }

    // --- FUNÇÕES DE TAREFAS ---

    function createTaskElement(task, taskIndex) {
        const listItem = document.createElement('li');
        listItem.classList.toggle('completed', task.completed); 
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = task.text;
        taskSpan.classList.add('task-text');
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        const completeButton = document.createElement('button');
        completeButton.textContent = '✔️';
        completeButton.classList.add('complete-btn');
        completeButton.onclick = async () => {
            tasksByGroup[currentGroup][taskIndex].completed = !tasksByGroup[currentGroup][taskIndex].completed;
            renderTasks();
            await saveTasks();
        };

        const editButton = document.createElement('button');
        editButton.textContent = '✏️';
        editButton.classList.add('edit-btn');
        editButton.onclick = async () => {
            const newText = prompt("Edite sua tarefa:", task.text);
            if (newText && newText.trim() !== "") {
                tasksByGroup[currentGroup][taskIndex].text = newText.trim();
                renderTasks();
                await saveTasks();
            }
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = async () => {
            tasksByGroup[currentGroup].splice(taskIndex, 1);
            renderTasks();
            await saveTasks();
        };

        listItem.appendChild(taskSpan);
        actionsDiv.appendChild(completeButton);
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
        listItem.appendChild(actionsDiv);

        return listItem;
    }

    async function addTask() {
        if (!currentGroup) {
            alert("Selecione um grupo.");
            return;
        }
        
        const taskText = taskInput.value.trim();
        if (taskText === "") return;
        
        tasksByGroup[currentGroup].push({
            text: taskText,
            completed: false
        });

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

    // --- EVENT LISTENERS ---
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    addGroupButton.addEventListener('click', addGroup);
    deleteGroupButton.addEventListener('click', deleteGroup);
    groupSelect.addEventListener('change', (e) => {
        currentGroup = e.target.value;
        renderTasks();
    });

    // Inicia o app carregando do Firestore
    await loadTasks();
});

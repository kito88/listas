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
    
    // Referência única para o documento no Firestore (Sintaxe Modular v10)
    const DOC_REF = doc(db, "todoAppList", "masterList");

    // --- FUNÇÕES DE PERSISTÊNCIA (FIRESTORE) ---
    
    /**
     * Salva o objeto 'tasksByGroup' completo no Firestore.
     */
    async function saveTasks() {
        try {
            // No Firebase v10 usamos setDoc passando a referência e os dados
            await setDoc(DOC_REF, tasksByGroup);
            console.log("Dados sincronizados com sucesso no Firestore.");
        } catch (error) {
            console.error("Erro ao escrever no Firestore: ", error);
        }
    }

    /**
     * Carrega o objeto de dados do Firestore.
     */
    async function loadTasks() {
        try {
            // No Firebase v10 usamos getDoc
            const docSnap = await getDoc(DOC_REF);

            if (docSnap.exists()) {
                tasksByGroup = docSnap.data(); 
            } else {
                // Se o documento não existe, inicializa com o grupo Geral
                tasksByGroup = { 'Geral': [] };
                await saveTasks(); 
            }
            
            populateGroupSelect();
            
            // Define o grupo inicial
            const groupNames = Object.keys(tasksByGroup);
            currentGroup = groupSelect.options[0] ? groupSelect.options[0].value : 'Geral';
            groupSelect.value = currentGroup;
            
            renderTasks();
            
        } catch (error) {
            console.error("Erro ao carregar dados do Firestore: ", error);
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

        if (confirm(`Tem certeza que deseja excluir o grupo "${currentGroup}" e todas as suas tarefas?`)) {
            delete tasksByGroup[currentGroup];
            currentGroup = Object.keys(tasksByGroup)[0];
            
            populateGroupSelect();
            renderTasks();
            await saveTasks(); 
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E TAREFAS ---

    function createTaskElement(task, taskIndex) {
        const listItem = document.createElement('li');
        listItem.classList.toggle('completed', task.completed); 
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = task.text;
        taskSpan.classList.add('task-text');
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        const completeButton = document.createElement('button');
        completeButton.textContent = '✔️ Concluir';
        completeButton.classList.add('complete-btn');
        completeButton.onclick = async () => {
            tasksByGroup[currentGroup][taskIndex].completed = !tasksByGroup[currentGroup][taskIndex].completed;
            renderTasks();
            await saveTasks();
        };

        const editButton = document.createElement('button');
        editButton.textContent = '✏️ Editar';
        editButton.classList.add('edit-btn');
        editButton.onclick = async () => {
            const newText = prompt("Edite sua tarefa:", task.text);
            if (newText !== null && newText.trim() !== "") {
                tasksByGroup[currentGroup][taskIndex].text = newText.trim();
                renderTasks();
                await saveTasks();
            }
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️ Excluir';
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
            alert("Por favor, selecione ou crie um grupo primeiro.");
            return;
        }
        
        const taskText = taskInput.value.trim();
        if (taskText === "") {
            alert("Por favor, insira uma tarefa.");
            return;
        }
        
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
            const listItem = createTaskElement(task, index);
            taskList.appendChild(listItem);
        });
    }

    // --- EVENT LISTENERS ---
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    addGroupButton.addEventListener('click', addGroup);
    deleteGroupButton.addEventListener('click', deleteGroup);

    groupSelect.addEventListener('change', (event) => {
        currentGroup = event.target.value;
        renderTasks();
    });

    // Inicia o carregamento dos dados do Firestore
    await loadTasks();
});
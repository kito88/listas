document.addEventListener('DOMContentLoaded', () => {
    // --- Referências dos Elementos DOM ---
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const addGroupButton = document.getElementById('add-group-button');
    const deleteGroupButton = document.getElementById('delete-group-button');
    
    // --- Variáveis de Estado ---
    let tasksByGroup = {}; // Objeto central de dados: { 'Grupo': [tarefa1, tarefa2], ... }
    let currentGroup = '';
    
    // ID fixo do documento no Firestore para armazenar todos os dados
    // ESTE CÓDIGO DEPENDE QUE 'db' E 'listCollection' FORAM DEFINIDOS NO SEU index.html
    const DOC_ID = 'masterList'; 
    const listCollection = db.collection("todoAppList"); // Assuming 'db' is available from index.html

    // Estrutura de uma Tarefa: { text: '...', completed: false }

    // --- FUNÇÕES DE PERSISTÊNCIA (FIRESTORE) ---
    
    /**
     * Salva o objeto 'tasksByGroup' completo no Firestore.
     * Deve ser chamado sempre que os dados forem modificados.
     */
    async function saveTasks() {
        try {
            await listCollection.doc(DOC_ID).set(tasksByGroup);
            console.log("Dados sincronizados com sucesso no Firestore.");
        } catch (error) {
            console.error("Erro ao escrever no Firestore: ", error);
            // Poderia adicionar feedback visual ao usuário aqui
        }
    }

    /**
     * Carrega o objeto de dados do Firestore.
     */
    async function loadTasks() {
        try {
            const doc = await listCollection.doc(DOC_ID).get();

            if (doc.exists) {
                tasksByGroup = doc.data(); 
            } else {
                // Se o documento não existe (primeira execução), inicializa
                tasksByGroup = { 'Geral': [] };
                await saveTasks(); // Cria o documento inicial no Firestore
            }
            
            // Configura o grupo inicial e popula o seletor
            populateGroupSelect();
            
            // Seleciona o grupo inicial
            const groupNames = Object.keys(tasksByGroup);
            currentGroup = groupSelect.options[0] ? groupSelect.options[0].value : 'Geral';
            groupSelect.value = currentGroup;
            
            renderTasks();
            
        } catch (error) {
            console.error("Erro ao carregar dados do Firestore: ", error);
            alert("Erro ao conectar com o banco de dados. Verifique a configuração do Firebase.");
            // Falha grave, inicializa a UI localmente, sem sincronização
            tasksByGroup = { 'Geral': [] }; 
            populateGroupSelect();
            renderTasks();
        }
    }

    // --- FUNÇÕES DE GRUPO ---
    function populateGroupSelect() {
        groupSelect.innerHTML = ''; // Limpa as opções existentes
        
        const groupNames = Object.keys(tasksByGroup);
        if (groupNames.length === 0) {
            tasksByGroup['Geral'] = []; // Garante que 'Geral' sempre exista
            groupNames.push('Geral');
        }

        groupNames.forEach(groupName => {
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            groupSelect.appendChild(option);
        });
        
        // Define o grupo atualmente selecionado
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

        tasksByGroup[groupName] = []; // Cria a nova lista vazia no objeto
        newGroupInput.value = '';
        
        populateGroupSelect();
        currentGroup = groupName;
        groupSelect.value = currentGroup;
        renderTasks(); // Renderiza a nova lista vazia
        await saveTasks(); // Sincroniza com o Firebase
    }
    
    async function deleteGroup() {
        if (Object.keys(tasksByGroup).length === 1) {
            alert("Você não pode excluir o último grupo.");
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o grupo "${currentGroup}" e todas as suas tarefas?`)) {
            delete tasksByGroup[currentGroup];
            
            // Seleciona o primeiro grupo restante como o novo grupo ativo
            currentGroup = Object.keys(tasksByGroup)[0];
            
            populateGroupSelect();
            renderTasks();
            await saveTasks(); // Sincroniza com o Firebase
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E TAREFAS ---

    // Função para criar o HTML de uma tarefa
    function createTaskElement(task, taskIndex) {
        const listItem = document.createElement('li');
        listItem.classList.toggle('completed', task.completed); 
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = task.text;
        taskSpan.classList.add('task-text');
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        // Botão de Conclusão
        const completeButton = document.createElement('button');
        completeButton.textContent = '✔️ Concluir';
        completeButton.classList.add('complete-btn');
        completeButton.onclick = async () => { // Função agora é async
            // Alterna o estado de 'completed' no objeto de dados
            tasksByGroup[currentGroup][taskIndex].completed = !tasksByGroup[currentGroup][taskIndex].completed;
            renderTasks(); // Renderiza novamente para atualizar a classe
            await saveTasks(); // Sincroniza
        };

        // Botão de Edição
        const editButton = document.createElement('button');
        editButton.textContent = '✏️ Editar';
        editButton.classList.add('edit-btn');
        editButton.onclick = async () => { // Função agora é async
            const newText = prompt("Edite sua tarefa:", task.text);
            if (newText !== null && newText.trim() !== "") {
                tasksByGroup[currentGroup][taskIndex].text = newText.trim();
                renderTasks(); // Renderiza novamente para atualizar o texto
                await saveTasks(); // Sincroniza
            }
        };

        // Botão de Exclusão
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️ Excluir';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = async () => { // Função agora é async
            // Remove a tarefa do array do grupo atual
            tasksByGroup[currentGroup].splice(taskIndex, 1);
            renderTasks(); // Renderiza novamente
            await saveTasks(); // Sincroniza
        };

        // Montagem
        listItem.appendChild(taskSpan);
        actionsDiv.appendChild(completeButton);
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
        listItem.appendChild(actionsDiv);

        return listItem;
    }

    // Função principal para adicionar nova tarefa
    async function addTask() { // Função agora é async
        if (!currentGroup) {
            alert("Por favor, selecione ou crie um grupo primeiro.");
            return;
        }
        
        const taskText = taskInput.value.trim();

        if (taskText === "") {
            alert("Por favor, insira uma tarefa.");
            return;
        }
        
        // Adiciona a nova tarefa ao array do grupo ativo
        tasksByGroup[currentGroup].push({
            text: taskText,
            completed: false
        });

        taskInput.value = ''; 
        renderTasks(); // Renderiza a lista atualizada
        await saveTasks(); // Sincroniza
    }
    
    // Função para atualizar a lista de tarefas visível (Não precisa ser async)
    function renderTasks() {
        taskList.innerHTML = ''; // Limpa a lista
        
        const currentTasks = tasksByGroup[currentGroup] || [];
        
        currentTasks.forEach((task, index) => {
            const listItem = createTaskElement(task, index);
            taskList.appendChild(listItem);
        });
    }

    // --- EVENT LISTENERS ---
    
    // Evento de Adicionar Tarefa
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // Evento de Criação de Grupo
    addGroupButton.addEventListener('click', addGroup);
    
    // Evento de Exclusão de Grupo
    deleteGroupButton.addEventListener('click', deleteGroup);

    // Evento de Mudança de Grupo Selecionado
    groupSelect.addEventListener('change', (event) => {
        currentGroup = event.target.value;
        renderTasks(); // Recarrega a lista de tarefas para o novo grupo
    });

    // Inicia o aplicativo
    loadTasks();
});

document.addEventListener('DOMContentLoaded', () => {
    // Referências dos Elementos
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const addGroupButton = document.getElementById('add-group-button');
    const deleteGroupButton = document.getElementById('delete-group-button');
    
    // Armazenamento de Dados Central: Objeto aninhado { 'Grupo': [tarefa1, tarefa2], ... }
    // A chave do objeto é o nome do grupo, o valor é um array de objetos de tarefas.
    let tasksByGroup = {};
    let currentGroup = '';

    // Estrutura de uma Tarefa: { text: '...', completed: false }

    // --- FUNÇÕES DE PERSISTÊNCIA (Local Storage) ---
    function saveTasks() {
        localStorage.setItem('tasksByGroup', JSON.stringify(tasksByGroup));
    }

    function loadTasks() {
        const storedData = localStorage.getItem('tasksByGroup');
        if (storedData) {
            tasksByGroup = JSON.parse(storedData);
        } else {
            // Inicializa com um grupo padrão se não houver dados
            tasksByGroup['Geral'] = [];
        }
        
        // Configura o grupo inicial e popula o seletor
        populateGroupSelect();
        
        // Seleciona o primeiro grupo ou 'Geral'
        currentGroup = groupSelect.options[0] ? groupSelect.options[0].value : 'Geral';
        groupSelect.value = currentGroup;
        
        renderTasks();
    }

    // --- FUNÇÕES DE GRUPO ---
    function populateGroupSelect() {
        groupSelect.innerHTML = ''; // Limpa as opções existentes
        
        const groupNames = Object.keys(tasksByGroup);
        if (groupNames.length === 0) {
            tasksByGroup['Geral'] = []; // Garante que 'Geral' sempre exista se a lista estiver vazia
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

    function addGroup() {
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
        saveTasks();
    }
    
    function deleteGroup() {
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
            saveTasks();
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E TAREFAS ---

    // Função para criar o HTML de uma tarefa
    function createTaskElement(task, taskIndex) {
        const listItem = document.createElement('li');
        listItem.classList.toggle('completed', task.completed); // Aplica a classe se estiver concluída
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = task.text;
        taskSpan.classList.add('task-text');
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        // Botão de Conclusão
        const completeButton = document.createElement('button');
        completeButton.textContent = '✔️ Concluir';
        completeButton.classList.add('complete-btn');
        completeButton.onclick = () => {
            // Alterna o estado de 'completed' no objeto de dados
            tasksByGroup[currentGroup][taskIndex].completed = !tasksByGroup[currentGroup][taskIndex].completed;
            renderTasks(); // Renderiza novamente para atualizar a classe
            saveTasks();
        };

        // Botão de Edição
        const editButton = document.createElement('button');
        editButton.textContent = '✏️ Editar';
        editButton.classList.add('edit-btn');
        editButton.onclick = () => {
            const newText = prompt("Edite sua tarefa:", task.text);
            if (newText !== null && newText.trim() !== "") {
                tasksByGroup[currentGroup][taskIndex].text = newText.trim();
                renderTasks(); // Renderiza novamente para atualizar o texto
                saveTasks();
            }
        };

        // Botão de Exclusão
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️ Excluir';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = () => {
            // Remove a tarefa do array do grupo atual
            tasksByGroup[currentGroup].splice(taskIndex, 1);
            renderTasks(); // Renderiza novamente
            saveTasks();
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
    function addTask() {
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
        saveTasks();
    }
    
    // Função para atualizar a lista de tarefas visível
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
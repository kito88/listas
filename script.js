document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pegamos as funções e o banco que você exportou no index.html
    const db = window.db;
    const { doc, getDoc, setDoc, collection } = window.FirebaseFirestore;

    // 2. Referências dos Elementos DOM
    const taskInput = document.getElementById('task-input');
    const addButton = document.getElementById('add-button');
    const taskList = document.getElementById('task-list');
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const addGroupButton = document.getElementById('add-group-button');
    const deleteGroupButton = document.getElementById('delete-group-button');

    // 3. Configuração do Documento no Firebase
    // Aqui está a correção: usamos doc(db, ...) em vez de db.doc(...)
    const DOC_REF = doc(db, "todoAppList", "masterList");

    let tasksByGroup = {};
    let currentGroup = '';

    // --- FUNÇÕES DE PERSISTÊNCIA ---

    async function saveTasks() {
        try {
            // No Firebase v10 usamos setDoc(referencia, dados)
            await setDoc(DOC_REF, tasksByGroup);
            console.log("Sincronizado com Firebase!");
        } catch (e) {
            console.error("Erro ao salvar: ", e);
        }
    }

    async function loadTasks() {
        try {
            // No Firebase v10 usamos getDoc(referencia)
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

    // ... (restante das suas funções populateGroupSelect, renderTasks, etc.)
    // Certifique-se de que todas elas chamam 'await saveTasks()' quando alterarem dados
    
    // Inicializa o carregamento
    await loadTasks();
});

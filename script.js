// Configuração padrão compartilhada entre as instâncias do CodeMirror
const cmConfig = {
    theme: 'dracula',
    lineNumbers: true,
    autoCloseBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    matchBrackets: true
};

// Inicialização isolada de cada editor de linguagem
const editors = {
    html: CodeMirror(document.getElementById('wrapper-html'), {
        ...cmConfig,
        mode: 'xml',
        value: '<h1 class="glow">Sistema Online</h1>\n<p>Renderização em tempo real do front-end integrado.</p>'
    }),
    css: CodeMirror(document.getElementById('wrapper-css'), {
        ...cmConfig,
        mode: 'css',
        value: '.glow {\n    color: #00F0FF;\n    text-shadow: 0 0 10px #00F0FF;\n    font-family: sans-serif;\n}'
    }),
    js: CodeMirror(document.getElementById('wrapper-js'), {
        ...cmConfig,
        mode: 'javascript',
        value: 'console.log("Interface Web pronta para uso.");'
    }),
    py: CodeMirror(document.getElementById('wrapper-py'), {
        ...cmConfig,
        mode: 'python',
        value: '# Teste Avançado de Input\nnome = input("Qual é o seu nome? ")\ncidade = input("De qual cidade você é? ")\nprint(f"\\nOlá {nome}! Que legal saber que você mora em {cidade}.")'
    })
};

// ==========================================
// MOTOR INTELIGENTE PARA CELULAR (EMMET E AUTO-FECHAMENTO)
// ==========================================
editors.html.on("change", (cm, changeObj) => {
    // 1. Snippet do Emmet "!"
    if (changeObj.origin === "+input" && cm.getValue().trim() === "!") {
        const htmlBoilerplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Projeto</title>
</head>
<body>
    
</body>
</html>`;
        cm.setValue(htmlBoilerplate);
        cm.setCursor({line: 8, ch: 4});
        return; // Interrompe para não executar as regras abaixo
    }

    // 2. Auto-fechamento à prova de falhas para Teclado Mobile
    if (changeObj.origin === "+input" && changeObj.text.join('').includes(">")) {
        const cursor = cm.getCursor();
        const lineText = cm.getLine(cursor.line).slice(0, cursor.ch);
        
        const match = lineText.match(/<([a-zA-Z0-9\-]+)[^>]*>$/);
        
        if (match) {
            const tagName = match[1].toLowerCase();
            const selfClosingTags = ['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr'];
            
            if (!selfClosingTags.includes(tagName)) {
                cm.replaceRange(`</${tagName}>`, cursor);
                cm.setCursor(cursor);
            }
        }
    }
});

// ==========================================
// GERENCIADOR DE ABAS E UI
// ==========================================
const tabButtons = document.querySelectorAll('.tab-btn');
const codeWrappers = document.querySelectorAll('.code-wrapper');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        codeWrappers.forEach(wrapper => wrapper.classList.remove('active'));

        button.classList.add('active');
        const lang = button.getAttribute('data-lang');
        document.getElementById(`wrapper-${lang}`).classList.add('active');

        editors[lang].refresh();
    });
});

// ==========================================
// SISTEMA DE ARQUIVOS VIRTUAL EM MEMÓRIA (VFS)
// ==========================================
// Declaramos as variáveis PRIMEIRO para que o Live Preview possa usá-las depois!
const virtualFileSystem = {}; 

function injectVirtualFiles(code) {
    let finalCode = code;
    const fileNames = Object.keys(virtualFileSystem);
    
    for (let fileName of fileNames) {
        const blobUrl = virtualFileSystem[fileName];
        finalCode = finalCode.split(fileName).join(blobUrl);
    }
    return finalCode;
}

const btnToggleExplorer = document.getElementById('btn-toggle-explorer');
const explorerPanel = document.getElementById('file-explorer');
const btnAddFile = document.getElementById('btn-add-file');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');

if (btnToggleExplorer) {
    btnToggleExplorer.addEventListener('click', () => {
        explorerPanel.classList.toggle('open');
    });
}

if (btnAddFile) {
    btnAddFile.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        
        const emptyState = fileList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (virtualFileSystem[file.name]) continue;

            const blobUrl = URL.createObjectURL(file);
            virtualFileSystem[file.name] = blobUrl;

            const li = document.createElement('li');
            li.className = 'file-item';
            
            let iconClass = 'fas fa-file'; 
            if (file.type.startsWith('image/')) iconClass = 'fas fa-image';
            else if (file.type.startsWith('audio/')) iconClass = 'fas fa-music';
            else if (file.type.startsWith('video/')) iconClass = 'fas fa-video';

            // Adicionamos um span para o nome e o botão de lixeira do FontAwesome
            li.innerHTML = `
                <span class="file-name-span" style="cursor: pointer;"><i class="${iconClass}"></i> ${file.name}</span>
                <button class="btn-remove-file" title="Remover Arquivo"><i class="fas fa-trash"></i></button>
            `;
            
            // O clique para copiar agora fica só no nome do arquivo (span)
            const nameSpan = li.querySelector('.file-name-span');
            nameSpan.addEventListener('click', () => {
                navigator.clipboard.writeText(file.name);
                alert(`Nome "${file.name}" copiado! Basta colar no seu HTML ou JS.`);
            });

            // Lógica do botão de remover (Lixeira)
            const btnRemove = li.querySelector('.btn-remove-file');
            btnRemove.addEventListener('click', () => {
                // 1. Remove da memória RAM do navegador (evita memory leak)
                URL.revokeObjectURL(virtualFileSystem[file.name]);
                
                // 2. Apaga do nosso objeto de controle interno
                delete virtualFileSystem[file.name];
                
                // 3. Remove a linha da interface gráfica
                li.remove();

                // 4. Se a lista ficou vazia, volta a mensagem de estado inicial
                if (Object.keys(virtualFileSystem).length === 0) {
                    fileList.innerHTML = '<li class="empty-state" style="color: #6272a4; text-align: center; padding: 20px; font-size: 0.9rem;">Nenhum asset carregado.<br>Memória RAM limpa.</li>';
                }
            });

            fileList.appendChild(li);
        }
        
        fileInput.value = '';
    });
}

// ==========================================
// RENDERIZAÇÃO DO AMBIENTE WEB (IFRAME)
// ==========================================
function updatePreview() {
    const htmlCode = editors.html.getValue();
    const cssCode = `<style>${editors.css.getValue()}</style>`;
    const jsCode = `<script>${editors.js.getValue()}<\/script>`; 
    
    const combinedCode = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            ${cssCode}
        </head>
        <body>
            ${htmlCode}
            ${jsCode}
        </body>
        </html>
    `;

    const iframe = document.getElementById('preview-frame');
    // Agora o injectVirtualFiles já existe quando essa linha rodar!
    iframe.srcdoc = injectVirtualFiles(combinedCode);
}

document.getElementById('btn-run-web').addEventListener('click', updatePreview);
// Chama a primeira vez para carregar a tela preta com neon
updatePreview();

// =======================================================
// ENGINE PYTHON (PYODIDE) COM INPUT CUSTOMIZADO
// =======================================================
const terminalOutput = document.getElementById('terminal-output');
const btnRunPy = document.getElementById('btn-run-py');

let pyodideInstance = null;

window.printToTerminal = function(text, isError = false) {
    const line = document.createElement('div');
    line.className = isError ? 'terminal-line terminal-error' : 'terminal-line';
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
};

window.customPythonInput = function(promptText) {
    let userInput = window.prompt(promptText);
    return userInput !== null ? userInput : "";
};

btnRunPy.addEventListener('click', async () => {
    const pyCode = editors.py.getValue();
    
    terminalOutput.innerHTML = '<span class="prompt">>_</span> [Console Python Runtime Inicializado]<br><br>';

    if (!pyodideInstance) {
        window.printToTerminal('[!] Baixando interpretador Python (WebAssembly) via CDN...');
        window.printToTerminal('[!] Por favor, aguarde alguns segundos dependendo da sua conexão...');
        
        btnRunPy.disabled = true;
        btnRunPy.textContent = 'Carregando WASM...';
        btnRunPy.style.opacity = '0.5';
        
        try {
            pyodideInstance = await loadPyodide({
                stdout: (text) => window.printToTerminal(text),
                stderr: (text) => window.printToTerminal(text, true)
            });

            await pyodideInstance.runPythonAsync(`
import builtins
import js

def custom_input(prompt=""):
    js.window.printToTerminal(str(prompt))
    resposta = js.window.customPythonInput(str(prompt))
    js.window.printToTerminal(resposta + "\\n")
    return resposta

builtins.input = custom_input
            `);

            window.printToTerminal('[+] Engine Python injetado com sucesso no navegador!');
            window.printToTerminal('--------------------------------------------------\n');
        } catch (err) {
            window.printToTerminal('Falha crítica de inicialização: ' + err.message, true);
            btnRunPy.disabled = false;
            btnRunPy.textContent = '▶ Executar Python';
            btnRunPy.style.opacity = '1';
            return;
        }
        
        btnRunPy.disabled = false;
        btnRunPy.textContent = '▶ Executar Python';
        btnRunPy.style.opacity = '1';
    }

    try {
        await pyodideInstance.runPythonAsync(pyCode);
    } catch (err) {
        window.printToTerminal(err.message, true);
    }
    
    window.printToTerminal('\n< Processo Finalizado >');
});

// ==========================================
// LÓGICA DO MODAL (MENU HAMBÚRGUER)
// ==========================================
const btnMenu = document.getElementById('btn-menu');
const modalOverlay = document.getElementById('info-modal');
const btnCloseModal = document.getElementById('close-modal');
const modalTabs = document.querySelectorAll('.m-tab-btn');
const modalContents = document.querySelectorAll('.m-content');

btnMenu.addEventListener('click', () => modalOverlay.classList.add('open'));
btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) modalOverlay.classList.remove('open');
});

modalTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        modalTabs.forEach(t => t.classList.remove('active'));
        modalContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});

// ==========================================
// LÓGICA DE DOWNLOAD DE CÓDIGO
// ==========================================
document.getElementById('btn-download').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    if(!activeTab) return;
    
    const lang = activeTab.getAttribute('data-lang');
    const code = editors[lang].getValue();
    
    let fileName = 'codigo.txt';
    let mimeType = 'text/plain';
    
    if (lang === 'html') {
        fileName = 'index.html';
        mimeType = 'text/html';
    } else if (lang === 'css') {
        fileName = 'style.css';
        mimeType = 'text/css';
    } else if (lang === 'js') {
        fileName = 'script.js';
        mimeType = 'text/javascript';
    } else if (lang === 'py') {
        fileName = 'main.py';
        mimeType = 'text/x-python';
    }

    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

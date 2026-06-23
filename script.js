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
    // Se a última coisa digitada incluir um ">", o sistema entra em ação
    if (changeObj.origin === "+input" && changeObj.text.join('').includes(">")) {
        const cursor = cm.getCursor();
        const lineText = cm.getLine(cursor.line).slice(0, cursor.ch);
        
        // Regex: Lê a linha até o cursor e descobre qual foi a última tag aberta (ex: <h1>, <div class="x">)
        const match = lineText.match(/<([a-zA-Z0-9\-]+)[^>]*>$/);
        
        if (match) {
            const tagName = match[1].toLowerCase();
            // Lista de tags que não precisam ser fechadas no HTML
            const selfClosingTags = ['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr'];
            
            if (!selfClosingTags.includes(tagName)) {
                // Injeta a tag de fechamento correta após o cursor
                cm.replaceRange(`</${tagName}>`, cursor);
                // Move o cursor de volta para o meio das tags para você poder digitar!
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
    iframe.srcdoc = combinedCode;
}

document.getElementById('btn-run-web').addEventListener('click', updatePreview);
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

// Abrir e Fechar Modal
btnMenu.addEventListener('click', () => modalOverlay.classList.add('open'));
btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('open'));
// Fechar ao clicar fora da janela
modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) modalOverlay.classList.remove('open');
});

// Navegação dentro do Modal
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
    // 1. Descobre qual aba principal está ativa
    const activeTab = document.querySelector('.tab-btn.active');
    if(!activeTab) return;
    
    const lang = activeTab.getAttribute('data-lang');
    
    // 2. Extrai o código daquele editor específico
    const code = editors[lang].getValue();
    
    // 3. Define o nome e extensão corretos do arquivo
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

    // 4. Criação do arquivo virtual e disparo do download nativo
    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    
    // 5. Limpeza de memória
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
document.addEventListener('DOMContentLoaded', () => {
    // Sample outputs for the default snippets (used only when unedited)
    const simulatedOutputs = {
        'array-cpp': "1 2 3 4 5 ",
        'array-python': "1 2 3 4 5 ",
        'stack-infix-postfix-cpp': "abcd^e-*f^+",
        'stack-infix-postfix-python': "abcd^e-*f^+",
        'stack-infix-prefix-cpp': "*-a/bc-/akl",
        'stack-infix-prefix-python': "*-a/bc-/akl",
        'stack-postfix-eval-cpp': "-4",
        'stack-postfix-eval-python': "-4",
        'queue-cpp': "10 20 30 ",
        'queue-python': "10 20 30 ",
        'trees-cpp': "Inorder: 2 1 3 \nPreorder: 1 2 3 \nPostorder: 2 3 1 ",
        'trees-python': "Inorder: 2 1 3 \nPreorder: 1 2 3 \nPostorder: 2 3 1 "
    };

    const originalCodeMap = new Map();
    // Piston language configuration with explicit versions (avoids HTTP 400).
    const langConfig = {
        cpp: { language: 'cpp', version: '10.2.0', file: 'Main.cpp' },
        python: { language: 'python', version: '3.10.0', file: 'main.py' }
    };

    const runRemote = async (lang, code) => {
        const cfg = langConfig[lang];
        if (!cfg) throw new Error(`Unsupported language: ${lang}`);

        const payload = {
            language: cfg.language,
            version: cfg.version,
            files: [{ name: cfg.file, content: code }]
        };

        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Remote run failed (HTTP ${res.status})`);
        return res.json();
    };
    const parseNumbers = (codeText) => {
        const matches = codeText.match(/-?\d+(\.\d+)?/g);
        return matches ? matches.map(Number) : [];
    };

    const parseArrayNumbers = (codeText, dataKey) => {
        // Prefer the first literal in braces/brackets; fallback to any numbers.
        let match = null;
        if (dataKey === 'array-cpp') {
            match = codeText.match(/\{([^}]*)\}/);
        } else if (dataKey === 'array-python') {
            match = codeText.match(/\[([^\]]*)\]/);
        }
        if (match && match[1]) {
            const nums = match[1].match(/-?\d+(\.\d+)?/g);
            if (nums) return nums.map(Number);
        }
        return parseNumbers(codeText);
    };

    const hasBalancedDelimiters = (text) => {
        const pairs = { ')':'(', ']':'[', '}':'{' };
        const stack = [];
        for (const ch of text) {
            if (['(','[','{'].includes(ch)) stack.push(ch);
            if ([')',']','}'].includes(ch)) {
                if (stack.pop() !== pairs[ch]) return false;
            }
        }
        return stack.length === 0;
    };

    const validateCode = (code) => {
        if (!code.trim()) return "ERROR: Code is empty.";
        // Relaxed validation: allow running even if brackets look unbalanced to reduce false errors.
        return "";
    };
    const codeBlocks = document.querySelectorAll('.code-execution-block');

    codeBlocks.forEach(block => {
        const pre = block.querySelector('pre');
        const runBtn = block.querySelector('.run-btn');
        const editBtn = block.querySelector('.edit-btn');
        const saveBtn = block.querySelector('.save-btn');
        const resetBtn = block.querySelector('.reset-btn');
        const resultArea = block.querySelector('.result-area');
        const dataKey = block.getAttribute('data-key');
        const lang = block.getAttribute('data-lang');

        // Store original code content on load
        originalCodeMap.set(dataKey, pre.textContent.trim());

        const updateButtonVisibility = () => {
             const isModified = pre.textContent.trim() !== originalCodeMap.get(dataKey);
             resetBtn.style.display = isModified && pre.getAttribute('contenteditable') === 'false' ? 'inline-block' : 'none';
        }

        // --- RESET Button Handler ---
        const resetCodeHandler = () => {
            pre.textContent = originalCodeMap.get(dataKey);
            updateButtonVisibility();
            resultArea.innerHTML = `<strong>Status:</strong> <span style="color: #28a745;">Code reset to original version. Ready to run.</span>`;
        };
        resetBtn.addEventListener('click', resetCodeHandler);

        // --- EDIT Button Handler ---
        editBtn.addEventListener('click', () => {
            pre.setAttribute('contenteditable', 'true');
            pre.focus();
            editBtn.style.display = 'none';
            runBtn.style.display = 'none'; 
            saveBtn.style.display = 'inline-block';
            resetBtn.style.display = 'none';
            pre.style.border = '2px solid #ffc107'; 
            resultArea.innerHTML = `<strong>Status:</strong> <span style="color: #ffc107;">Editing Mode... Click Save to exit.</span>`;
        });

        // --- SAVE Changes Button Handler ---
        saveBtn.addEventListener('click', () => {
            pre.setAttribute('contenteditable', 'false');
            editBtn.style.display = 'inline-block';
            runBtn.style.display = 'inline-block'; 
            saveBtn.style.display = 'none';
            pre.style.border = '5px solid #003eaa';

            updateButtonVisibility();

            const isModified = pre.textContent.trim() !== originalCodeMap.get(dataKey);

            if (isModified) {
                resultArea.innerHTML = `
                    <strong>Status:</strong> <span style="color: #007bff;">Changes Saved.</span>
                    <br>You can now run to preview your custom code (execution is simulated).
                    `;
            } else {
                resultArea.innerHTML = `<strong>Status:</strong> <span style="color: #28a745;">No changes detected.</span>`;
            }
        });

        // Initial check for Reset button visibility
        updateButtonVisibility();

        // --- RUN Button Handler (Remote execution) ---
        runBtn.addEventListener('click', async () => {
            const currentCode = pre.textContent.trim();
            const originalCode = originalCodeMap.get(dataKey);
            const isModified = currentCode !== originalCode;

            if (pre.getAttribute('contenteditable') === 'true') {
                // Auto-finish editing so the user doesn't have to click Save first.
                pre.setAttribute('contenteditable', 'false');
                editBtn.style.display = 'inline-block';
                runBtn.style.display = 'inline-block'; 
                saveBtn.style.display = 'none';
                pre.style.border = '5px solid #003eaa';
                updateButtonVisibility();
            }

            const validationMsg = validateCode(currentCode);
            if (validationMsg) {
                resultArea.innerHTML = `
                    <div class="output-container" style="border-left: 5px solid #dc3545; background-color: #fcebeb;">
                        <strong>${validationMsg}</strong>
                    </div>
                `;
                return;
            }

            if (!currentCode.trim()) {
                resultArea.innerHTML = `
                    <div class="output-container" style="border-left: 5px solid #dc3545; background-color: #fcebeb;">
                        <strong>Error:</strong> <span style="color:#dc3545;">Code is empty. Please paste code, then click Run.</span>
                    </div>
                `;
                return;
            }

            resultArea.innerHTML = `<strong>Status:</strong> <span style="color: #ffc107;">Running ${lang.toUpperCase()}...</span>`;

            try {
                const exec = await runRemote(lang, currentCode);
                const run = exec.run || {};
                const stdout = (run.stdout || '').trim();
                const stderr = (run.stderr || '').trim();
                const exitCode = typeof run.code === 'number' ? run.code : 0;

                const success = exitCode === 0 && !stderr;
                const arrayPreview = (dataKey === 'array-cpp' || dataKey === 'array-python')
                    ? (() => {
                        const nums = parseArrayNumbers(currentCode, dataKey);
                        if (!nums.length) return '';
                        const sorted = [...nums].sort((a, b) => a - b);
                        return `<div style="margin-top:6px; color:#0b5ed7;">Detected numbers: [${nums.join(', ')}] → Sorted: [${sorted.join(', ')}]</div>`;
                    })()
                    : '';

                if (success) {
                    resultArea.innerHTML = `
                        <div class="output-container" style="border-left: 5px solid #28a745; background-color: #e9f7ef;">
                            <strong>Output (${lang.toUpperCase()}):</strong>
                            <pre>${stdout || '(no output)'}</pre>
                            ${arrayPreview}
                        </div>
                    `;
                } else {
                    resultArea.innerHTML = `
                        <div class="output-container" style="border-left: 5px solid #dc3545; background-color: #fcebeb;">
                            <strong>Error (${lang.toUpperCase()}):</strong>
                            ${stderr ? `<pre>${stderr}</pre>` : '<pre>(no stderr)</pre>'}
                            ${stdout ? `<div style="margin-top:6px; color:#555;">Stdout:</div><pre>${stdout}</pre>` : ''}
                        </div>
                    `;
                }
            } catch (err) {
                const fallback = simulatedOutputs[dataKey];
                resultArea.innerHTML = `
                    <div class="output-container" style="border-left: 5px solid #dc3545; background-color: #fcebeb;">
                        <strong>Run failed:</strong>
                        <div style="color:#dc3545;">${err.message || err}</div>
                        ${fallback ? `<div style="margin-top:6px; color:#0b5ed7;">Sample output (simulated):<br>${fallback.replace(/\n/g,'<br>')}</div>` : ''}
                    </div>
                `;
            }
        });
    });
});
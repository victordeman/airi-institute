export function renderOrganelleList(organelles, selectedId, onSelect) {
    const list = document.getElementById('organelle-list');
    if (!list) return;
    list.innerHTML = '';

    Object.entries(organelles).forEach(([id, data]) => {
        const btn = document.createElement('button');
        btn.className = `organelle-row ${id === selectedId ? 'active' : ''}`;
        btn.innerHTML = `
            <span class="color-dot" style="--dot: ${data.accent || '#72a4bf'}"></span>
            <strong>${data.title}</strong>
        `;
        btn.onclick = () => onSelect(id);
        list.appendChild(btn);
    });
}

export function updateInspector(id, data) {
    const title = document.getElementById('inspect-title');
    const desc = document.getElementById('inspect-desc');
    const details = document.getElementById('inspect-details');
    const inspector = document.getElementById('organelle-info');

    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.description;
    if (details) {
        details.innerHTML = `
            <div class="flex justify-between text-xs border-b border-slate-100 py-2">
                <span class="text-slate-400">Function</span>
                <span class="text-slate-800 font-medium">${data.function || 'Vital process'}</span>
            </div>
             <div class="flex justify-between text-xs border-b border-slate-100 py-2">
                <span class="text-slate-400">Complexity</span>
                <span class="text-slate-800 font-medium">${data.complexity || 'Standard'}</span>
            </div>
        `;
    }
    if (inspector) inspector.classList.add('open');
}

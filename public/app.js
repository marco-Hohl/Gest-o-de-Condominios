const $ = (id) => document.getElementById(id);
let blocos = [];
let apartamentos = [];
let moradores = [];
let referencias = [];
let tipos = [];

function mostrarMensagem(texto, erro = false) {
    const msg = $('msg');
    msg.textContent = texto;
    msg.className = 'mensagem show' + (erro ? ' erro' : '');
    setTimeout(() => msg.className = 'mensagem', 3000);
}

async function api(url, opcoes = {}) {
    const resposta = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opcoes
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao realizar a operação.');
    }

    return dados;
}

function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function formatarData(data) {
    if (!data) return '-';
    const valor = String(data).slice(0, 10);
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
}

function reais(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tabela(cabecalhos, linhas) {
    if (!linhas.length) {
        return '<div class="vazio">Nenhum registro encontrado.</div>';
    }

    return `
        <table>
            <thead><tr>${cabecalhos.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${linhas.join('')}</tbody>
        </table>
    `;
}

// ===== NAVEGAÇÃO =====
for (const botao of document.querySelectorAll('.menu-btn')) {
    botao.addEventListener('click', () => abrirPagina(botao.dataset.page));
}

async function abrirPagina(id) {
    document.querySelectorAll('.pagina').forEach(pagina => pagina.classList.remove('ativa'));
    $(id).classList.add('ativa');

    document.querySelectorAll('.menu-btn').forEach(botao => {
        botao.classList.toggle('ativo', botao.dataset.page === id);
    });

    try {
        if (id === 'inicio') await carregarResumo();
        if (id === 'blocos') await carregarBlocos();
        if (id === 'apartamentos') await Promise.all([carregarBlocosSelect(), carregarApartamentos()]);
        if (id === 'moradores') await Promise.all([carregarApartamentosSelect(), carregarMoradores()]);
        if (id === 'pagamentos') await Promise.all([carregarReferencias(), carregarPagamentos()]);
        if (id === 'tipos') await Promise.all([carregarTipos(), carregarTiposSelect(), carregarManutencoes()]);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// ===== RESUMO =====
async function carregarResumo() {
    const dados = await api('/api/resumo');
    $('totalBlocos').textContent = dados.blocos;
    $('totalApartamentos').textContent = dados.apartamentos;
    $('totalMoradores').textContent = dados.moradores;
    $('totalPagamentos').textContent = dados.pagamentos;
    $('totalManutencoes').textContent = dados.manutencoes;
}

// ===== BLOCOS =====
async function carregarBlocos() {
    blocos = await api('/api/blocos?q=' + encodeURIComponent($('blocoBusca').value));

    $('listaBlocos').innerHTML = tabela(
        ['Descrição', 'Apartamentos', 'Ações'],
        blocos.map(bloco => `
            <tr>
                <td><strong>${escapeHtml(bloco.descricao)}</strong></td>
                <td>${bloco.quantidade_apartamentos}</td>
                <td class="acoes">
                    <button class="btn-ver" onclick="verBloco(${bloco.id})">Ver</button>
                    <button class="btn-editar" onclick="editarBloco(${bloco.id})">Alterar</button>
                    <button class="btn-excluir" onclick="excluirBloco(${bloco.id})">Excluir</button>
                </td>
            </tr>
        `)
    );
}

function novoBloco() {
    $('blocoId').value = '';
    $('blocoDescricao').value = '';
    $('blocoQtd').value = '';
    $('blocoDescricao').focus();
}

function editarBloco(id) {
    const bloco = blocos.find(item => item.id === id);
    if (!bloco) return;

    $('blocoId').value = bloco.id;
    $('blocoDescricao').value = bloco.descricao;
    $('blocoQtd').value = bloco.quantidade_apartamentos;
    $('blocoDescricao').focus();
}

function verBloco(id) {
    const bloco = blocos.find(item => item.id === id);
    mostrarModal('Detalhes do bloco', `
        <div class="detalhe">
            <div><small>Descrição</small><strong>${escapeHtml(bloco.descricao)}</strong></div>
            <div><small>Quantidade de apartamentos</small><strong>${bloco.quantidade_apartamentos}</strong></div>
        </div>
    `);
}

$('formBloco').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const id = $('blocoId').value;
        const dados = {
            descricao: $('blocoDescricao').value,
            quantidade_apartamentos: $('blocoQtd').value
        };

        const resposta = await api(id ? `/api/blocos/${id}` : '/api/blocos', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem(resposta.mensagem);
        novoBloco();
        await carregarBlocos();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function excluirBloco(id) {
    if (!confirm('Tem certeza que deseja excluir este bloco?')) return;

    try {
        const resposta = await api(`/api/blocos/${id}`, { method: 'DELETE' });
        mostrarMensagem(resposta.mensagem);
        await carregarBlocos();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// ===== APARTAMENTOS =====
async function carregarBlocosSelect() {
    const todos = await api('/api/blocos');
    $('aptoBloco').innerHTML = todos.map(bloco =>
        `<option value="${bloco.id}">${escapeHtml(bloco.descricao)}</option>`
    ).join('');
}

async function carregarApartamentos() {
    apartamentos = await api('/api/apartamentos?q=' + encodeURIComponent($('aptoBusca').value));

    $('listaApartamentos').innerHTML = tabela(
        ['Bloco', 'Número', 'Ações'],
        apartamentos.map(apto => `
            <tr>
                <td><strong>${escapeHtml(apto.bloco)}</strong></td>
                <td>${escapeHtml(apto.numero)}</td>
                <td class="acoes">
                    <button class="btn-ver" onclick="verApto(${apto.id})">Ver</button>
                    <button class="btn-editar" onclick="editarApto(${apto.id})">Alterar</button>
                    <button class="btn-excluir" onclick="excluirApto(${apto.id})">Excluir</button>
                </td>
            </tr>
        `)
    );
}

function novoApto() {
    $('aptoId').value = '';
    $('aptoNumero').value = '';
    $('aptoNumero').focus();
}

function editarApto(id) {
    const apto = apartamentos.find(item => item.id === id);
    if (!apto) return;

    $('aptoId').value = apto.id;
    $('aptoBloco').value = apto.bloco_id;
    $('aptoNumero').value = apto.numero;
    $('aptoNumero').focus();
}

function verApto(id) {
    const apto = apartamentos.find(item => item.id === id);
    mostrarModal('Detalhes do apartamento', `
        <div class="detalhe">
            <div><small>Bloco</small><strong>${escapeHtml(apto.bloco)}</strong></div>
            <div><small>Número</small><strong>${escapeHtml(apto.numero)}</strong></div>
        </div>
    `);
}

$('formApto').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const id = $('aptoId').value;
        const dados = {
            bloco_id: $('aptoBloco').value,
            numero: $('aptoNumero').value
        };

        const resposta = await api(id ? `/api/apartamentos/${id}` : '/api/apartamentos', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem(resposta.mensagem);
        novoApto();
        await carregarApartamentos();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function excluirApto(id) {
    if (!confirm('Tem certeza que deseja excluir este apartamento?')) return;

    try {
        const resposta = await api(`/api/apartamentos/${id}`, { method: 'DELETE' });
        mostrarMensagem(resposta.mensagem);
        await carregarApartamentos();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

async function carregarApartamentosSelect() {
    const todos = await api('/api/apartamentos');
    $('moradorApto').innerHTML = todos.map(apto =>
        `<option value="${apto.id}">${escapeHtml(apto.bloco)} - ${escapeHtml(apto.numero)}</option>`
    ).join('');
}

// ===== MORADORES =====
async function carregarMoradores() {
    moradores = await api('/api/moradores?q=' + encodeURIComponent($('moradorBusca').value));

    $('listaMoradores').innerHTML = tabela(
        ['Nome', 'CPF', 'Apartamento', 'Telefone', 'Ações'],
        moradores.map(morador => `
            <tr>
                <td><strong>${escapeHtml(morador.nome)}</strong></td>
                <td>${escapeHtml(morador.cpf)}</td>
                <td>${escapeHtml(morador.bloco)} - ${escapeHtml(morador.apartamento)}</td>
                <td>${escapeHtml(morador.telefone)}</td>
                <td class="acoes">
                    <button class="btn-ver" onclick="verMorador(${morador.id})">Ver</button>
                    <button class="btn-editar" onclick="editarMorador(${morador.id})">Alterar</button>
                    <button class="btn-excluir" onclick="excluirMorador(${morador.id})">Excluir</button>
                </td>
            </tr>
        `)
    );
}

function novoMorador() {
    $('formMorador').reset();
    $('moradorId').value = '';
}

function editarMorador(id) {
    const morador = moradores.find(item => item.id === id);
    if (!morador) return;

    $('moradorId').value = morador.id;
    $('moradorCpf').value = morador.cpf;
    $('moradorNome').value = morador.nome;
    $('moradorTelefone').value = morador.telefone;
    $('moradorApto').value = morador.apartamento_id;
    $('moradorVaga').value = morador.vaga || '';
    $('moradorPlaca').value = morador.placa || '';
    $('moradorMarca').value = morador.marca || '';
    $('moradorModelo').value = morador.modelo || '';
    $('moradorResponsavel').checked = Boolean(morador.responsavel);
    $('moradorProprietario').checked = Boolean(morador.proprietario);
    $('moradorNome').focus();
}

function verMorador(id) {
    const m = moradores.find(item => item.id === id);
    mostrarModal('Detalhes do morador', `
        <div class="detalhe">
            <div><small>Nome</small><strong>${escapeHtml(m.nome)}</strong></div>
            <div><small>CPF</small><strong>${escapeHtml(m.cpf)}</strong></div>
            <div><small>Telefone</small><strong>${escapeHtml(m.telefone)}</strong></div>
            <div><small>Apartamento</small><strong>${escapeHtml(m.bloco)} - ${escapeHtml(m.apartamento)}</strong></div>
            <div><small>Responsável</small><strong>${m.responsavel ? 'Sim' : 'Não'}</strong></div>
            <div><small>Proprietário</small><strong>${m.proprietario ? 'Sim' : 'Não'}</strong></div>
            <div><small>Vaga</small><strong>${escapeHtml(m.vaga || '-')}</strong></div>
            <div><small>Veículo</small><strong>${escapeHtml([m.marca, m.modelo].filter(Boolean).join(' ') || '-')}</strong></div>
        </div>
    `);
}

$('formMorador').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const id = $('moradorId').value;
        const dados = {
            cpf: $('moradorCpf').value,
            nome: $('moradorNome').value,
            telefone: $('moradorTelefone').value,
            apartamento_id: $('moradorApto').value,
            responsavel: $('moradorResponsavel').checked,
            proprietario: $('moradorProprietario').checked,
            vaga: $('moradorVaga').value,
            placa: $('moradorPlaca').value,
            marca: $('moradorMarca').value,
            modelo: $('moradorModelo').value
        };

        const resposta = await api(id ? `/api/moradores/${id}` : '/api/moradores', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });

        mostrarMensagem(resposta.mensagem);
        novoMorador();
        await carregarMoradores();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function excluirMorador(id) {
    if (!confirm('Tem certeza que deseja excluir este morador?')) return;

    try {
        const resposta = await api(`/api/moradores/${id}`, { method: 'DELETE' });
        mostrarMensagem(resposta.mensagem);
        await carregarMoradores();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// ===== PAGAMENTOS =====
async function carregarReferencias() {
    referencias = await api('/api/referencias');

    $('pagReferencia').innerHTML = referencias.map(ref =>
        `<option value="${ref.id}">${String(ref.mes).padStart(2, '0')}/${ref.ano}</option>`
    ).join('');

    atualizarReferencia();
}

function atualizarReferencia() {
    const referencia = referencias.find(item => String(item.id) === $('pagReferencia').value);
    if (!referencia) return;

    $('pagValor').value = reais(referencia.valor);
    $('pagVencimento').value = formatarData(referencia.vencimento);
}

$('pagReferencia').addEventListener('change', atualizarReferencia);

async function buscarDadosApartamento() {
    try {
        const resposta = await api('/api/apartamento-dados?numero=' + encodeURIComponent($('pagAptoNumero').value));

        $('pagAptoId').value = resposta.apartamento_id;
        $('pagMoradorId').value = resposta.morador_id || '';
        $('pagCpf').value = resposta.cpf || '';
        $('pagNome').value = resposta.nome || '';
        $('pagTelefone').value = resposta.telefone || '';

        if (!resposta.morador_id) {
            mostrarMensagem('Apartamento encontrado, mas sem morador responsável.', true);
        } else {
            mostrarMensagem('Apartamento encontrado.');
        }
    } catch (erro) {
        $('pagAptoId').value = '';
        $('pagMoradorId').value = '';
        $('pagCpf').value = '';
        $('pagNome').value = '';
        $('pagTelefone').value = '';
        mostrarMensagem(erro.message, true);
    }
}

$('formPagamento').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        if (!$('pagAptoId').value || !$('pagMoradorId').value) {
            await buscarDadosApartamento();
        }

        if (!$('pagAptoId').value || !$('pagMoradorId').value) return;

        const resposta = await api('/api/pagamentos', {
            method: 'POST',
            body: JSON.stringify({
                apartamento_id: $('pagAptoId').value,
                morador_id: $('pagMoradorId').value,
                referencia_id: $('pagReferencia').value
            })
        });

        mostrarMensagem(resposta.mensagem);
        $('formPagamento').reset();
        $('pagAptoId').value = '';
        $('pagMoradorId').value = '';
        $('pagCpf').value = '';
        $('pagNome').value = '';
        $('pagTelefone').value = '';
        atualizarReferencia();
        await carregarPagamentos();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function carregarPagamentos() {
    const pagamentos = await api('/api/pagamentos');

    $('listaPagamentos').innerHTML = tabela(
        ['Apartamento', 'Morador', 'Referência', 'Valor', 'Data'],
        pagamentos.map(p => `
            <tr>
                <td><strong>${escapeHtml(p.apartamento)}</strong></td>
                <td>${escapeHtml(p.nome)}</td>
                <td>${String(p.mes).padStart(2, '0')}/${p.ano}</td>
                <td>${reais(p.valor_pago)}</td>
                <td>${formatarData(p.data_pagamento)}</td>
            </tr>
        `)
    );
}

// ===== MANUTENÇÃO =====
async function carregarTipos() {
    tipos = await api('/api/tipos-manutencao');

    $('listaTipos').innerHTML = tabela(
        ['Tipos cadastrados'],
        tipos.map(tipo => `<tr><td><strong>${escapeHtml(tipo.descricao)}</strong></td></tr>`)
    );
}

async function carregarTiposSelect() {
    tipos = await api('/api/tipos-manutencao');
    $('manTipo').innerHTML = tipos.map(tipo =>
        `<option value="${tipo.id}">${escapeHtml(tipo.descricao)}</option>`
    ).join('');
}

$('formTipo').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const resposta = await api('/api/tipos-manutencao', {
            method: 'POST',
            body: JSON.stringify({ descricao: $('tipoDescricao').value })
        });

        mostrarMensagem(resposta.mensagem);
        $('tipoDescricao').value = '';
        await carregarTipos();
        await carregarTiposSelect();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

$('formManutencao').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const resposta = await api('/api/manutencoes', {
            method: 'POST',
            body: JSON.stringify({
                tipo_id: $('manTipo').value,
                data_manutencao: $('manData').value,
                local: $('manLocal').value
            })
        });

        mostrarMensagem(resposta.mensagem);
        $('formManutencao').reset();
        await carregarManutencoes();
        await carregarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

async function carregarManutencoes() {
    const manutencoes = await api('/api/manutencoes');

    $('listaManutencoes').innerHTML = tabela(
        ['Tipo', 'Data', 'Local'],
        manutencoes.map(m => `
            <tr>
                <td><strong>${escapeHtml(m.tipo)}</strong></td>
                <td>${formatarData(m.data_manutencao)}</td>
                <td>${escapeHtml(m.local)}</td>
            </tr>
        `)
    );
}

// ===== MODAL =====
function mostrarModal(titulo, conteudo) {
    $('modalTitulo').textContent = titulo;
    $('modalConteudo').innerHTML = conteudo;
    $('modal').classList.add('show');
}

function fecharModal() {
    $('modal').classList.remove('show');
}

$('modal').addEventListener('click', (event) => {
    if (event.target.id === 'modal') fecharModal();
});

// ===== INÍCIO =====
carregarResumo().catch(erro => mostrarMensagem(erro.message, true));

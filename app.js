const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 8083;

// ===== CONEXÃO COM O MYSQL =====
// Baseado no mesmo modelo simples da apostila de CRUD.
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'condominio'
});

connection.connect((err) => {
    if (err) {
        console.log('Erro ao conectar no MySQL:');
        console.log(err.code || err.message || err);
        return;
    }
    console.log('MySQL conectado com sucesso!');
});

// ===== CONFIGURAÇÕES =====
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function respostaErro(res, err) {
    console.error(err);

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Esse registro já está cadastrado.' });
    }

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ erro: 'Não é possível excluir porque este registro está sendo usado.' });
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({ erro: err.code === 'ER_ACCESS_DENIED_ERROR' ? 'Usuário ou senha do MySQL incorretos.' : 'Não foi possível conectar ao MySQL.' });
    }

    return res.status(500).json({ erro: 'Erro ao realizar a operação.' });
}

function texto(valor) {
    return String(valor ?? '').trim();
}

// ===== PÁGINA PRINCIPAL =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =========================================================
// RESUMO
// =========================================================
app.get('/api/resumo', (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM blocos) AS blocos,
            (SELECT COUNT(*) FROM apartamentos) AS apartamentos,
            (SELECT COUNT(*) FROM moradores) AS moradores,
            (SELECT COUNT(*) FROM pagamentos) AS pagamentos,
            (SELECT COUNT(*) FROM manutencoes) AS manutencoes
    `;

    connection.query(sql, (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows[0]);
    });
});

// =========================================================
// BLOCOS - CRUD
// =========================================================
app.get('/api/blocos', (req, res) => {
    const busca = `%${texto(req.query.q)}%`;
    const sql = 'SELECT * FROM blocos WHERE descricao LIKE ? ORDER BY descricao';

    connection.query(sql, [busca], (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

app.post('/api/blocos', (req, res) => {
    const descricao = texto(req.body.descricao);
    const quantidade = Number(req.body.quantidade_apartamentos);

    if (!descricao || !quantidade) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = 'INSERT INTO blocos (descricao, quantidade_apartamentos) VALUES (?, ?)';

    connection.query(sql, [descricao, quantidade], (err, result) => {
        if (err) return respostaErro(res, err);
        res.status(201).json({ mensagem: 'Bloco cadastrado com sucesso!', id: result.insertId });
    });
});

app.put('/api/blocos/:id', (req, res) => {
    const id = req.params.id;
    const descricao = texto(req.body.descricao);
    const quantidade = Number(req.body.quantidade_apartamentos);

    if (!descricao || !quantidade) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = 'UPDATE blocos SET descricao = ?, quantidade_apartamentos = ? WHERE id = ?';

    connection.query(sql, [descricao, quantidade, id], (err) => {
        if (err) return respostaErro(res, err);
        res.json({ mensagem: 'Bloco alterado com sucesso!' });
    });
});

app.delete('/api/blocos/:id', (req, res) => {
    connection.query('DELETE FROM blocos WHERE id = ?', [req.params.id], (err) => {
        if (err) return respostaErro(res, err);
        res.json({ mensagem: 'Bloco excluído com sucesso!' });
    });
});

// =========================================================
// APARTAMENTOS - CRUD
// =========================================================
app.get('/api/apartamentos', (req, res) => {
    const busca = `%${texto(req.query.q)}%`;
    const sql = `
        SELECT a.id, a.bloco_id, a.numero, b.descricao AS bloco
        FROM apartamentos a
        INNER JOIN blocos b ON b.id = a.bloco_id
        WHERE a.numero LIKE ? OR b.descricao LIKE ?
        ORDER BY b.descricao, a.numero
    `;

    connection.query(sql, [busca, busca], (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

app.post('/api/apartamentos', (req, res) => {
    const blocoId = Number(req.body.bloco_id);
    const numero = texto(req.body.numero);

    if (!blocoId || !numero) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = 'INSERT INTO apartamentos (bloco_id, numero) VALUES (?, ?)';

    connection.query(sql, [blocoId, numero], (err, result) => {
        if (err) return respostaErro(res, err);
        res.status(201).json({ mensagem: 'Apartamento cadastrado com sucesso!', id: result.insertId });
    });
});

app.put('/api/apartamentos/:id', (req, res) => {
    const blocoId = Number(req.body.bloco_id);
    const numero = texto(req.body.numero);

    if (!blocoId || !numero) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = 'UPDATE apartamentos SET bloco_id = ?, numero = ? WHERE id = ?';

    connection.query(sql, [blocoId, numero, req.params.id], (err) => {
        if (err) return respostaErro(res, err);
        res.json({ mensagem: 'Apartamento alterado com sucesso!' });
    });
});

app.delete('/api/apartamentos/:id', (req, res) => {
    connection.query('DELETE FROM apartamentos WHERE id = ?', [req.params.id], (err) => {
        if (err) return respostaErro(res, err);
        res.json({ mensagem: 'Apartamento excluído com sucesso!' });
    });
});

// =========================================================
// MORADORES - CRUD
// =========================================================
app.get('/api/moradores', (req, res) => {
    const busca = `%${texto(req.query.q)}%`;
    const sql = `
        SELECT
            m.id,
            m.cpf,
            m.nome,
            m.telefone,
            m.apartamento_id,
            m.responsavel,
            m.proprietario,
            a.numero AS apartamento,
            b.descricao AS bloco,
            vg.numero AS vaga,
            v.placa,
            v.marca,
            v.modelo
        FROM moradores m
        INNER JOIN apartamentos a ON a.id = m.apartamento_id
        INNER JOIN blocos b ON b.id = a.bloco_id
        LEFT JOIN vagas_garagem vg ON vg.apartamento_id = a.id
        LEFT JOIN veiculos v ON v.morador_id = m.id
        WHERE m.nome LIKE ? OR m.cpf LIKE ? OR a.numero LIKE ? OR b.descricao LIKE ?
        GROUP BY m.id
        ORDER BY m.nome
    `;

    connection.query(sql, [busca, busca, busca, busca], (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

function salvarVeiculo(idMorador, dados, callback) {
    const placa = texto(dados.placa) || null;
    const marca = texto(dados.marca) || null;
    const modelo = texto(dados.modelo) || null;

    connection.query('DELETE FROM veiculos WHERE morador_id = ?', [idMorador], (err) => {
        if (err) return callback(err);

        if (!placa && !marca && !modelo) return callback(null);

        const sql = 'INSERT INTO veiculos (morador_id, placa, marca, modelo) VALUES (?, ?, ?, ?)';
        connection.query(sql, [idMorador, placa, marca, modelo], callback);
    });
}

function salvarVaga(idApartamento, numero, callback) {
    connection.query('DELETE FROM vagas_garagem WHERE apartamento_id = ?', [idApartamento], (err) => {
        if (err) return callback(err);

        const vaga = texto(numero);
        if (!vaga) return callback(null);

        connection.query(
            'INSERT INTO vagas_garagem (apartamento_id, numero) VALUES (?, ?)',
            [idApartamento, vaga],
            callback
        );
    });
}

app.post('/api/moradores', (req, res) => {
    const cpf = texto(req.body.cpf);
    const nome = texto(req.body.nome);
    const telefone = texto(req.body.telefone);
    const apartamentoId = Number(req.body.apartamento_id);

    if (!cpf || !nome || !telefone || !apartamentoId) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = `
        INSERT INTO moradores
        (cpf, nome, telefone, apartamento_id, responsavel, proprietario)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(sql, [
        cpf,
        nome,
        telefone,
        apartamentoId,
        req.body.responsavel ? 1 : 0,
        req.body.proprietario ? 1 : 0
    ], (err, result) => {
        if (err) return respostaErro(res, err);

        salvarVaga(apartamentoId, req.body.vaga, (errVaga) => {
            if (errVaga) return respostaErro(res, errVaga);

            salvarVeiculo(result.insertId, req.body, (errVeiculo) => {
                if (errVeiculo) return respostaErro(res, errVeiculo);
                res.status(201).json({ mensagem: 'Morador cadastrado com sucesso!', id: result.insertId });
            });
        });
    });
});

app.put('/api/moradores/:id', (req, res) => {
    const cpf = texto(req.body.cpf);
    const nome = texto(req.body.nome);
    const telefone = texto(req.body.telefone);
    const apartamentoId = Number(req.body.apartamento_id);
    const id = req.params.id;

    if (!cpf || !nome || !telefone || !apartamentoId) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = `
        UPDATE moradores
        SET cpf = ?, nome = ?, telefone = ?, apartamento_id = ?, responsavel = ?, proprietario = ?
        WHERE id = ?
    `;

    connection.query(sql, [
        cpf,
        nome,
        telefone,
        apartamentoId,
        req.body.responsavel ? 1 : 0,
        req.body.proprietario ? 1 : 0,
        id
    ], (err) => {
        if (err) return respostaErro(res, err);

        salvarVaga(apartamentoId, req.body.vaga, (errVaga) => {
            if (errVaga) return respostaErro(res, errVaga);

            salvarVeiculo(id, req.body, (errVeiculo) => {
                if (errVeiculo) return respostaErro(res, errVeiculo);
                res.json({ mensagem: 'Morador alterado com sucesso!' });
            });
        });
    });
});

app.delete('/api/moradores/:id', (req, res) => {
    connection.query('DELETE FROM moradores WHERE id = ?', [req.params.id], (err) => {
        if (err) return respostaErro(res, err);
        res.json({ mensagem: 'Morador excluído com sucesso!' });
    });
});

// =========================================================
// PAGAMENTOS - Registro + visualização
// =========================================================
app.get('/api/referencias', (req, res) => {
    connection.query(
        'SELECT * FROM referencias ORDER BY ano DESC, mes DESC',
        (err, rows) => {
            if (err) return respostaErro(res, err);
            res.json(rows);
        }
    );
});

app.get('/api/apartamento-dados', (req, res) => {
    const numero = texto(req.query.numero);

    const sql = `
        SELECT
            a.id AS apartamento_id,
            a.numero,
            m.id AS morador_id,
            m.cpf,
            m.nome,
            m.telefone
        FROM apartamentos a
        LEFT JOIN moradores m
            ON m.apartamento_id = a.id
            AND m.responsavel = 1
        WHERE a.numero = ?
        LIMIT 1
    `;

    connection.query(sql, [numero], (err, rows) => {
        if (err) return respostaErro(res, err);
        if (rows.length === 0) return res.status(404).json({ erro: 'Apartamento não cadastrado.' });
        res.json(rows[0]);
    });
});

app.get('/api/pagamentos', (req, res) => {
    const sql = `
        SELECT
            p.id,
            a.numero AS apartamento,
            m.nome,
            r.mes,
            r.ano,
            p.valor_pago,
            p.data_pagamento
        FROM pagamentos p
        INNER JOIN apartamentos a ON a.id = p.apartamento_id
        INNER JOIN moradores m ON m.id = p.morador_id
        INNER JOIN referencias r ON r.id = p.referencia_id
        ORDER BY p.data_pagamento DESC, p.id DESC
    `;

    connection.query(sql, (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

app.post('/api/pagamentos', (req, res) => {
    const apartamentoId = Number(req.body.apartamento_id);
    const moradorId = Number(req.body.morador_id);
    const referenciaId = Number(req.body.referencia_id);

    if (!apartamentoId || !moradorId || !referenciaId) {
        return res.status(400).json({ erro: 'Preencha todos os dados do pagamento.' });
    }

    connection.query(
        'SELECT valor FROM referencias WHERE id = ?',
        [referenciaId],
        (err, referencias) => {
            if (err) return respostaErro(res, err);
            if (referencias.length === 0) return res.status(404).json({ erro: 'Referência não encontrada.' });

            const sql = `
                INSERT INTO pagamentos
                (apartamento_id, morador_id, referencia_id, data_pagamento, valor_pago)
                VALUES (?, ?, ?, CURDATE(), ?)
            `;

            connection.query(sql, [apartamentoId, moradorId, referenciaId, referencias[0].valor], (err) => {
                if (err) return respostaErro(res, err);
                res.status(201).json({ mensagem: 'Pagamento registrado com sucesso!' });
            });
        }
    );
});

// =========================================================
// TIPOS DE MANUTENÇÃO - Cadastro + visualização
// =========================================================
app.get('/api/tipos-manutencao', (req, res) => {
    connection.query('SELECT * FROM tipos_manutencao ORDER BY descricao', (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

app.post('/api/tipos-manutencao', (req, res) => {
    const descricao = texto(req.body.descricao);

    if (!descricao) {
        return res.status(400).json({ erro: 'Informe a descrição da manutenção.' });
    }

    connection.query(
        'INSERT INTO tipos_manutencao (descricao) VALUES (?)',
        [descricao],
        (err, result) => {
            if (err) return respostaErro(res, err);
            res.status(201).json({ mensagem: 'Tipo cadastrado com sucesso!', id: result.insertId });
        }
    );
});

// =========================================================
// MANUTENÇÕES - Registro + visualização
// =========================================================
app.get('/api/manutencoes', (req, res) => {
    const sql = `
        SELECT
            m.id,
            m.tipo_id,
            t.descricao AS tipo,
            m.data_manutencao,
            m.local
        FROM manutencoes m
        INNER JOIN tipos_manutencao t ON t.id = m.tipo_id
        ORDER BY m.data_manutencao DESC
    `;

    connection.query(sql, (err, rows) => {
        if (err) return respostaErro(res, err);
        res.json(rows);
    });
});

app.post('/api/manutencoes', (req, res) => {
    const tipoId = Number(req.body.tipo_id);
    const data = texto(req.body.data_manutencao);
    const local = texto(req.body.local);

    if (!tipoId || !data || !local) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const sql = `
        INSERT INTO manutencoes (tipo_id, data_manutencao, local)
        VALUES (?, ?, ?)
    `;

    connection.query(sql, [tipoId, data, local], (err, result) => {
        if (err) return respostaErro(res, err);
        res.status(201).json({ mensagem: 'Manutenção registrada com sucesso!', id: result.insertId });
    });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

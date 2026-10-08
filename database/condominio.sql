-- Banco de dados - Sistema de Gestão de Condomínio
-- MySQL 8+

DROP DATABASE IF EXISTS condominio;
CREATE DATABASE condominio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE condominio;

CREATE TABLE blocos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(100) NOT NULL,
  quantidade_apartamentos INT NOT NULL,
  CONSTRAINT uq_bloco_descricao UNIQUE (descricao),
  CONSTRAINT ck_bloco_quantidade CHECK (quantidade_apartamentos > 0)
) ENGINE=InnoDB;

CREATE TABLE apartamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bloco_id INT NOT NULL,
  numero VARCHAR(20) NOT NULL,
  CONSTRAINT uq_apartamento_numero UNIQUE (numero),
  CONSTRAINT fk_apartamento_bloco FOREIGN KEY (bloco_id) REFERENCES blocos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE moradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  apartamento_id INT NOT NULL,
  responsavel BOOLEAN NOT NULL DEFAULT FALSE,
  proprietario BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_morador_cpf UNIQUE (cpf),
  CONSTRAINT fk_morador_apartamento FOREIGN KEY (apartamento_id) REFERENCES apartamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vagas_garagem (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartamento_id INT NOT NULL,
  numero VARCHAR(20) NOT NULL,
  CONSTRAINT uq_vaga_numero UNIQUE (numero),
  CONSTRAINT fk_vaga_apartamento FOREIGN KEY (apartamento_id) REFERENCES apartamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE veiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  morador_id INT NOT NULL,
  placa VARCHAR(10) NULL,
  marca VARCHAR(60) NULL,
  modelo VARCHAR(60) NULL,
  CONSTRAINT uq_veiculo_placa UNIQUE (placa),
  CONSTRAINT fk_veiculo_morador FOREIGN KEY (morador_id) REFERENCES moradores(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE referencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mes TINYINT NOT NULL,
  ano SMALLINT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  CONSTRAINT uq_referencia_mes_ano UNIQUE (mes, ano),
  CONSTRAINT ck_referencia_mes CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT ck_referencia_valor CHECK (valor >= 0)
) ENGINE=InnoDB;

CREATE TABLE pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartamento_id INT NOT NULL,
  morador_id INT NOT NULL,
  referencia_id INT NOT NULL,
  data_pagamento DATE NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL,
  CONSTRAINT uq_pagamento_apto_ref UNIQUE (apartamento_id, referencia_id),
  CONSTRAINT fk_pagamento_apartamento FOREIGN KEY (apartamento_id) REFERENCES apartamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pagamento_morador FOREIGN KEY (morador_id) REFERENCES moradores(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pagamento_referencia FOREIGN KEY (referencia_id) REFERENCES referencias(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE tipos_manutencao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(100) NOT NULL,
  CONSTRAINT uq_tipo_manutencao UNIQUE (descricao)
) ENGINE=InnoDB;

CREATE TABLE manutencoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_id INT NOT NULL,
  data_manutencao DATE NOT NULL,
  local VARCHAR(150) NOT NULL,
  CONSTRAINT fk_manutencao_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_manutencao(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Dados de demonstração coerentes com as telas da documentação
INSERT INTO blocos (descricao, quantidade_apartamentos) VALUES
('Bloco A', 30), ('Bloco B', 25);

INSERT INTO apartamentos (bloco_id, numero) VALUES
(1, '101'), (2, '201');

INSERT INTO moradores (cpf, nome, telefone, apartamento_id, responsavel, proprietario) VALUES
('001.592.453-01', 'João da Silva', '(41) 99999-0101', 1, 1, 1),
('022.672.123-44', 'Maria Santos', '(41) 99999-0201', 2, 1, 0);

INSERT INTO vagas_garagem (apartamento_id, numero) VALUES (1, 'A-01'), (2, 'B-01');
INSERT INTO veiculos (morador_id, placa, marca, modelo) VALUES
(1, 'ABC1D23', 'Volkswagen', 'Polo'),
(2, 'XYZ9H87', 'Chevrolet', 'Onix');

INSERT INTO referencias (mes, ano, valor, vencimento) VALUES
(1,2024,450.00,'2024-01-10'),(2,2024,450.00,'2024-02-10'),(3,2024,450.00,'2024-03-10'),
(4,2024,450.00,'2024-04-10'),(5,2024,450.00,'2024-05-10'),(6,2024,450.00,'2024-06-10'),
(7,2024,450.00,'2024-07-10'),(8,2024,450.00,'2024-08-10'),(9,2024,450.00,'2024-09-10'),
(10,2024,450.00,'2024-10-10'),(11,2024,450.00,'2024-11-10'),(12,2024,450.00,'2024-12-10'),
(1,2026,520.00,'2026-01-10'),(2,2026,520.00,'2026-02-10'),(3,2026,520.00,'2026-03-10'),
(4,2026,520.00,'2026-04-10'),(5,2026,520.00,'2026-05-10'),(6,2026,520.00,'2026-06-10'),
(7,2026,520.00,'2026-07-10'),(8,2026,520.00,'2026-08-10'),(9,2026,520.00,'2026-09-10'),
(10,2026,520.00,'2026-10-10'),(11,2026,520.00,'2026-11-10'),(12,2026,520.00,'2026-12-10');

INSERT INTO tipos_manutencao (descricao) VALUES ('Pintura'), ('Elétrica'), ('Hidráulica');
INSERT INTO manutencoes (tipo_id, data_manutencao, local) VALUES
(1, '2026-09-15', 'Hall do Bloco A');

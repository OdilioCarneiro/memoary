import express from 'express';
// 👇 Importamos o ObjectId do jeito certo e moderno aqui!
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors'; 
import { Buffer } from 'buffer';
import process from 'process';

// INICIALIZA O DOTENV (Lê o arquivo .env se você estiver rodando no seu computador)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json());

// ==========================================
// 1. CONFIGURAÇÃO DO CLOUDINARY USANDO .ENV
// ==========================================
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// 2. STRING DO MONGODB USANDO .ENV
// ==========================================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;
      
async function conectarBanco() {
  try {
    await client.connect();
    db = client.db('anuarioDaTurma'); 
    console.log('✅ Conectado ao MongoDB nativo!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }
}
conectarBanco();

// Rota POST para Upload e Criação de Página
app.post('/api/anuario', upload.single('image'), async (req, res) => {
  try {
    const { legenda } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem foi enviada.' });
    }

    // Converte a imagem para Buffer base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload para o Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: "anuario_disciplina"
    });

    // Estrutura o objeto que vai para o MongoDB
    const novaPagina = {
      tipoLayout: 'grid',
      elementos: [
        {
          tipo: 'imagem',
          url: cldRes.secure_url,
          legenda: legenda || ''
        }
      ],
      criadoEm: new Date()
    };

    // Salva no banco de dados
    const colecao = db.collection('paginas');
    const resultado = await colecao.insertOne(novaPagina);

    res.status(201).json({ 
      success: true, 
      data: { ...novaPagina, _id: resultado.insertedId } 
    });

  } catch (error) {
    console.error('Erro na rota de upload:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar o envio.' });
  }
});

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;

  // Aqui nós definimos o seu usuário e senha!
  const USUARIO_CORRETO = 'admin';
  const SENHA_CORRETA = 'admin123';

  if (usuario === USUARIO_CORRETO && senha === SENHA_CORRETA) {
    // Se acertar, devolvemos um "token" falso para o front-end liberar a página
    res.json({ success: true, token: 'token-super-secreto-do-memoary' });
  } else {
    // Se errar, devolvemos erro 401 (Não autorizado)
    res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
  }
});

app.get('/api/anuario', async (req, res) => {
  try {
    const colecao = db.collection('paginas');
    // Puxa todas as fotos do banco, ordenando pela data de criação
    const paginas = await colecao.find({}).sort({ criadoEm: 1 }).toArray();
    
    res.json({ success: true, data: paginas });
  } catch (error) {
    console.error('Erro ao buscar dados do anuário:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar as páginas.' });
  }
});

// ROTA PARA CRIAR UMA PÁGINA EM BRANCO
// ROTA PARA CRIAR UMA PÁGINA EM BRANCO
app.post('/api/anuario/nova-pagina', async (req, res) => {
  try {
    const { lado } = req.body; // 'esquerda' ou 'direita'
    const novaPagina = {
      tipoLayout: 'grid',
      lado: lado || 'direita', // campo novo — identifica o lado no livro
      elementos: [],
      criadoEm: new Date()
    };

    const colecao = db.collection('paginas');
    const resultado = await colecao.insertOne(novaPagina);

    res.status(201).json({ 
      success: true, 
      data: { ...novaPagina, _id: resultado.insertedId } 
    });
  } catch (error) {
    console.error('Erro ao criar nova página:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar página.' });
  }
});

// ROTA PARA SALVAR/ATUALIZAR UMA PÁGINA
app.put('/api/anuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { elementos, lado } = req.body;

    const colecao = db.collection('paginas');

    // Monta apenas os campos que vieram no body
    const camposParaAtualizar = { elementos };
    if (lado !== undefined) camposParaAtualizar.lado = lado;
    
    await colecao.updateOne(
      { _id: new ObjectId(id) },
      { $set: camposParaAtualizar }
    );
    res.json({ success: true, message: 'Página atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar página:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar página.' });
  }
});

// Configuração da porta dinâmica do Render ou local
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

app.delete('/api/anuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const colecao = db.collection('paginas');
    
    // Deleta do MongoDB usando o ID
    await colecao.deleteOne({ _id: new ObjectId(id) });
    
    res.json({ success: true, message: 'Página deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar página:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar página.' });
  }
});
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo de mídia detectado.' });
    }

    // Converte o arquivo recebido na memória para Buffer base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Dispara o upload exclusivo para o diretório do Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: "anuario_disciplina"
    });

    // Retorna estritamente a URL segura. Sem alterações precoces no MongoDB.
    res.json({ 
      success: true, 
      url: cldRes.secure_url 
    });

  } catch (error) {
    console.error('Erro na rota de upload estrutural:', error);
    res.status(500).json({ success: false, message: 'Falha interna ao processar armazenamento em nuvem.' });
  }
});

// ==========================================
// ROTAS DE COMENTÁRIOS (MONGODB NATIVO)
// ==========================================

/* ── GET /api/comentarios/:photoId ── */
app.get('/api/comentarios/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    const colecao = db.collection('comentarios');
    
    // .find().toArray() é o equivalente ao .find().lean() do Mongoose
    const comentarios = await colecao
      .find({ photoId: decodeURIComponent(photoId) })
      .sort({ criadoEm: 1 })
      .limit(200)
      .toArray();
      
    res.json({ success: true, data: comentarios });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar comentários.' });
  }
});

/* ── POST /api/comentarios ── */
app.post('/api/comentarios', async (req, res) => {
  try {
    const { photoId, autor, texto } = req.body;
    
    if (!photoId || !autor || !texto) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });
    }

    // Criamos o objeto manualmente, limitando o tamanho igual o Schema fazia
    const novoComentario = {
      photoId,
      autor: autor.trim().substring(0, 60), 
      texto: texto.trim().substring(0, 280),
      likes: 0,
      criadoEm: new Date()
    };

    const colecao = db.collection('comentarios');
    const resultado = await colecao.insertOne(novoComentario);

    // Devolvemos o objeto criado junto com o _id que o MongoDB gerou
    res.status(201).json({ 
      success: true, 
      data: { ...novoComentario, _id: resultado.insertedId } 
    });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar comentário.' });
  }
});

/* ── POST /api/comentarios/:id/like ── */
app.post('/api/comentarios/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { unlike } = req.body;
    const delta = unlike ? -1 : 1;

    const colecao = db.collection('comentarios');
    
    // findOneAndUpdate com returnDocument: 'after' substitui o { new: true } do Mongoose
    const resultado = await colecao.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { likes: delta } },
      { returnDocument: 'after' } // Garante que a variável 'resultado' tenha os dados pós-atualização
    );

    if (!resultado) {
      return res.status(404).json({ success: false, message: 'Comentário não encontrado.' });
    }

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Erro ao atualizar like:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar curtida.' });
  }
});

// ==========================================
// ROTAS DE SUGESTÕES DE FOTOS
// ==========================================

/* ── POST /api/sugestoes ── recebe upload + metadados */
app.post('/api/sugestoes', upload.single('image'), async (req, res) => {
  try {
    const { nome, mensagem } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: 'anuario_sugestoes',
    });

    const sugestao = {
      url: cldRes.secure_url,
      nome: (nome || 'Anônimo').trim().substring(0, 60),
      mensagem: (mensagem || '').trim().substring(0, 280),
      status: 'pendente', // 'pendente' | 'aprovada' | 'rejeitada'
      criadoEm: new Date(),
    };

    const colecao = db.collection('sugestoes');
    const resultado = await colecao.insertOne(sugestao);

    res.status(201).json({ success: true, data: { ...sugestao, _id: resultado.insertedId } });
  } catch (error) {
    console.error('Erro ao salvar sugestão:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar sugestão.' });
  }
});

/* ── GET /api/sugestoes ── lista para o admin */
app.get('/api/sugestoes', async (req, res) => {
  try {
    const colecao = db.collection('sugestoes');
    const sugestoes = await colecao
      .find({})
      .sort({ criadoEm: -1 })
      .limit(100)
      .toArray();
    res.json({ success: true, data: sugestoes });
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar sugestões.' });
  }
});

/* ── PATCH /api/sugestoes/:id ── admin atualiza status */
app.patch('/api/sugestoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'aprovada' | 'rejeitada'
    const colecao = db.collection('sugestoes');
    await colecao.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar sugestão:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar.' });
  }
});

app.post('/api/sugestoes-teste', async (req, res) => {
  try {
    const b64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const cldRes = await cloudinary.uploader.upload(b64, { folder: 'anuario_sugestoes' });
    res.json({ success: true, url: cldRes.secure_url });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});